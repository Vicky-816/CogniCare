import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
const cache = new Map();

// A tiny loader: compiles a TypeScript file and resolves "@/..." imports from the project.
async function load(path) {
  if (cache.has(path)) return cache.get(path);
  const source = await readFile(resolve(path), "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const imports = [...compiled.matchAll(/require\("@\/([^"]+)"\)/g)].map((match) => match[1]);
  const loaded = new Map();
  for (const specifier of imports) loaded.set(`@/${specifier}`, await load(`${specifier}.ts`));
  const module_ = { exports: {} };
  new Function("exports", "require", "module", compiled)(
    module_.exports,
    (id) => (loaded.has(id) ? loaded.get(id) : require(id)),
    module_,
  );
  cache.set(path, module_.exports);
  return module_.exports;
}

const { GENERAL_GAMES, isGameVisible, visibleGames } = await load("lib/games/visible-games.ts");
const { MIN_PERSONAL_ITEMS } = await load("lib/games/memory-match.ts");
const { WHO_MIN_ITEMS } = await load("lib/games/who-is-this.ts");
const { DEFAULT_TIMEZONE, normalizeTimezone } = await load("lib/profiles/types.ts");

test("by default no games show until the family adds photos", () => {
  assert.deepEqual(visibleGames({ showGeneralGames: false, photoCount: 0 }), []);
});

test("the carer's setting shows the four general games", () => {
  assert.deepEqual(visibleGames({ showGeneralGames: true, photoCount: 0 }), [...GENERAL_GAMES]);
});

test("Who is this? shows once there are enough photos, whatever the setting", () => {
  for (const showGeneralGames of [false, true]) {
    assert.equal(isGameVisible("who-is-this", { showGeneralGames, photoCount: WHO_MIN_ITEMS - 1 }), false);
    assert.equal(isGameVisible("who-is-this", { showGeneralGames, photoCount: WHO_MIN_ITEMS }), true);
  }
});

test("Memory Match shows with the family's photos even when general games are off", () => {
  const off = (photoCount) => visibleGames({ showGeneralGames: false, photoCount });
  assert.equal(off(MIN_PERSONAL_ITEMS - 1).includes("memory-match"), false);
  assert.deepEqual(off(MIN_PERSONAL_ITEMS), ["memory-match", "who-is-this"]);
  for (const game of ["sequence-recall", "pattern-practice", "daily-routine"]) {
    assert.equal(off(50).includes(game), false, `${game} stays hidden`);
  }
});

test("time zones fall back to India when missing or unknown", () => {
  assert.equal(DEFAULT_TIMEZONE, "Asia/Kolkata");
  assert.equal(normalizeTimezone("Europe/London"), "Europe/London");
  for (const bad of [undefined, null, "", "Mars/Olympus", 42, "x".repeat(65)]) {
    assert.equal(normalizeTimezone(bad), DEFAULT_TIMEZONE);
  }
});
