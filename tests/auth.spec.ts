import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show sign in page when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to sign in page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await expect(page.locator("h1")).toContainText("Welcome to Code Slate");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("should show home page when visiting root", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Welcome to Code Slate");
    await expect(
      page.getByRole("link", { name: "Sign In to Your Organization" }),
    ).toBeVisible();
  });

  test("should show sign in form with email and password fields", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
  });

  test("should show validation errors for invalid credentials", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    // Try to submit with empty fields
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show validation errors
    await expect(page.getByText("Invalid email")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 6 characters"),
    ).toBeVisible();
  });

  test("should attempt sign in with valid form data", async ({ page }) => {
    await page.goto("/auth/signin");

    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("wrongpassword");

    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show error notification for wrong credentials
    await expect(page.getByText("Sign In Failed")).toBeVisible();
  });

  test("should redirect to dashboard after successful login", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("P@ssw0rd!");

    await page.getByRole("button", { name: "Sign In" }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should show user menu in header when authenticated", async ({
    page,
  }) => {
    // Login first
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("P@ssw0rd!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Check user menu
    await expect(page.getByText("Admin User")).toBeVisible();
    await expect(page.getByText("admin")).toBeVisible();
  });

  test("should sign out successfully", async ({ page }) => {
    // Login first
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("P@ssw0rd!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Click on user menu
    await page.getByText("Admin User").click();

    // Click sign out
    await page.getByRole("menuitem", { name: "Sign Out" }).click();

    // Should redirect to sign in page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });
});
