import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ApiKeyRow, CallRow, Channel, Ledger, Stats } from "./types.js";

/**
 * Neon Postgres ledger over the HTTP driver: one stateless query per call, which
 * suits serverless. Schema is created on first use; there is nothing to migrate
 * by hand for a five-day project.
 */
const SCHEMA = `
create table if not exists users (
  user_hash text primary key,
  channel text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  calls integer not null default 0
);
create table if not exists calls (
  id text primary key,
  at timestamptz not null,
  channel text not null,
  user_hash text not null,
  kind text not null,
  preview text not null,
  intent text,
  miner_slug text,
  miner_id text,
  miner_rank integer,
  confidence double precision,
  cost_usd double precision,
  duration_ms integer,
  signal_hash text,
  status text not null,
  error text
);
create index if not exists calls_at_idx on calls (at desc);
create index if not exists calls_user_at_idx on calls (user_hash, at);
create table if not exists api_keys (
  key_hash text primary key,
  label text not null,
  daily_cap integer not null,
  issued_at timestamptz not null default now(),
  issuer_hash text not null
);`;

type Row = Record<string, unknown>;

export class PostgresLedger implements Ledger {
  readonly kind = "postgres" as const;
  private readonly sql: NeonQueryFunction<false, false>;
  private ready: Promise<void> | null = null;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  init(): Promise<void> {
    if (!this.ready) {
      this.ready = (async () => {
        for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
          await this.sql.query(stmt);
        }
      })();
    }
    return this.ready;
  }

  private async q(text: string, params: unknown[] = []): Promise<Row[]> {
    await this.init();
    return (await this.sql.query(text, params)) as Row[];
  }

  async recordCall(r: CallRow): Promise<void> {
    await this.q(
      `insert into calls (id, at, channel, user_hash, kind, preview, intent, miner_slug, miner_id,
         miner_rank, confidence, cost_usd, duration_ms, signal_hash, status, error)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (id) do nothing`,
      [r.id, r.at, r.channel, r.userHash, r.kind, r.preview, r.intent, r.minerSlug, r.minerId,
        r.minerRank, r.confidence, r.costUsd, r.durationMs, r.signalHash, r.status, r.error],
    );
    if (r.status === "ok") {
      await this.q(`update users set calls = calls + 1, last_seen = now() where user_hash = $1`, [r.userHash]);
    }
  }

  async touchUser(userHash: string, channel: Channel): Promise<void> {
    await this.q(
      `insert into users (user_hash, channel) values ($1, $2)
       on conflict (user_hash) do update set last_seen = now()`,
      [userHash, channel],
    );
  }

  async userCallsToday(userHash: string): Promise<number> {
    const rows = await this.q(
      `select count(*)::int as n from calls
       where user_hash = $1 and status = 'ok' and at >= date_trunc('day', now() at time zone 'utc')`,
      [userHash],
    );
    return Number(rows[0]?.["n"] ?? 0);
  }

  async callsToday(): Promise<number> {
    const rows = await this.q(
      `select count(*)::int as n from calls
       where status = 'ok' and at >= date_trunc('day', now() at time zone 'utc')`,
    );
    return Number(rows[0]?.["n"] ?? 0);
  }

  async recent(limit: number): Promise<CallRow[]> {
    const rows = await this.q(`select * from calls order by at desc limit $1`, [limit]);
    return rows.map(toCallRow);
  }

  async stats(): Promise<Stats> {
    const [totals, channels, intents, today, users] = await Promise.all([
      this.q(`select count(*)::int as calls,
                     count(*) filter (where status = 'ok')::int as ok_calls,
                     count(distinct intent) filter (where status = 'ok')::int as intents,
                     count(distinct miner_slug) filter (where status = 'ok')::int as miners,
                     coalesce(sum(cost_usd) filter (where status = 'ok'), 0)::float as spent,
                     min(at) filter (where status = 'ok') as first_at,
                     max(at) filter (where status = 'ok') as last_at
              from calls`),
      this.q(`select channel, count(*)::int as n from calls where status = 'ok' group by channel`),
      this.q(`select intent, count(*)::int as n from calls where status = 'ok' and intent is not null
              group by intent order by n desc`),
      this.q(`select count(*)::int as calls, count(distinct user_hash)::int as users from calls
              where status = 'ok' and at >= date_trunc('day', now() at time zone 'utc')`),
      this.q(`select count(*)::int as n from users`),
    ]);
    const t = totals[0] ?? {};
    const byChannel: Record<string, number> = {};
    for (const r of channels) byChannel[String(r["channel"])] = Number(r["n"]);
    return {
      users: Number(users[0]?.["n"] ?? 0),
      calls: Number(t["calls"] ?? 0),
      okCalls: Number(t["ok_calls"] ?? 0),
      intents: Number(t["intents"] ?? 0),
      miners: Number(t["miners"] ?? 0),
      spentUsd: Number(Number(t["spent"] ?? 0).toFixed(4)),
      byChannel,
      byIntent: intents.map((r) => ({ intent: String(r["intent"]), calls: Number(r["n"]) })),
      today: { calls: Number(today[0]?.["calls"] ?? 0), users: Number(today[0]?.["users"] ?? 0) },
      firstCallAt: iso(t["first_at"]),
      lastCallAt: iso(t["last_at"]),
    };
  }

  async insertApiKey(k: ApiKeyRow): Promise<void> {
    await this.q(
      `insert into api_keys (key_hash, label, daily_cap, issued_at, issuer_hash) values ($1,$2,$3,$4,$5)`,
      [k.keyHash, k.label, k.dailyCap, k.issuedAt, k.issuerHash],
    );
  }

  async findApiKey(keyHash: string): Promise<ApiKeyRow | null> {
    const rows = await this.q(`select * from api_keys where key_hash = $1`, [keyHash]);
    const r = rows[0];
    if (!r) return null;
    return {
      keyHash: String(r["key_hash"]),
      label: String(r["label"]),
      dailyCap: Number(r["daily_cap"]),
      issuedAt: iso(r["issued_at"]) ?? new Date().toISOString(),
      issuerHash: String(r["issuer_hash"]),
    };
  }

  async keysIssuedToday(issuerHash: string): Promise<number> {
    const rows = await this.q(
      `select count(*)::int as n from api_keys
       where issuer_hash = $1 and issued_at >= date_trunc('day', now() at time zone 'utc')`,
      [issuerHash],
    );
    return Number(rows[0]?.["n"] ?? 0);
  }
}

function iso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  return null;
}

function toCallRow(r: Row): CallRow {
  const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
  return {
    id: String(r["id"]),
    at: iso(r["at"]) ?? "",
    channel: String(r["channel"]) as Channel,
    userHash: String(r["user_hash"]),
    kind: String(r["kind"]),
    preview: String(r["preview"] ?? ""),
    intent: str(r["intent"]),
    minerSlug: str(r["miner_slug"]),
    minerId: str(r["miner_id"]),
    minerRank: num(r["miner_rank"]),
    confidence: num(r["confidence"]),
    costUsd: num(r["cost_usd"]),
    durationMs: num(r["duration_ms"]),
    signalHash: str(r["signal_hash"]),
    status: String(r["status"]) as CallRow["status"],
    error: str(r["error"]),
  };
}
