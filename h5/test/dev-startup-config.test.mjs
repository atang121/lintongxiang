import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

test("default dev script uses the lightweight webpack entrypoint", () => {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  assert.equal(packageJson.scripts.dev, "next dev --webpack -H 0.0.0.0");
  assert.equal(packageJson.scripts["dev:lite"], "next dev --webpack");
  assert.equal(packageJson.scripts.build, "next build --webpack");
});

test("next config pins turbopack root to the project directory", () => {
  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  const nextConfigSource = fs.readFileSync(nextConfigPath, "utf8");

  assert.match(nextConfigSource, /turbopack:\s*\{/);
  assert.match(nextConfigSource, /root:\s*__dirname/);
});

test("next config allows the local LAN origin during mobile dev", () => {
  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  const nextConfigSource = fs.readFileSync(nextConfigPath, "utf8");

  assert.match(nextConfigSource, /allowedDevOrigins/);
  assert.match(nextConfigSource, /192\.168\.1\.210/);
});
