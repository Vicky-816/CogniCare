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

const support = await load("lib/profiles/support.ts");
const timer = await load("lib/play/session-timer.ts");
const memory = await load("lib/games/memory-match.ts");
const pattern = await load("lib/games/pattern-practice.ts");
const who = await load("lib/games/who-is-this.ts");
const resize = await load("lib/life-story/resize.ts");
const lifeTypes = await load("lib/life-story/types.ts");

// A repeatable "random" so shuffles are predictable.
function seeded(seed = 7) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

test("support levels cap how hard the games get and how many answers show", () => {
  assert.deepEqual([1, 2, 3].map(support.levelCap), [5, 3, 2]);
  assert.equal(support.capLevel(5, 1), 5);
  assert.equal(support.capLevel(5, 2), 3);
  assert.equal(support.capLevel(4, 3), 2);
  assert.equal(support.capLevel(1, 3), 1, "a lower level is never raised");
  assert.deepEqual([1, 2, 3].map(support.maxChoices), [3, 2, 2]);
  assert.ok(
    support.SESSION_MINUTE_OPTIONS.every((minutes) => minutes >= 3 && minutes <= 30),
    "within the database limits",
  );
});

function fakeStore() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
}

test("the rest reminder counts from the start of a session", () => {
  const store = fakeStore();
  const minute = 60_000;
  assert.equal(timer.isSessionOver("p1", 10, 0, store), false, "no session yet");
  timer.touchSession("p1", 0, store);
  assert.equal(timer.isSessionOver("p1", 10, 9 * minute, store), false);
  timer.touchSession("p1", 9 * minute, store);
  assert.equal(timer.isSessionOver("p1", 10, 10 * minute, store), true, "ten minutes after the start");
  assert.equal(timer.isSessionOver("p2", 10, 10 * minute, store), false, "other people are separate");
});

test("a long gap starts a fresh session, and 'keep playing' restarts the clock", () => {
  const store = fakeStore();
  const minute = 60_000;
  timer.touchSession("p1", 0, store);
  timer.touchSession("p1", 5 * minute, store);
  // 40 minutes of nobody playing: the next visit is a new session.
  timer.touchSession("p1", 45 * minute, store);
  assert.equal(timer.isSessionOver("p1", 10, 46 * minute, store), false);
  assert.equal(timer.isSessionOver("p1", 10, 55 * minute, store), true);
  timer.extendSession("p1", 55 * minute, store);
  assert.equal(timer.isSessionOver("p1", 10, 56 * minute, store), false);
});

test("personal boards only use pair counts that fill the grid", () => {
  assert.equal(memory.personalPairCount(4, 3), 0, "too few photos");
  assert.equal(memory.personalPairCount(12, 3), 0);
  assert.equal(memory.personalPairCount(4, 4), 4);
  assert.equal(memory.personalPairCount(6, 5), 4, "5 photos only fill a 4-pair board neatly");
  assert.equal(memory.personalPairCount(8, 9), 8);
  assert.equal(memory.personalPairCount(12, 24), 12);
  assert.equal(memory.personalPairCount(6, 24), 6, "never more than the level asks for");
});

const people = ["Asha", "Ravi", "Priya", "Meera", "Dev", "Isha"].map((label, index) => ({
  id: `id${index}`,
  label,
  photoUrl: `blob:${index}`,
}));

test("a personal deck has two cards for each chosen photo", () => {
  const same = memory.createPersonalDeck(people, 4, "same", seeded());
  assert.equal(same.length, 8);
  for (const person of same.map((card) => card.symbol.key))
    assert.equal(same.filter((card) => card.symbol.key === person).length, 2);
  assert.ok(same.every((card) => card.personal.face === "photo-and-name"));
  assert.equal(new Set(same.map((card) => card.id)).size, 8, "every card has its own id");
});

test("in name mode each pair is one photo card and one name card", () => {
  const deck = memory.createPersonalDeck(people, 4, "name", seeded());
  for (const key of new Set(deck.map((card) => card.symbol.key))) {
    const faces = deck
      .filter((card) => card.symbol.key === key)
      .map((card) => card.personal.face)
      .sort();
    assert.deepEqual(faces, ["name", "photo"]);
  }
  // The two cards of a pair match each other under the normal matching rule.
  const [a, b] = deck.filter((card) => card.symbol.key === deck[0].symbol.key);
  assert.equal(memory.shouldStartMismatchTimer(a, b), false);
});

test("limitChoices keeps the right answer and never shows more than asked", () => {
  const question = {
    prompt: "?",
    hint: "",
    visual: ["?"],
    visualLabel: "",
    correctKey: "c",
    choices: ["a", "b", "c", "d"].map((key) => ({ key, label: key })),
  };
  for (let seed = 1; seed < 40; seed += 1) {
    const limited = pattern.limitChoices(question, 2, seeded(seed));
    assert.equal(limited.choices.length, 2);
    assert.ok(
      limited.choices.some((choice) => choice.key === "c"),
      "the right answer stays",
    );
  }
  assert.equal(pattern.limitChoices(question, 5, seeded()).choices.length, 4, "nothing is added");
});

const family = [
  { id: "a", kind: "person", label: "Asha", note: "your daughter", photoUrl: "blob:a" },
  { id: "b", kind: "person", label: "Ravi", note: null, photoUrl: "blob:b" },
  { id: "c", kind: "person", label: "Priya", note: "your sister", photoUrl: "blob:c" },
  { id: "d", kind: "place", label: "The old house", note: null, photoUrl: "blob:d" },
  { id: "e", kind: "thing", label: "Grandfather's clock", note: null, photoUrl: "blob:e" },
];

test("'Who is this?' asks for the name that belongs to each photo", () => {
  for (let seed = 1; seed < 30; seed += 1) {
    const questions = who.buildWhoQuestions(family, 3, 3, 1, seeded(seed));
    assert.equal(questions.length, 3);
    assert.equal(new Set(questions.map((q) => q.correctKey)).size, 3, "three different photos");
    for (const question of questions) {
      const item = family.find((entry) => entry.id === question.correctKey);
      assert.equal(question.imageUrl, item.photoUrl);
      assert.ok(question.choices.some((choice) => choice.key === item.id && choice.label === item.label));
      assert.equal(
        new Set(question.choices.map((choice) => choice.label)).size,
        question.choices.length,
        "no repeated names",
      );
      assert.ok(!question.visualLabel.includes(item.label), "the picture description never gives the answer away");
      assert.ok(question.praise.startsWith(item.label));
    }
  }
});

test("the number of answers grows with the level and shrinks with support", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((level) => who.choiceCountForLevel(level, 1)),
    [2, 2, 3, 3, 4],
  );
  assert.deepEqual(
    [1, 3, 5].map((level) => who.choiceCountForLevel(level, 2)),
    [2, 2, 2],
  );
  assert.deepEqual(
    [1, 5].map((level) => who.choiceCountForLevel(level, 3)),
    [2, 2],
  );
  const hard = who.buildWhoQuestions(family, 5, 3, 1, seeded());
  assert.ok(hard.every((question) => question.choices.length === 4));
  const simple = who.buildWhoQuestions(family, 5, 3, 3, seeded());
  assert.ok(simple.every((question) => question.choices.length === 2));
});

test("people are asked 'Who', places 'Where' and things 'What', and people prefer other people as wrong answers", () => {
  const questions = who.buildWhoQuestions(family, 3, 5, 1, seeded(3));
  const byId = Object.fromEntries(questions.map((q) => [q.correctKey, q]));
  assert.equal(byId.a.prompt, "Who is this?");
  assert.equal(byId.d.prompt, "Where is this?");
  assert.equal(byId.e.prompt, "What is this?");
  const wrongNames = byId.a.choices.filter((choice) => choice.key !== "a").map((choice) => choice.key);
  assert.ok(
    wrongNames.every((key) => ["b", "c"].includes(key)),
    "a person's photo is mixed with other people's names first",
  );
});

test("two photos with the same name are never offered as different answers", () => {
  const twins = [...family, { id: "f", kind: "person", label: "asha", note: null, photoUrl: "blob:f" }];
  for (let seed = 1; seed < 40; seed += 1) {
    for (const question of who.buildWhoQuestions(twins, 5, 3, 1, seeded(seed))) {
      assert.equal(new Set(question.choices.map((c) => c.label.toLowerCase())).size, question.choices.length);
    }
  }
});

test("photos are shrunk to fit, never enlarged", () => {
  assert.deepEqual(resize.fitWithin(4000, 3000), { width: 800, height: 600 });
  assert.deepEqual(resize.fitWithin(3000, 4000), { width: 600, height: 800 });
  assert.deepEqual(resize.fitWithin(400, 300), { width: 400, height: 300 });
  assert.deepEqual(resize.fitWithin(0, 100), { width: 1, height: 1 });
  assert.deepEqual(resize.fitWithin(10000, 1), { width: 800, height: 1 });
});

test("names and notes are tidied before saving", () => {
  assert.equal(lifeTypes.cleanLabel("  Asha   Devi \n"), "Asha Devi");
  assert.equal(lifeTypes.cleanLabel("x".repeat(100)).length, lifeTypes.MAX_LABEL_LENGTH);
  assert.equal(lifeTypes.cleanNote("   "), null);
  assert.equal(lifeTypes.cleanNote(null), null);
  assert.equal(lifeTypes.cleanNote(" your   daughter "), "your daughter");
  assert.equal(lifeTypes.cleanNote("y".repeat(200)).length, lifeTypes.MAX_NOTE_LENGTH);
});
