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

const time = await load("lib/schedule/time.ts");
const occ = await load("lib/schedule/occurrences.ts");
const types = await load("lib/schedule/types.ts");

const KOLKATA = "Asia/Kolkata";
const LONDON = "Europe/London";
const NEW_YORK = "America/New_York";

function reminder(overrides = {}) {
  return {
    id: "r1",
    profileId: "p1",
    title: "Morning tablets",
    kind: "medicine",
    repeat: { type: "daily" },
    times: ["08:00"],
    photoItemId: null,
    speakText: null,
    graceMinutes: 30,
    needsConfirmation: false,
    active: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function event(overrides = {}) {
  return {
    id: "e1",
    reminderId: "r1",
    profileId: "p1",
    dueAt: "2026-11-14T02:30:00.000Z",
    status: "done",
    actedBy: "patient",
    actedAt: "2026-11-14T02:31:00.000Z",
    snoozeUntil: null,
    confirmedAt: null,
    ...overrides,
  };
}

const at = (iso) => new Date(iso);

// ------------------------------------------------------------------ time

test("local time in the person's zone converts to the right instant", () => {
  assert.equal(time.zonedToUtc("2026-11-14", "08:00", KOLKATA).toISOString(), "2026-11-14T02:30:00.000Z");
  assert.equal(time.zonedToUtc("2026-11-14", "08:00", LONDON).toISOString(), "2026-11-14T08:00:00.000Z");
  assert.equal(time.zonedToUtc("2026-07-14", "08:00", LONDON).toISOString(), "2026-07-14T07:00:00.000Z");
  assert.equal(time.zonedToUtc("2026-11-14", "08:00", NEW_YORK).toISOString(), "2026-11-14T13:00:00.000Z");
  assert.equal(time.zonedToUtc("2026-11-14", "23:59", KOLKATA).toISOString(), "2026-11-14T18:29:00.000Z");
  assert.equal(time.zonedToUtc("2026-11-14", "00:00", KOLKATA).toISOString(), "2026-11-13T18:30:00.000Z");
});

test("clock-change days: a skipped time moves past the jump, a repeated time uses the first one", () => {
  // London clocks go forward at 01:00 on 29 March 2026: 01:30 does not exist.
  assert.equal(time.zonedToUtc("2026-03-29", "01:30", LONDON).toISOString(), "2026-03-29T01:30:00.000Z");
  assert.equal(time.zonedToUtc("2026-03-29", "08:00", LONDON).toISOString(), "2026-03-29T07:00:00.000Z");
  // London clocks go back at 02:00 on 25 October 2026: 01:30 happens twice.
  assert.equal(time.zonedToUtc("2026-10-25", "01:30", LONDON).toISOString(), "2026-10-25T00:30:00.000Z");
  assert.equal(time.zonedToUtc("2026-10-25", "08:00", LONDON).toISOString(), "2026-10-25T08:00:00.000Z");
  // New York clocks go back on 1 November 2026.
  assert.equal(time.zonedToUtc("2026-11-01", "01:30", NEW_YORK).toISOString(), "2026-11-01T05:30:00.000Z");
  assert.equal(time.zonedToUtc("2026-11-01", "08:00", NEW_YORK).toISOString(), "2026-11-01T13:00:00.000Z");
});

test("the day key follows the person's calendar, not UTC", () => {
  assert.equal(time.dayKey(at("2026-11-13T19:00:00Z"), KOLKATA), "2026-11-14");
  assert.equal(time.dayKey(at("2026-11-13T19:00:00Z"), LONDON), "2026-11-13");
  assert.equal(time.dayKey(at("2026-11-14T03:00:00Z"), NEW_YORK), "2026-11-13");
  assert.equal(time.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(time.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(time.weekdayOf("2026-11-14"), 6); // Saturday
});

test("the day and time are said in words", () => {
  assert.equal(time.dayInWords(at("2026-11-14T09:00:00Z"), KOLKATA), "It is Saturday afternoon, 14 November.");
  assert.equal(time.dayInWords(at("2026-11-13T19:00:00Z"), KOLKATA), "It is Saturday night, 14 November.");
  assert.equal(time.dayInWords(at("2026-11-14T14:00:00Z"), NEW_YORK), "It is Saturday morning, 14 November.");
  assert.equal(time.timeInWords("08:00"), "8:00 in the morning");
  assert.equal(time.timeInWords("13:30"), "1:30 in the afternoon");
  assert.equal(time.timeInWords("12:00"), "12:00 noon");
  assert.equal(time.timeInWords("19:15"), "7:15 in the evening");
  assert.equal(time.timeInWords("21:45"), "9:45 at night");
  assert.equal(time.timeInWords("00:30"), "12:30 at night");
});

// ------------------------------------------------------------------ repeat rules

test("repeat rules: daily, chosen weekdays, and one date", () => {
  const daily = reminder();
  const weekdays = reminder({ repeat: { type: "weekdays", days: [1, 3] } }); // Monday, Wednesday
  const once = reminder({ repeat: { type: "once", date: "2026-11-20" } });
  assert.equal(occ.repeatsOn(daily, "2026-11-14"), true);
  assert.equal(occ.repeatsOn(weekdays, "2026-11-16"), true); // Monday
  assert.equal(occ.repeatsOn(weekdays, "2026-11-17"), false); // Tuesday
  assert.equal(occ.repeatsOn(once, "2026-11-20"), true);
  assert.equal(occ.repeatsOn(once, "2026-11-21"), false);
});

test("stopped reminders and times before an edit never appear", () => {
  assert.deepEqual(occ.dueTimesOn(reminder({ active: false }), "2026-11-14", KOLKATA), []);
  // Created at 10:00 Kolkata: today's 08:00 is skipped (not missed), 18:00 still comes.
  const created = reminder({ times: ["08:00", "18:00"], activeFrom: "2026-11-14T04:30:00.000Z" });
  assert.deepEqual(
    occ.dueTimesOn(created, "2026-11-14", KOLKATA).map((item) => item.time),
    ["18:00"],
  );
  assert.deepEqual(
    occ.dueTimesOn(created, "2026-11-15", KOLKATA).map((item) => item.time),
    ["08:00", "18:00"],
  );
});

test("the next occurrence skips days the reminder does not repeat on", () => {
  const weekdays = reminder({ repeat: { type: "weekdays", days: [1] }, times: ["09:00"] });
  // Saturday 14 November, Kolkata → next Monday 16 November 09:00 IST.
  assert.equal(
    occ.nextOccurrence(weekdays, at("2026-11-14T05:00:00Z"), KOLKATA).toISOString(),
    "2026-11-16T03:30:00.000Z",
  );
  const past = reminder({ repeat: { type: "once", date: "2026-11-10" } });
  assert.equal(occ.nextOccurrence(past, at("2026-11-14T05:00:00Z"), KOLKATA), null);
});

// ------------------------------------------------------------------ today plan

test("a reminder is upcoming, then due, then missed after the waiting time", () => {
  const r = [reminder()];
  assert.equal(occ.todayPlan(r, [], at("2026-11-14T02:29:00Z"), KOLKATA).next.status, "upcoming");
  const due = occ.todayPlan(r, [], at("2026-11-14T02:30:00Z"), KOLKATA);
  assert.equal(due.due.status, "due");
  assert.equal(due.due.key, "r1@2026-11-14T02:30:00.000Z");
  const missed = occ.todayPlan(r, [], at("2026-11-14T03:00:00Z"), KOLKATA);
  assert.equal(missed.due, null);
  assert.equal(missed.items[0].status, "missed");
  assert.equal(missed.newlyMissed.length, 1);
  // Once saved as missed, it is no longer "newly" missed.
  const saved = occ.todayPlan(r, [event({ status: "missed", actedBy: null })], at("2026-11-14T03:00:00Z"), KOLKATA);
  assert.equal(saved.newlyMissed.length, 0);
});

test("done stays done, even after the waiting time", () => {
  const plan = occ.todayPlan([reminder()], [event()], at("2026-11-14T05:00:00Z"), KOLKATA);
  assert.equal(plan.items[0].status, "done");
  assert.equal(plan.due, null);
  assert.equal(plan.newlyMissed.length, 0);
});

test("'Later' hides the card for a while and gives the full waiting time again", () => {
  const later = event({ status: "later", actedAt: "2026-11-14T02:31:00Z", snoozeUntil: "2026-11-14T02:41:00.000Z" });
  const r = [reminder()];
  assert.equal(occ.todayPlan(r, [later], at("2026-11-14T02:35:00Z"), KOLKATA).items[0].status, "snoozed");
  assert.equal(occ.todayPlan(r, [later], at("2026-11-14T02:35:00Z"), KOLKATA).due, null);
  assert.equal(occ.todayPlan(r, [later], at("2026-11-14T02:41:00Z"), KOLKATA).due.status, "due");
  // Deadline moves to 02:41 + 30 min = 03:11.
  assert.equal(occ.todayPlan(r, [later], at("2026-11-14T03:05:00Z"), KOLKATA).due.status, "due");
  assert.equal(occ.todayPlan(r, [later], at("2026-11-14T03:11:00Z"), KOLKATA).items[0].status, "missed");
});

test("next and up to three later items, in time order", () => {
  const r = [
    reminder({ id: "a", title: "Tablets", times: ["08:00", "20:00"] }),
    reminder({ id: "b", title: "Lunch", kind: "meal", times: ["13:00"] }),
    reminder({ id: "c", title: "Water", kind: "water", times: ["10:00", "15:00", "17:00"] }),
  ];
  const plan = occ.todayPlan(r, [], at("2026-11-14T03:31:00Z"), KOLKATA); // 09:01 IST
  assert.equal(plan.items.length, 6);
  assert.equal(plan.next.time, "10:00");
  assert.deepEqual(
    plan.later.map((item) => item.time),
    ["13:00", "15:00", "17:00"],
  );
  assert.equal(plan.newlyMissed.length, 1); // 08:00 was not done
});

test("the plan uses the person's day, not the device's", () => {
  // 19:00 UTC on the 13th is already the 14th in Kolkata: the 14th's 08:00 is still upcoming.
  const plan = occ.todayPlan([reminder()], [], at("2026-11-13T19:00:00Z"), KOLKATA);
  assert.equal(plan.day, "2026-11-14");
  assert.equal(plan.next.dueAt, "2026-11-14T02:30:00.000Z");
});

test("missed items from yesterday are found when the tablet was off", () => {
  const missed = occ.missedYesterday([reminder()], [], at("2026-11-14T01:00:00Z"), KOLKATA);
  assert.deepEqual(
    missed.map((item) => item.dueAt),
    ["2026-11-13T02:30:00.000Z"],
  );
});

// ------------------------------------------------------------------ events

test("acting twice on the same occurrence keeps one record", () => {
  const plan = occ.todayPlan([reminder()], [], at("2026-11-14T02:30:00Z"), KOLKATA);
  const first = occ.eventFor(plan.due, "later", "patient", at("2026-11-14T02:31:00Z"), { id: "x" });
  assert.equal(first.snoozeUntil, "2026-11-14T02:41:00.000Z");
  const again = occ.todayPlan([reminder()], [first], at("2026-11-14T02:41:00Z"), KOLKATA);
  const done = occ.eventFor(again.due, "done", "patient", at("2026-11-14T02:42:00Z"));
  assert.equal(done.id, "x");
  assert.equal(done.snoozeUntil, null);
  assert.equal(occ.mergeEvents([first], [done]).length, 1);
});

test("merging device and cloud records: done beats missed beats later; time formats match", () => {
  const missed = event({ status: "missed", actedBy: null, actedAt: "2026-11-14T03:00:00Z" });
  const carerDone = event({
    status: "done",
    actedBy: "carer",
    actedAt: "2026-11-14T02:50:00Z",
    dueAt: "2026-11-14T02:30:00+00:00",
  });
  const merged = occ.mergeEvents([missed], [carerDone]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "done");
  assert.equal(merged[0].dueAt, "2026-11-14T02:30:00.000Z");
  const later = event({ status: "later", actedAt: "2026-11-14T02:59:00Z" });
  assert.equal(occ.mergeEvents([later], [missed])[0].status, "missed");
});

// ------------------------------------------------------------------ input checks

test("the carer's input is tidied and checked", () => {
  const clean = types.cleanReminder({
    title: "  Morning   tablets ",
    kind: "medicine",
    repeat: { type: "weekdays", days: [0, 1, 2, 3, 4, 5, 6] },
    times: ["20:00", "08:00", "08:00"],
    speakText: "   ",
  });
  assert.equal(clean.title, "Morning tablets");
  assert.deepEqual(clean.times, ["08:00", "20:00"]);
  assert.deepEqual(clean.repeat, { type: "daily" });
  assert.equal(clean.speakText, null);
  assert.equal(clean.graceMinutes, 30);
  assert.throws(() => types.cleanReminder({ ...clean, title: " " }), /what the reminder is for/);
  assert.throws(() => types.cleanReminder({ ...clean, times: [] }), /at least one time/);
  assert.throws(() => types.cleanReminder({ ...clean, times: ["25:00"] }), /check the times/);
  assert.throws(() => types.cleanReminder({ ...clean, repeat: { type: "weekdays", days: [] } }), /day of the week/);
  assert.throws(() => types.cleanReminder({ ...clean, repeat: { type: "once", date: "2026-02-30" } }), /date/);
  assert.throws(() => types.cleanReminder({ ...clean, graceMinutes: 1 }), /waiting time/);
});

test("saved repeat rules are read back safely, and described in words", () => {
  assert.deepEqual(types.parseRepeat({ type: "weekdays", days: [1, 9, "x"] }), { type: "weekdays", days: [1] });
  assert.equal(types.parseRepeat({ type: "weekdays", days: [] }), null);
  assert.equal(types.parseRepeat("nonsense"), null);
  assert.equal(types.describeRepeat({ type: "daily" }), "Every day");
  assert.equal(types.describeRepeat({ type: "weekdays", days: [1] }), "Every Monday");
  assert.equal(types.describeRepeat({ type: "weekdays", days: [1, 3, 5] }), "Monday, Wednesday and Friday");
  assert.equal(types.describeRepeat({ type: "once", date: "2026-11-20" }), "Only on 20 November 2026");
});
