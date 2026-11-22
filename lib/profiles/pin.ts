/*
 * The exit PIN. It stops a person who is playing from wandering into the
 * family area by accident. It is a convenience lock, NOT strong security:
 * a four-digit PIN can always be guessed by someone determined, so nothing
 * private depends on it. The PIN is stored only as a salted PBKDF2 hash.
 */

import type { PinRecord } from "@/lib/profiles/types";

export const PIN_LENGTH = 4;
const ITERATIONS = 100_000;
const MODE_KEY = "mindplay:patient-mode";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function makePinRecord(pin: string): Promise<PinRecord> {
  const salt = newSalt();
  return { salt, hash: await hashPin(pin, salt) };
}

export async function checkPin(pin: string, record: PinRecord): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  return (await hashPin(pin, record.salt)) === record.hash;
}

/*
 * "Patient mode" flag. When it is on (and a PIN exists) the family area asks
 * for the PIN before it opens. The flag lives on this device only.
 */
export function isPatientModeOn(): boolean {
  try {
    return window.localStorage.getItem(MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPatientMode(on: boolean) {
  try {
    if (on) window.localStorage.setItem(MODE_KEY, "1");
    else window.localStorage.removeItem(MODE_KEY);
  } catch {
    /* Storage unavailable: the lock simply is not applied. */
  }
}
