import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const typescript = require("typescript");
const source = await readFile(resolve("lib/profiles/pin.ts"), "utf8");
const compiled = typescript.transpileModule(source, {
  compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
}).outputText;
const module_ = { exports: {} };
new Function("exports", "require", "module", compiled)(module_.exports, require, module_);
const pin = module_.exports;

test("a PIN is only valid as exactly four digits", () => {
  assert.equal(pin.PIN_LENGTH, 4);
  for (const good of ["0000", "1234", "9876"]) assert.equal(pin.isValidPin(good), true, good);
  for (const bad of ["", "123", "12345", "12a4", "١٢٣٤", " 123", "12 4"])
    assert.equal(pin.isValidPin(bad), false, JSON.stringify(bad));
});

test("the right PIN opens the lock and a wrong one does not", async () => {
  const record = await pin.makePinRecord("2468");
  assert.equal(await pin.checkPin("2468", record), true);
  assert.equal(await pin.checkPin("2469", record), false);
  assert.equal(await pin.checkPin("246", record), false);
  assert.equal(await pin.checkPin("", record), false);
});

test("the PIN itself is never stored, and each PIN gets its own salt", async () => {
  const first = await pin.makePinRecord("1357");
  const second = await pin.makePinRecord("1357");
  assert.ok(!JSON.stringify(first).includes("1357"));
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.match(first.hash, /^[0-9a-f]{64}$/);
});

test("patient mode can be switched on and off", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => values.get(k) ?? null,
      setItem: (k, v) => values.set(k, v),
      removeItem: (k) => values.delete(k),
    },
  };
  assert.equal(pin.isPatientModeOn(), false);
  pin.setPatientMode(true);
  assert.equal(pin.isPatientModeOn(), true);
  pin.setPatientMode(false);
  assert.equal(pin.isPatientModeOn(), false);
  delete globalThis.window;
});
