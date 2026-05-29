import { expect, test } from '@playwright/test';

const homeserverUrl = 'https://e2e-homeserver.test';

test.beforeEach(async ({ page }) => {
  await page.route('**/.well-known/matrix/client', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        'm.homeserver': {
          base_url: homeserverUrl,
        },
      }),
    });
  });

  await page.route('**/.well-known/elevo-messenger/config', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        features: {},
      }),
    });
  });

  await page.route('**/_matrix/client/versions', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        versions: ['v1.1', 'v1.2', 'v1.3'],
        unstable_features: {},
      }),
    });
  });

  await page.route('**/_matrix/client/**/login', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        flows: [{ type: 'm.login.password' }],
      }),
    });
  });

  await page.route('**/_matrix/client/**/register', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        flows: [],
        params: {},
        session: 'e2e-smoke-session',
      }),
    });
  });
});

test('renders the login screen', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login\/[^/]+$/);
  await expect(page.getByText('Elevo Messenger', { exact: true })).toBeVisible();
  await expect(page.getByText('Homeserver', { exact: true })).toBeVisible();
  await expect(page.getByText('Username', { exact: true })).toBeVisible();
  await expect(page.getByText('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});
