import { expect, test } from "@playwright/test";
import { addPerson, expectNoA11yViolations } from "./helpers";

test("weekly totals respect calendar boundaries and history filters by game", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-25T12:00:00Z"));
  const id = await addPerson(page);
  await page.evaluate((profileId) => {
    const dates = ["2026-11-25T10:00:00Z", "2026-11-18T19:00:00Z", "2026-11-18T18:00:00Z"];
    localStorage.setItem(
      `mindplay:p:${profileId}:memory-match:sessions:v1`,
      JSON.stringify(
        dates.map((completedAt, index) => ({
          id: `test-${index}`,
          game: "memory-match",
          completedAt,
          level: 1,
          pairs: 3,
          moves: 3,
          mistakes: 0,
          accuracy: 100,
          attempts: 3,
          durationSeconds: 120,
          score: 300,
        })),
      ),
    );
  }, id);
  await page.goto(`/family/profiles/${id}`);
  const weekly = page.getByRole("region", { name: "Activity over the last 7 days" });
  await expect(weekly.locator("dd")).toHaveText(["2", "2 of 7", "4 min"]);
  await expect(weekly.getByRole("listitem")).toHaveCount(7);
  await expect(weekly).toContainText("1 more completed games than the previous 7 days.");
  const history = page.getByRole("region", { name: "Activity history", exact: true });
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await page.getByLabel("Filter activity history").selectOption("sequence-recall");
  await expect(history).toContainText("No completed games in this view yet.");
  await expect(weekly.locator("dd")).toHaveText(["2", "2 of 7", "4 min"]);
  await page.getByLabel("Filter activity history").selectOption("memory-match");
  await expect(history.getByRole("listitem")).toHaveCount(3);
  await expectNoA11yViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
