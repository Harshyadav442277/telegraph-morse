# VIDEO_SCRIPT.md — the 60-second video

138 spoken words, six beats, one take. Screen recording with your voice over it. No music needed.
Every line matches what is live on 2026-09-05; nothing here names a removed feature, recipes,
the discovery tools, or a user count.

## Before you press record

1. Send the demo question once, off camera, so you know the bot is answering today:
   `Is the SSL certificate for github.com valid?` It has gone to txlens #1 for SSL_VERIFICATION in
   under a second on every recorded run. If today it takes longer, change the line in beat 2 from
   "in about a second" to "in a few seconds". Never say a time you did not just see.
2. Open these tabs in this order so the recording is one left-to-right pass:
   Telegram (web or phone mirror) with @MyMorse_Bot open · the site `/#ledger` · `/proof` · `/keys`.
3. Do **not** open the Telegram "/" command menu on camera until you have republished it; it still
   lists two removed commands.
4. Scroll past the "Recipes" line on the landing page; do not linger on it.
5. Put a small caption in one corner for the whole video: **Testnet. Real answers, fake money.**

## The script

| Time | Say | Show |
|---|---|---|
| 0:00–0:09 | Telegraph is a network of independent APIs that compete on a public leaderboard to answer questions. Until now you needed a crypto wallet and code to ask it anything. | The bot chat, empty message box, cursor blinking. |
| 0:09–0:21 | Morse puts Telegraph inside Telegram. I type a question. Telegraph's router picks the top-ranked miner, Morse pays the one-cent fee, and the answer is back in about a second. | Type `Is the SSL certificate for github.com valid?`, send, the reply arrives. |
| 0:21–0:35 | Every answer carries a receipt: who answered, their rank, how sure they were, what it cost, and the transaction that paid for it. Tap verify and you're reading the network's own record. | Scroll the reply to the receipt lines, tap the verify link, land on `/verify/…` with the green "Morse's payer wallet" line and the BaseScan link. |
| 0:35–0:47 | Every question ever asked through Morse is on a public ledger, and the proof page matches each payment against the blockchain. Our usage is checkable, not claimed. | The site, scroll to the Public ledger with your row at the top, then `/proof` with the four counters. |
| 0:47–0:54 | For developers, it's one line in Claude Code or Cursor. No wallet, no setup. | `/keys`, the `claude mcp add …` line. |
| 0:54–1:00 | Morse. Telegraph in Telegram. t.me/MyMorse_Bot. | Landing page top: the claim and the yellow bot button. Hold two seconds. |

## Where it goes

- Attach it to X draft 1 ("What's left"), the quote of the correction. That post is the one that
  says what Morse is now, and the video is the demonstration of exactly that.
- Pin it under the Aug 26 post if X lets you pin a reply; otherwise pin post 1 itself.
- Add the link to the README's first block and to SUBMISSION.md once it is up. The form has no
  video field; the description already tells a judge where to look.

## What not to say, even if asked in replies

- No user or people count. The ledger's identities are mostly your own testing (GAPS G20).
- No "verification layer", "consensus", "second opinion", "podium". The router's pick is the answer.
- No "re-derived" for the signal hash. It is shown with the node's attestation (GAPS G3).
