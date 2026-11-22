import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
async function load(path, moduleRequire = require) {
  const source = await readFile(path, "utf8");
  const output = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("exports", "require", "module", output)(compiledModule.exports, moduleRequire, compiledModule);
  return compiledModule.exports;
}
const memory = await load(resolve("lib/games/memory-match.ts"));
const pattern = await load(resolve("lib/games/pattern-practice.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match" ? memory : require(specifier),
);
const routine = await load(resolve("lib/games/daily-routine.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match"
    ? memory
    : specifier === "@/lib/games/pattern-practice"
      ? pattern
      : require(specifier),
);
const history = await load(resolve("lib/games/session-history.ts"), (specifier) =>
  specifier === "@/lib/games/memory-match" ? memory : require(specifier),
);

test("pattern questions provide a valid answer and score correct and incorrect choices", () => {
  const question = pattern.getPatternQuestion(3, 1);
  assert.ok(question.choices.some((choice) => choice.key === question.correctKey));
  assert.equal(pattern.calculateChoiceScore(3, 1), 290);
  assert.equal(pattern.calculateChoiceScore(0, 20), 0);
});
test("routine questions use familiar tasks and shared adaptive limits", () => {
  const question = routine.getRoutineQuestion(5, 1);
  assert.ok(question.choices.some((choice) => choice.key === question.correctKey));
  assert.deepEqual(
    memory.evaluateDifficulty(
      [
        { accuracy: 100, level: 5 },
        { accuracy: 100, level: 5 },
      ],
      5,
    ),
    { previousLevel: 5, level: 5, action: "keep", gamesAtLevel: 2 },
  );
});
test("both choice activities save in their own shared history", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  };
  const base = {
    completedAt: "2026-10-20T00:00:00.000Z",
    level: 1,
    activityCount: 3,
    roundsCompleted: 3,
    mistakes: 0,
    accuracy: 100,
    durationSeconds: 10,
    responseTimeSeconds: 3,
    score: 300,
  };
  history.saveGameSession("p1", { ...base, id: "pattern", game: "pattern-practice" });
  history.saveGameSession("p1", { ...base, id: "routine", game: "daily-routine" });
  assert.equal(history.loadGameHistory("p1", "pattern-practice")[0].id, "pattern");
  assert.equal(history.loadGameHistory("p1", "daily-routine")[0].id, "routine");
  assert.equal(history.loadGameHistory("p2", "pattern-practice").length, 0);
  delete globalThis.window;
});

function checkBank(name, bank) {
  assert.equal(bank.length, 5, `${name}: five levels`);
  bank.forEach((questions, levelIndex) => {
    assert.ok(
      questions.length >= 3,
      `${name} level ${levelIndex + 1}: at least three questions so a game never repeats one`,
    );
    const prompts = new Set();
    for (const question of questions) {
      const where = `${name} level ${levelIndex + 1}: "${question.prompt}"`;
      assert.equal(question.choices.length, 3, `${where} has three answers`);
      assert.equal(new Set(question.choices.map((choice) => choice.key)).size, 3, `${where} has distinct answer keys`);
      assert.equal(
        new Set(question.choices.map((choice) => choice.label)).size,
        3,
        `${where} has distinct answer labels`,
      );
      assert.equal(
        question.choices.filter((choice) => choice.key === question.correctKey).length,
        1,
        `${where} has exactly one correct answer`,
      );
      assert.ok(
        question.visual.length > 0 && question.visualLabel.length > 0,
        `${where} has a picture and a description for screen readers`,
      );
      prompts.add(`${question.prompt}|${question.visual.join("")}`);
    }
    assert.equal(prompts.size, questions.length, `${name} level ${levelIndex + 1}: no duplicate questions`);
  });
}

test("every pattern and routine question has three answers and exactly one correct one", () => {
  checkBank("pattern", pattern.PATTERN_QUESTIONS);
  checkBank("routine", routine.ROUTINE_QUESTIONS);
  for (const question of pattern.PATTERN_QUESTIONS.flat())
    assert.ok(question.visual.includes("?"), `pattern "${question.visual.join(" ")}" shows the missing item`);
});

test("a game uses three different questions and keeps the right answer available", () => {
  for (const bank of [pattern.PATTERN_QUESTIONS, routine.ROUTINE_QUESTIONS]) {
    for (let level = 1; level <= 5; level += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const set = pattern.pickQuestionSet(bank, level, 3);
        assert.equal(set.length, 3);
        assert.equal(
          new Set(set.map((question) => question.prompt + question.visual.join(""))).size,
          3,
          "the three rounds are all different",
        );
        for (const question of set) assert.ok(question.choices.some((choice) => choice.key === question.correctKey));
      }
    }
  }
});

test("picking questions from a level that does not exist falls back safely", () => {
  assert.equal(pattern.pickQuestionSet(pattern.PATTERN_QUESTIONS, 99, 3).length, 3);
  assert.equal(pattern.pickQuestionSet(pattern.PATTERN_QUESTIONS, -4, 3).length, 3);
});
