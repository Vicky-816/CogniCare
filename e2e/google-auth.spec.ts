import { expect, test } from "@playwright/test";

for (const route of ["login", "signup"]) {
  test(`Google sign-in shows an actionable error when Supabase is unavailable on ${route}`, async ({ page }) => {
    await page.goto(`/auth/${route}`);
    const button = page.getByRole("button", { name: "Continue with Google" });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByRole("alert").filter({ hasText: "Google sign-in is not configured yet" })).toBeVisible();
    await expect(button).toBeEnabled();
  });
}

test("Google callback failures show a clear message", async ({ page }) => {
  await page.goto("/auth/callback?method=google");
  await expect(page).toHaveURL(/\/auth\/login\?error=google/);
  await expect(page.getByRole("alert").filter({ hasText: "Google sign-in could not be completed" })).toBeVisible();
});
