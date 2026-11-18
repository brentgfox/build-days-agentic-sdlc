import { readFileSync } from "node:fs";

describe("Docker runtime contract", () => {
  it("uses the locked production build and Node 20 runtime", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      engines: { node: string };
      scripts: Record<string, string>;
    };

    expect(packageJson.engines.node).toBe(">=20.19");
    expect(packageJson.scripts.build).toBe(
      "tsc -p tsconfig.server.json && vite build",
    );
    expect(packageJson.scripts.start).toBe("node dist/server/index.js");
  });

  it("exposes the production port and smoke-check endpoints", () => {
    const server = readFileSync("src/server/index.ts", "utf8");
    const app = readFileSync("src/server/app.ts", "utf8");

    expect(server).toContain('process.env.PORT ?? 3000');
    expect(app).toContain('app.get("/health"');
    expect(app).toContain('app.get("/ready"');
    expect(app).toContain('app.get("/api/products"');
  });
});
