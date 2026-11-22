import { expect, test } from "@playwright/test";

import { addPerson, enableGeneralGames, expectNoA11yViolations } from "./helpers";

test("general games stay hidden until the carer switches them on", async ({ page }) => {
  const id = await addPerson(page);

  // Off by default: a calm message, no list of games.
  await page.goto(`/play/${id}`);
  await expect(page.getByText("Time to relax, Meenakshi.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "All games" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Activities" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Sequence Recall/ })).toHaveCount(0);
  await expectNoA11yViolations(page);

  // An old link to a hidden game quietly goes back to the home screen.
  await page.goto(`/play/${id}/games/sequence-recall`);
  await expect(page).toHaveURL(new RegExp(`/play/${id}$`));
  await expect(page.getByText("Time to relax, Meenakshi.")).toBeVisible();

  // The carer turns them on in the family area.
  await enableGeneralGames(page, id);
  await page.goto(`/play/${id}`);
  await expect(page.getByText("Time to relax, Meenakshi.")).toHaveCount(0);
  await page.getByRole("link", { name: "Activities" }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${id}/activities$`));
  await expect(page.getByRole("heading", { name: "All games" })).toBeVisible();
  for (const name of ["Memory Match", "Sequence Recall", "Pattern Practice", "Daily Routine"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
  await expect(page.getByText("Time to relax, Meenakshi.")).toHaveCount(0);
  await expectNoA11yViolations(page);

  // And the game page opens.
  await page.goto(`/play/${id}/games/sequence-recall`);
  await expect(page.getByRole("heading", { level: 1, name: /Sequence Recall/ })).toBeVisible();
});

test("the setting is remembered after a reload", async ({ page }) => {
  const id = await addPerson(page);
  await enableGeneralGames(page, id);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Show general games" })).toBeChecked();
});
