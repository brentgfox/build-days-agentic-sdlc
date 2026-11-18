import { readFileSync } from "node:fs";
import { parse } from "yaml";

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

  it("builds a non-root production image through a configurable npm registry", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const dockerignore = readFileSync(".dockerignore", "utf8");

    expect(dockerfile.match(/^FROM /gm)).toHaveLength(2);
    expect(dockerfile).toContain(
      "ARG NPM_REGISTRY=https://registry.npmjs.org/",
    );
    expect(dockerfile).toContain("npm config set replace-registry-host npmjs");
    expect(dockerfile).toContain("npm ci --omit=dev");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain('CMD ["node", "dist/server/index.js"]');

    for (const ignoredPath of [
      ".git",
      ".env",
      "dist",
      "node_modules",
      "playwright-report",
      "test-results",
    ]) {
      expect(dockerignore.split(/\r?\n/)).toContain(ignoredPath);
    }
  });

  it("provides Compose and documented local smoke commands", () => {
    const compose = parse(readFileSync("compose.yml", "utf8")) as {
      services: {
        kosko: {
          build: { args: { NPM_REGISTRY: string } };
          environment: { NODE_ENV: string; PORT: string };
          ports: string[];
        };
      };
    };
    const readme = readFileSync("README.md", "utf8");
    const service = compose.services.kosko;

    expect(service.build.args.NPM_REGISTRY).toContain("NPM_REGISTRY");
    expect(service.environment).toEqual({
      NODE_ENV: "production",
      PORT: "3000",
    });
    expect(service.ports).toEqual(["${KOSKO_PORT:-3000}:3000"]);
    expect(readme).toContain("npm config get registry");
    expect(readme).toContain("docker compose up --build --detach");
    expect(readme).toContain("Invoke-RestMethod http://127.0.0.1:3000/health");
  });
});
