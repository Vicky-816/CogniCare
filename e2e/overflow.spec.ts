import { expect, test } from "@playwright/test";

import { addPerson, enableGeneralGames } from "./helpers";
import { PROFILE_PAGES, STATIC_PAGES } from "./pages";

test.use({ viewport: { width: 360, height: 740 } });

test("no page scrolls sideways at 360 px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "one run is enough");
  test.setTimeout(300_000); // visits every screen in one test
  const id = await addPerson(page);
  await enableGeneralGames(page, id);
  const wide: string[] = [];
  for (const path of [...STATIC_PAGES, ...PROFILE_PAGES.map((p) => p.replace(":id", id))]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const tooWide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (tooWide) wide.push(path);
  }
  expect(wide).toEqual([]);
});
