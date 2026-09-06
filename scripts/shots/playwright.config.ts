import { defineConfig, devices } from "@playwright/test";
// Screenshots of the real interface for remit-ai.app, driven by the hermetic e2e mocks.
const PORT = 5199;
export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1180, height: 760 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2, colorScheme: "light" } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
