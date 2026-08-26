import { expect, test } from '@playwright/test';

/**
 * Requires a running apps/api + docker compose stack and a seeded user —
 * see docs/plans/frontend/00-foundation.md Task 7. Set E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD to match a real seeded account.
 */
const email = process.env.E2E_TEST_EMAIL ?? 'owner@example.com';
const password = process.env.E2E_TEST_PASSWORD ?? 'change-this-password';

test('login redirects to the dashboard and renders the active organization', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('combobox', { name: 'Active organization' })).toBeVisible();
});

test('an unauthenticated visit to the dashboard redirects to /login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/login');
});

test('a logged-in user visiting /login is redirected back to the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/');

  await page.goto('/login');

  await expect(page).toHaveURL('/');
});
