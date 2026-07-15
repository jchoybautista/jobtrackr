import { defineConfig } from "@playwright/test";

// Next refuses to run a second dev server from the same directory, so point
// E2E_PORT at an already-running one (e.g. E2E_PORT=3000) to reuse it.
const port = process.env.E2E_PORT ?? "3100";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
