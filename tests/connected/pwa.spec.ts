import { test, expect } from '@playwright/test';

test('PWA: instalação, manifesto e fallback offline sem cache privado', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/instalar');
  await expect(
    page.getByRole('heading', { name: 'Auto-estilo na sua tela inicial' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  const response = await page.request.get('/manifest.webmanifest');
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.shortcuts.map((item: { url: string }) => item.url)).toContain(
    '/agendar',
  );
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole('button', { name: 'Instalar aplicativo', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'continuar usando pelo navegador',
  );
  await context.setOffline(true);
  await expect(page.getByText(/Você está sem conexão/)).toBeVisible();
  await page.goto('/agendar');
  await expect(
    page.getByText('Nenhuma reserva é confirmada offline.'),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const cache = await caches.open('auto-estilo-static-v2');
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cached.sort()).toEqual(
    [
      '/offline.html',
      '/logo.png',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
    ].sort(),
  );
  await context.setOffline(false);
});
