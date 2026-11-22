import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
async function loadTypeScriptModule(path, moduleRequire = require) {
  const source = await readFile(path, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", compiled)(compiledModule.exports, moduleRequire, compiledModule);
  return compiledModule.exports;
}

const rulesPath = resolve("lib/games/memory-match.ts");
const rulesModule = await loadTypeScriptModule(rulesPath);
const historyModule = await loadTypeScriptModule(resolve("lib/games/session-history.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match" ? rulesModule : require(specifier),
);

const { calculateAccuracy, calculateScore, createDeck, evaluateDifficulty, formatDuration, shouldStartMismatchTimer } =
  rulesModule;
const { loadGameHistory, saveGameSession } = historyModule;
const sun = { id: "sun-1", symbol: { key: "sun", label: "Sun" } };
const moon = { id: "moon-1", symbol: { key: "moon", label: "Moon" } };

test("a first card stays visible when choosing its pair takes over one second", async () => {
  assert.equal(shouldStartMismatchTimer(undefined, sun), false);

  // This exceeds the UI's 1,000 ms mismatch delay. No mismatch timer is
  // scheduled for a first card, so there is nothing to turn it back over.
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_100));
  assert.equal(shouldStartMismatchTimer(undefined, sun), false);
});

test("only a wrong second card starts the mismatch timer", () => {
  assert.equal(shouldStartMismatchTimer(sun, moon), true);
  assert.equal(shouldStartMismatchTimer(sun, { ...sun, id: "sun-2" }), false);
});

test("a restart creates complete matching pairs and completion metrics", () => {
  const deck = createDeck(4, () => 0.5);
  assert.equal(deck.length, 8);
  assert.deepEqual([...new Set(deck.map((card) => card.symbol.key))].length, 4);
  assert.equal(calculateAccuracy(4, 5), 80);
  assert.equal(calculateScore(4, 1), 390);
  assert.equal(formatDuration(65), "1:05");
});

test("difficulty increases, holds, and decreases from the latest two games at this level", () => {
  const game = (accuracy, level = 2) => ({ accuracy, level });
  assert.deepEqual(evaluateDifficulty([game(100), game(75)], 2), {
    previousLevel: 2,
    level: 3,
    action: "increase",
    gamesAtLevel: 2,
  });
  assert.deepEqual(evaluateDifficulty([game(49), game(0)], 2), {
    previousLevel: 2,
    level: 1,
    action: "decrease",
    gamesAtLevel: 2,
  });
  assert.deepEqual(evaluateDifficulty([game(100), game(49)], 2), {
    previousLevel: 2,
    level: 2,
    action: "keep",
    gamesAtLevel: 2,
  });
});

test("one good game right after moving up does not move the player up again", () => {
  const game = (accuracy, level) => ({ accuracy, level });
  // Two strong games at level 2 earned the move to level 3. One more strong
  // game at level 3 must NOT jump to level 4: two games at level 3 are needed.
  const afterOneGameAtNewLevel = [game(100, 3), game(100, 2), game(90, 2)];
  assert.deepEqual(evaluateDifficulty(afterOneGameAtNewLevel, 3), {
    previousLevel: 3,
    level: 3,
    action: "keep",
    gamesAtLevel: 1,
  });
  // After a second strong game at level 3 it does move up.
  assert.equal(evaluateDifficulty([game(100, 3), ...afterOneGameAtNewLevel], 3).level, 4);
  // The same applies when moving down.
  assert.equal(evaluateDifficulty([game(10, 2), game(0, 3), game(0, 3)], 2).level, 2);
});

test("the level never goes outside 1 to 5", () => {
  const game = (accuracy, level) => ({ accuracy, level });
  assert.equal(evaluateDifficulty([game(100, 5), game(100, 5)], 5).level, 5);
  assert.equal(evaluateDifficulty([game(0, 1), game(0, 1)], 1).level, 1);
});

function fakeStorage() {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      key: (index) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    },
  };
  return values;
}

const sampleSession = (id) => ({
  id,
  game: "memory-match",
  completedAt: "2026-10-20T00:00:00.000Z",
  level: 1,
  pairs: 4,
  moves: 4,
  mistakes: 0,
  accuracy: 100,
  durationSeconds: 30,
  score: 400,
});

test("completed sessions persist newest first in local storage", () => {
  fakeStorage();
  saveGameSession("anna", sampleSession("first"));
  const history = saveGameSession("anna", sampleSession("second"));
  assert.equal(history[0].id, "second");
  assert.equal(loadGameHistory("anna", "memory-match")[0].id, "second");
  delete globalThis.window;
});

test("each person's games are kept separate", () => {
  fakeStorage();
  saveGameSession("anna", sampleSession("a1"));
  saveGameSession("ben", sampleSession("b1"));
  saveGameSession("ben", sampleSession("b2"));
  assert.deepEqual(
    loadGameHistory("anna", "memory-match").map((s) => s.id),
    ["a1"],
  );
  assert.deepEqual(
    loadGameHistory("ben", "memory-match").map((s) => s.id),
    ["b2", "b1"],
  );
  assert.equal(historyModule.loadAllGameHistory("ben").length, 2);
  assert.equal(loadGameHistory("nobody", "memory-match").length, 0);
  delete globalThis.window;
});

test("removing one person clears only their games, and sign-out clears everyone's", () => {
  const values = fakeStorage();
  saveGameSession("anna", sampleSession("a1"));
  saveGameSession("ben", sampleSession("b1"));
  values.set("mindplay:profiles-cache:v1", "keep-me");
  historyModule.clearProfileHistory("anna");
  assert.equal(loadGameHistory("anna", "memory-match").length, 0);
  assert.equal(loadGameHistory("ben", "memory-match").length, 1);
  historyModule.clearAllGameHistory();
  assert.equal(loadGameHistory("ben", "memory-match").length, 0);
  assert.equal(values.get("mindplay:profiles-cache:v1"), "keep-me", "only game history is touched");
  delete globalThis.window;
});

test("merging account history only touches the chosen person", () => {
  fakeStorage();
  saveGameSession("anna", sampleSession("a1"));
  const merged = historyModule.mergeGameHistory("ben", [sampleSession("cloud-b1")], false);
  assert.deepEqual(
    merged.map((s) => s.id),
    ["cloud-b1"],
  );
  assert.deepEqual(
    loadGameHistory("anna", "memory-match").map((s) => s.id),
    ["a1"],
  );
  assert.deepEqual(
    loadGameHistory("ben", "memory-match").map((s) => s.id),
    ["cloud-b1"],
  );
  delete globalThis.window;
});
