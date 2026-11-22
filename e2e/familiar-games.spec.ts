import { expect, test } from "@playwright/test";

import { addPerson, expectNoA11yViolations } from "./helpers";

test("a caregiver adds photos and starts a personal game", async ({ page }) => {
  const id = await addPerson(page, "Asha");
  await page.getByRole("link", { name: "Add or change photos" }).click();
  await expect(page.getByText(/Add at least 3 photos/)).toBeVisible();

  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png");
  });
  const image = Buffer.from(dataUrl.split(",")[1], "base64");
  for (const name of ["Priya", "Rohan", "Anita", "Maya"]) {
    await page.locator("#photo-file").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: image });
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Add photo", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: `${name} was added.` })).toBeVisible();
  }

  await page.goto(`/play/${id}/activities`);
  await expect(page.getByRole("link", { name: /Who is this/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Memory Match/ }).first()).toBeVisible();
  await page.goto(`/play/${id}/games/who-is-this`);
  await page.getByRole("button", { name: "Show me the name" }).click();
  await expect(page.getByRole("status").filter({ hasText: /This is/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeFocused();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Show me the name" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Show me the name" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();
  expect(
    await page.evaluate((profileId) => localStorage.getItem(`mindplay:p:${profileId}:who-is-this:sessions:v1`), id),
  ).toBeNull();
});
