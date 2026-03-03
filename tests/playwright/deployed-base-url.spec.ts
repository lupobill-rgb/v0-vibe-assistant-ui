import { test, expect } from '@playwright/test';

test('home page is reachable via configured baseURL', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\//);
});
