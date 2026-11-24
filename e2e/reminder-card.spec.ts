import { expect, test, type Page } from "@playwright/test";

import { addPerson, enableGeneralGames, expectNoA11yViolations } from "./helpers";

// Saturday 14 November 2026, 07:50 in India (02:20 UTC).
const MORNING = new Date("2026-11-14T02:20:00Z");
const MINUTE = 60_000;

test.use({ timezoneId: "Asia/Kolkata" });

/** A fake speech engine: records what the tablet says, or refuses like a browser that blocks sound. */
async function fakeSpeech(page: Page, { blocked = false } = {}) {
  await page.addInitScript((isBlocked) => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    const synth = {
      speaking: false,
      getVoices: () => [],
      cancel: () => {},
      speak(utterance: SpeechSynthesisUtterance) {
        if (isBlocked) {
          queueMicrotask(() => utterance.onerror?.({ error: "not-allowed" } as SpeechSynthesisErrorEvent));
          return;
        }
        spoken.push(utterance.text);
        queueMicrotask(() => utterance.onend?.({} as SpeechSynthesisEvent));
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    if (isBlocked) {
      // Sound stays suspended until a tap, as on a real tablet that was just switched on.
      class SilentAudio {
        state = "suspended";
        resume() {
          return new Promise(() => {});
        }
      }
      Object.defineProperty(window, "AudioContext", { value: SilentAudio, configurable: true });
    }
  }, blocked);
}

const spokenOn = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

async function setUpMorningTablets(page: Page, name = "Asha", needsCheck = false) {
  const id = await addPerson(page, name);
  await page.goto(`/family/profiles/${id}/schedule`);
  await page.getByLabel("What is it for?").fill("Morning tablets");
  await page.getByLabel("Time 1", { exact: true }).fill("08:00");
  await page.getByLabel("What should the tablet say?").fill("Time for your morning tablets, with water.");
  if (needsCheck) await page.getByLabel("A carer should check it was really done").check();
  await page.getByRole("button", { name: "Add reminder" }).click();
  await expect(page.getByText(/^Morning tablets was added/)).toBeVisible();
  return id;
}

async function openSchedule(page: Page, id: string) {
  await page.goto(`/family/profiles/${id}/schedule`);
  return page.getByTestId("today-item").filter({ hasText: "Morning tablets" });
}

test.describe("reminder card on the tablet", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MORNING });
  });

  test("appears at the right time, is read aloud, and Done is shown to the family", async ({ page }) => {
    await fakeSpeech(page);
    const id = await setUpMorningTablets(page, "Asha", true);
    await page.goto(`/play/${id}`);
    const card = page.getByRole("dialog", { name: "Morning tablets" });
    await expect(card).toHaveCount(0);

    await page.clock.runFor(10 * MINUTE + 20_000);
    await expect(card).toBeVisible();
    await expect(card).toContainText("8:00 in the morning");
    await expect(card).toContainText("Time for your morning tablets, with water.");
    await expect(card.getByRole("button", { name: "Done" })).toBeFocused();
    await page.clock.runFor(2_000);
    await expect.poll(() => spokenOn(page)).toEqual(["Asha. Time for your morning tablets, with water."]);
    await expectNoA11yViolations(page);

    // Escape does not close it by accident.
    await page.keyboard.press("Escape");
    await expect(card).toBeVisible();

    // Untouched for a minute: it is read once more.
    await page.clock.runFor(MINUTE + 2_000);
    await expect.poll(async () => (await spokenOn(page)).length).toBe(2);

    await card.getByRole("button", { name: "Done" }).click();
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId("today-next")).toHaveCount(0);

    const item = await openSchedule(page, id);
    await expect(item).toContainText("Done");
    await expect(item).not.toContainText("marked by you");
    await page.goto(`/family/profiles/${id}`);
    const overview = page.getByRole("region", { name: "Today’s care overview" });
    await expect(overview).toContainText("awaiting your confirmation");
    await overview.getByRole("link", { name: "Open the schedule" }).click();
    await item.getByRole("button", { name: /^Confirm/ }).click();
    await expect(item.getByRole("button")).toHaveCount(0);
    await page.goto(`/family/profiles/${id}`);
    await expect(overview).toContainText("1 of 1 reminders marked done");
    await expect(overview.getByRole("heading", { name: "Needs a check" })).toHaveCount(0);
  });

  test("Later brings the card back after ten minutes", async ({ page }) => {
    await fakeSpeech(page);
    const id = await setUpMorningTablets(page);
    await page.goto(`/play/${id}`);
    const card = page.getByRole("dialog", { name: "Morning tablets" });
    await page.clock.runFor(10 * MINUTE + 20_000);
    await card.getByRole("button", { name: "Later" }).click();
    await expect(card).toHaveCount(0);

    await page.clock.runFor(5 * MINUTE);
    await expect(card).toHaveCount(0);
    await page.clock.runFor(6 * MINUTE);
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Done" }).click();
    await expect(card).toHaveCount(0);
  });

  test("if nobody answers, it quietly becomes missed for the family", async ({ page }) => {
    await fakeSpeech(page);
    const id = await setUpMorningTablets(page);
    await page.goto(`/play/${id}`);
    const card = page.getByRole("dialog", { name: "Morning tablets" });
    await page.clock.runFor(10 * MINUTE + 20_000);
    await expect(card).toBeVisible();

    // The default waiting time is 30 minutes; nothing negative is shown to the person.
    await page.clock.runFor(31 * MINUTE);
    await expect(card).toHaveCount(0);
    await expect(page.getByText(/missed/i)).toHaveCount(0);

    const item = await openSchedule(page, id);
    await expect(item).toContainText("Missed");
    await item.getByRole("button", { name: /Mark done/ }).click();
    await expect(item).toContainText("Done (marked by you)");
  });

  test("appears during a game too", async ({ page }) => {
    await fakeSpeech(page);
    const id = await setUpMorningTablets(page);
    await enableGeneralGames(page, id);
    await page.goto(`/play/${id}/games/sequence-recall`);
    await expect(page.getByRole("heading", { level: 1, name: /Sequence Recall/ })).toBeVisible();
    await page.clock.runFor(10 * MINUTE + 20_000);
    await expect(page.getByRole("dialog", { name: "Morning tablets" })).toBeVisible();
  });

  test("offers Tap to hear when the tablet blocks sound", async ({ page }) => {
    await fakeSpeech(page, { blocked: true });
    const id = await setUpMorningTablets(page);
    await page.goto(`/play/${id}`);
    await page.clock.runFor(10 * MINUTE + 20_000);
    const card = page.getByRole("dialog", { name: "Morning tablets" });
    await expect(card).toBeVisible();
    await page.clock.runFor(2_000);
    await expect(card.getByRole("button", { name: "Tap to hear" })).toBeVisible();
    // The words are always on the screen as well.
    await expect(card).toContainText("Time for your morning tablets, with water.");
  });
});
