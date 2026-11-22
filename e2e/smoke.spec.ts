import { expect, test } from "@playwright/test";

import { addPerson, LONG_NAME } from "./helpers";

test("CogniCare branding appears in the app and signup", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("CogniCare");
  await expect(page.getByRole("banner").getByRole("link", { name: "CogniCare", exact: true })).toBeVisible();
  await page.goto("/auth/signup");
  await expect(page).toHaveTitle("Create account · CogniCare");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("a carer adds a person and opens patient mode", async ({ page }) => {
  const id = await addPerson(page);
  await page.goto("/play");
  await expect(page.getByText(LONG_NAME).first()).toBeVisible();
  await page.goto(`/play/${id}`);
  // Patient mode greets the person by first name.
  await expect(page.getByRole("heading", { level: 1, name: /Meenakshi/ })).toBeVisible();
});

test("the family area shows an empty state", async ({ page }) => {
  await page.goto("/family");
  await expect(page.getByRole("heading", { name: "Add the first person" })).toBeVisible();
});

test("clicking a link replaces the page instead of hiding the old one", async ({ page }) => {
  await addPerson(page);
  await page.getByRole("link", { name: /Progress and settings/ }).click();
  await expect(page).toHaveURL(/\/family\/profiles\//);
  // Only the new page is in the document (no hidden copy of /family).
  await expect(page.getByRole("heading", { name: "Your family area", includeHidden: true })).toHaveCount(0);
  await expect(page.locator("main")).toHaveCount(1);
});
