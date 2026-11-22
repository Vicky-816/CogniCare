import { expect, test } from "@playwright/test";

import { addPerson, enableGeneralGames, expectNoA11yViolations } from "./helpers";
import { PROFILE_PAGES, STATIC_PAGES } from "./pages";

for (const path of STATIC_PAGES) {
  test(`no accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
    await expectNoA11yViolations(page);
  });
}

for (const template of PROFILE_PAGES) {
  test(`no accessibility problems on ${template}`, async ({ page }) => {
    const id = await addPerson(page);
    // Game pages are only reachable when the games are switched on for this person.
    if (template.includes("/games/")) await enableGeneralGames(page, id);
    await page.goto(template.replace(":id", id));
    await expect(page.locator("main").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectNoA11yViolations(page);
  });
}
