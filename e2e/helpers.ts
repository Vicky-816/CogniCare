import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const LONG_NAME = "Meenakshi Sundaram";

/** Adds a person in the family area (demo mode) and returns their profile id. */
export async function addPerson(page: Page, name = LONG_NAME): Promise<string> {
  await page.goto("/family");
  await page.getByLabel("First name").fill(name);
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page).toHaveURL(/\/family\/profiles\/[^/]+\/life-story$/);
  await page.goto("/family");
  const link = page.getByRole("link", { name: /Progress and settings/ }).last();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const id = href?.split("/").pop();
  if (!id) throw new Error("No profile id found");
  return id;
}

/** Turns on "Show general games" for one person in their settings. */
export async function enableGeneralGames(page: Page, profileId: string) {
  await page.goto(`/family/profiles/${profileId}`);
  await page.getByRole("checkbox", { name: "Show general games" }).check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Saved. It applies the next time they play.")).toBeVisible();
}

/** Fails on any serious or critical WCAG 2.2 AA problem. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  expect(summary, "accessibility problems").toEqual([]);
}
