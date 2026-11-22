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
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", compiled)(compiledModule.exports, moduleRequire, compiledModule);
  return compiledModule.exports;
}

const memoryRules = await loadTypeScriptModule(resolve("lib/games/memory-match.ts"));
const sequenceRules = await loadTypeScriptModule(resolve("lib/games/sequence-recall.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match" ? memoryRules : require(specifier),
);
const history = await loadTypeScriptModule(resolve("lib/games/session-history.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match" ? memoryRules : require(specifier),
);


test("sequences are the requested length and never repeat an item immediately", () => {
  const sequence = sequenceRules.createSequence(6, () => 0.2);
  assert.equal(sequence.length, 6);
  assert.ok(sequence.every((item, index) => index === 0 || item.key !== sequence[index - 1].key));
  assert.equal(sequenceRules.sequenceLengthForRound(2, 3), 6);
});

test("correct and incorrect answers, scoring, and adaptive limits use shared rules", () => {
  const sequence = sequenceRules.createSequence(3, () => 0.2);
  const answer = sequence.map((item) => item.key);
  const wrongAnswer = [...answer];
  wrongAnswer[0] = sequenceRules.SEQUENCE_ITEMS.find((item) => item.key !== answer[0]).key;
  assert.equal(sequenceRules.isCorrectAnswer(sequence, answer), true);
  assert.equal(sequenceRules.isCorrectAnswer(sequence, wrongAnswer), false);
  assert.equal(sequenceRules.calculateSequenceScore(3, 1), 290);
  assert.deepEqual(
    memoryRules.evaluateDifficulty(
      [
        { accuracy: 100, level: 5 },
        { accuracy: 75, level: 5 },
      ],
      5,
    ),
    { previousLevel: 5, level: 5, action: "keep", gamesAtLevel: 2 },
  );
});

test("sequence sessions persist independently from Memory Match", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  };
  const session = {
    id: "sequence",
    game: "sequence-recall",
    completedAt: "2026-10-20T00:00:00.000Z",
    level: 1,
    sequenceLength: 5,
    roundsCompleted: 3,
    mistakes: 0,
    accuracy: 100,
    durationSeconds: 10,
    responseTimeSeconds: 3,
    score: 300,
  };
  history.saveGameSession("p1", session);
  assert.equal(history.loadGameHistory("p1", "sequence-recall")[0].id, "sequence");
  assert.equal(history.loadGameHistory("p1", "memory-match").length, 0);
  delete globalThis.window;
});

