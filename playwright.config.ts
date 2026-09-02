import { defineConfig } from "@playwright/test";

/**
 * The judge journey runs against a deployment, not a dev server: what matters is
 * that the live site works. Override the target with MORSE_BASE_URL.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.MORSE_BASE_URL ?? "https://telegraph-morse.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
