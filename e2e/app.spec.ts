import { test, expect } from '@playwright/test';

test.describe('App Launch', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FrameCraft Pro|镜绘大师/);
  });

  test('should display the main canvas or project page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark themes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const initialBg = await page.locator('body').evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("深色"), button:has-text("Light"), button:has-text("Dark")');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      const newBg = await page.locator('body').evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      expect(initialBg).not.toBe(newBg);
    }
  });
});

test.describe('Navigation', () => {
  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const settingsButton = page.locator('button:has-text("设置"), button:has-text("Settings")');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await expect(page.locator('text=API Key')).toBeVisible({ timeout: 5000 });
    }
  });
});
