import { expect, test } from "@playwright/test";

import { addPerson, expectNoA11yViolations } from "./helpers";

// Saturday 14 November 2026, 07:50 in India (02:20 UTC).
const MORNING = new Date("2026-11-14T02:20:00Z");

test.use({ timezoneId: "Asia/Kolkata" });

test.describe("daily schedule (family area)", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: MORNING });
  });

  test("a carer adds a reminder, sees it missed calmly, and marks it done", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await page.goto(`/family/profiles/${id}`);
    await page.getByRole("link", { name: "Open the schedule" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Daily schedule for Asha" })).toBeVisible();
    await expect(page.getByText("Nothing is planned for today.")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel("What is it for?").fill("Morning tablets");
    await page.getByLabel("Time 1", { exact: true }).fill("08:00");
    await page.getByLabel("Count as missed after").selectOption("15");
    await page.getByLabel("What should the tablet say?").fill("Time for your morning tablets, with water.");
    await page.getByRole("button", { name: "Add reminder" }).click();
    await expect(page.getByText("Morning tablets was added.", { exact: true })).toBeVisible();

    const item = page.getByTestId("today-item").filter({ hasText: "Morning tablets" });
    await expect(item).toContainText("8:00 in the morning");
    await expect(item).toContainText("Waiting");
    await expect(page.getByText("Every day, 8:00 in the morning")).toBeVisible();
    await expectNoA11yViolations(page);

    // 08:20: past the 15-minute waiting time with nothing recorded.
    await page.clock.runFor(30 * 60_000);
    await expect(item).toContainText("Missed");

    await item.getByRole("button", { name: /Mark done/ }).click();
    await expect(item).toContainText("Done (marked by you)");
    await expect(item.getByRole("button")).toHaveCount(0);

    // It is still there after a reload (saved on the device).
    await page.reload();
    await expect(page.getByTestId("today-item").filter({ hasText: "Morning tablets" })).toContainText("Done");
  });

  test("a reminder can be changed, set for chosen days, and stopped", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await page.goto(`/family/profiles/${id}/schedule`);

    await page.getByLabel("What is it for?").fill("Lunch");
    await page.getByLabel("Type").selectOption("meal");
    await page.getByLabel("Time 1", { exact: true }).fill("13:00");
    await page.getByRole("button", { name: "Add another time" }).click();
    await page.getByLabel("Time 2", { exact: true }).fill("19:30");
    await page.getByRole("button", { name: "Add reminder" }).click();
    await expect(page.getByText("Every day, 1:00 in the afternoon, 7:30 in the evening")).toBeVisible();
    await expect(page.getByTestId("today-item")).toHaveCount(2);

    await page.getByRole("button", { name: "Change" }).click();
    await expect(page.getByRole("heading", { name: "Change “Lunch”" })).toBeVisible();
    await page.getByLabel("On chosen days").check();
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
      await page.getByRole("checkbox", { name: day }).uncheck();
    await page.getByRole("checkbox", { name: "Sunday" }).check();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/^Lunch was changed. The change applies from now on./)).toBeVisible();
    // Only Sundays now, so nothing today (Saturday).
    await expect(page.getByText(/Every Sunday, 1:00 in the afternoon/)).toBeVisible();
    await expect(page.getByTestId("today-item")).toHaveCount(0);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByRole("button", { name: "Yes, stop it" }).click();
    await expect(page.getByText("Lunch was stopped. Its history is kept.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "All reminders (0)" })).toBeVisible();
  });

  test("the form explains problems in plain words", async ({ page }) => {
    const id = await addPerson(page, "Asha");
    await page.goto(`/family/profiles/${id}/schedule`);
    await page.getByLabel("What is it for?").fill("Walk");
    await page.getByLabel("On chosen days").check();
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
      await page.getByRole("checkbox", { name: day }).uncheck();
    await page.getByRole("button", { name: "Add reminder" }).click();
    await expect(page.getByText("Please choose at least one day")).toHaveRole("alert");
    await expect(page.getByRole("alert").filter({ hasText: /\w/ })).toHaveText(
      "Please choose at least one day of the week.",
    );
  });
});
