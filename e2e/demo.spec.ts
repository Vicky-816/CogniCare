import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

test("one-click demo opens photos, a due reminder and caregiver history", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("mindplay:profiles:v1", "[]"));
  await page.getByRole("link", { name: "Try demo", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/cognicare-sample-meera$/);
  await expect(page.getByRole("heading", { name: /Meera/, level: 1 })).toBeVisible();
  await expect(page.getByText("Have a glass of water", { exact: true }).first()).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("link", { name: "Activities", exact: true }).click();
  await page.getByRole("link", { name: /Who is this/ }).click();
  await expect(page.getByRole("heading", { name: /Who is this/ }).first()).toBeVisible();
  await expect(page.locator("img").first()).toBeVisible();
  await page.getByRole("link", { name: "Caregiver progress", exact: true }).click();
  const weekly = page.getByRole("region", { name: "Activity over the last 7 days" });
  await expect(weekly.locator("dd").first()).toHaveText("7");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Exit demo" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => localStorage.getItem("mindplay:profiles:v1"))).toBe("[]");
  expect((await page.context().cookies()).some((cookie) => cookie.name === "cognicare-demo")).toBe(false);
});
