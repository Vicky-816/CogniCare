import { expect, test, type Page } from "@playwright/test";

import { addPerson, enableGeneralGames, expectNoA11yViolations } from "./helpers";

// Saturday 14 November 2026, 07:50 in India (02:20 UTC).
const MORNING = new Date("2026-11-14T02:20:00Z");

test.use({ timezoneId: "Asia/Kolkata" });

async function addReminder(page: Page, title: string, time: string) {
  await page.getByLabel("What is it for?").fill(title);
  await page.getByLabel("Time 1", { exact: true }).fill(time);
  await page.getByRole("button", { name: "Add reminder" }).click();
  await expect(page.getByText(new RegExp(`^${title} was added.`))).toBeVisible();
}

test.describe("Today board (tablet home)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MORNING });
  });

  test("says the day in words and is calm when nothing is planned", async ({ page }) => {
    const id = await addPerson(page, "Asha Rao");
    await page.goto(`/play/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: "Good morning, Asha." })).toBeVisible();
    await expect(page.getByText("It is Saturday morning, 14 November.")).toBeVisible();
    await expect(page.getByText("A quiet day, Asha.")).toBeVisible();
    await page.getByText("Who’s visiting today?").click();
    await expect(page.getByText("There are no more visits on today's schedule.")).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("answers a visit question even when another reminder is next", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await page.goto(`/family/profiles/${id}/schedule`);
    await addReminder(page, "Breakfast", "08:00");
    await page.getByRole("combobox", { name: /^Type/ }).selectOption("visit");
    await page.getByLabel("What should the tablet say?").fill("Meera is bringing your photo album.");
    await addReminder(page, "Tea with Meera", "16:00");
    await page.goto(`/play/${id}`);
    await expect(page.getByTestId("today-next")).toContainText("Breakfast");
    await page.getByText("Who’s visiting today?").click();
    const answer = page.locator("details").filter({ hasText: "Who’s visiting today?" });
    await expect(answer).toContainText("Tea with Meera");
    await expect(answer).toContainText("4:00");
    await expect(answer.getByText("Meera is bringing your photo album.")).toBeVisible();
    await expect(answer.getByRole("button", { name: "Read aloud" })).toBeEnabled();
  });

  test("shows what is next and what comes later, with no numbers or scores", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await page.goto(`/family/profiles/${id}/schedule`);
    await addReminder(page, "Morning tablets", "08:00");
    await addReminder(page, "Lunch", "13:00");
    await addReminder(page, "Evening walk", "17:30");

    await page.goto(`/play/${id}`);
    const next = page.getByTestId("today-next");
    await expect(next).toContainText("Next, at 8:00 in the morning");
    await expect(next).toContainText("Morning tablets");
    const later = page.getByRole("region", { name: "Later today" });
    await expect(later.getByRole("listitem")).toHaveCount(2);
    await expect(later).toContainText("1:00 in the afternoon");
    await expect(later).toContainText("Evening walk");
    await expect(page.getByText(/score|%|level/i)).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("activities are one tap away when the family has turned them on", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await enableGeneralGames(page, id);
    await page.goto(`/play/${id}`);
    await page.getByRole("link", { name: "Activities" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Activities" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sequence Recall/ }).first()).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "Back to today" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Good morning, Asha." })).toBeVisible();
  });
});
