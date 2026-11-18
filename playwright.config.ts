import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const projectServers = [
  { name: "chromium", port: 41731, device: devices["Desktop Chrome"] },
  { name: "firefox", port: 41732, device: devices["Desktop Firefox"] },
  { name: "webkit", port: 41733, device: devices["Desktop Safari"] },
] as const;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: projectServers.map(({ port }) => ({
    command: "npm start",
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      NODE_ENV: "production",
      PORT: String(port),
    },
  })),
  projects: projectServers.map(({ name, port, device }) => ({
    name,
    use: {
      ...device,
      baseURL: `http://127.0.0.1:${port}`,
      ...(name === "chromium" && process.env.PLAYWRIGHT_USE_EDGE
        ? { channel: "msedge" as const }
        : {}),
    },
  })),
});
