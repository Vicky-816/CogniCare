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

// A fake browser storage, enough for the device (demo) store.
function fakeWindow() {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      get length() {
        return values.size;
      },
      key: (index) => [...values.keys()][index] ?? null,
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };
  return values;
}

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const store = await load("lib/schedule/store.ts");
const { eventFor, todayPlan } = await load("lib/schedule/occurrences.ts");

const PERSON = "person-1";
const TABLETS = { title: "Morning tablets", kind: "medicine", repeat: { type: "daily" }, times: ["08:00"] };

test("demo mode keeps the schedule on this device", async () => {
  fakeWindow();
  const schedule = store.getScheduleStore();
  assert.equal(schedule.kind, "local");
  const saved = await schedule.saveReminder(PERSON, TABLETS);
  assert.equal(saved.profileId, PERSON);
  assert.equal(saved.active, true);
  const list = await schedule.listReminders(PERSON);
  assert.equal(list.length, 1);
  assert.equal(list[0].title, "Morning tablets");
  assert.deepEqual(await schedule.listReminders("someone-else"), []);
  delete globalThis.window;
});

test("editing keeps the same reminder and stopping hides it but keeps it", async () => {
  fakeWindow();
  const schedule = store.getScheduleStore();
  const first = await schedule.saveReminder(PERSON, TABLETS);
  const edited = await schedule.saveReminder(PERSON, { ...TABLETS, times: ["09:00"] }, first);
  assert.equal(edited.id, first.id);
  assert.equal(edited.createdAt, first.createdAt);
  let list = await schedule.listReminders(PERSON);
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].times, ["09:00"]);
  await schedule.stopReminder(edited);
  list = await schedule.listReminders(PERSON);
  assert.equal(list.length, 1);
  assert.equal(list[0].active, false);
  delete globalThis.window;
});

test("bad input is refused in plain words", async () => {
  fakeWindow();
  const schedule = store.getScheduleStore();
  await assert.rejects(schedule.saveReminder(PERSON, { ...TABLETS, title: "  " }));
  await assert.rejects(schedule.saveReminder(PERSON, { ...TABLETS, times: [] }));
  assert.deepEqual(await schedule.listReminders(PERSON), []);
  delete globalThis.window;
});

test("an outcome is saved once per moment, and done beats a later missed", async () => {
  fakeWindow();
  const schedule = store.getScheduleStore();
  const reminder = { ...(await schedule.saveReminder(PERSON, TABLETS)), activeFrom: "2000-01-01T00:00:00.000Z" };
  const now = new Date();
  const zone = "UTC";
  const plan = todayPlan([reminder], [], new Date(now.getTime() + 86_400_000), zone);
  const occurrence = plan.items[0];
  await schedule.recordEvent(eventFor(occurrence, "done", "patient", now));
  await schedule.recordEvent(eventFor(occurrence, "missed", null, now));
  const events = await schedule.listEvents(PERSON, new Date(now.getTime() - 86_400_000));
  assert.equal(events.length, 1);
  assert.equal(events[0].status, "done");
  delete globalThis.window;
});

test("removing a person clears their schedule from this device", async () => {
  const values = fakeWindow();
  const schedule = store.getScheduleStore();
  await schedule.saveReminder(PERSON, TABLETS);
  await schedule.saveReminder("person-2", TABLETS);
  store.clearScheduleForProfile(PERSON);
  assert.deepEqual(await schedule.listReminders(PERSON), []);
  assert.equal((await schedule.listReminders("person-2")).length, 1);
  assert.equal(store.hasPendingScheduleUploads(), false);
  assert.ok(values.size >= 1);
  delete globalThis.window;
});
