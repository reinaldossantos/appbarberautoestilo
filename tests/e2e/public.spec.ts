import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('busca rápida e filtros do catálogo', async ({ page }, testInfo) => {
  await page.goto('/servicos');
  await page
    .getByRole('searchbox', { name: 'Buscar serviço' })
    .fill('pigmentacao');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Corte + pigmentação' }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'Em breve', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Para agendar', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(5);
  await page.goto('/');
  if (testInfo.project.name === 'mobile') {
    const navigation = page.getByRole('navigation', { name: 'Acesso rápido' });
    await expect(navigation).toBeVisible();
    await navigation
      .getByRole('link', { name: 'Serviços', exact: true })
      .click();
    await expect(page.getByRole('searchbox')).toBeVisible();
    await expect(
      navigation.getByRole('link', { name: 'Serviços', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/');
  await page.screenshot({
    path: `test-results/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test('jornada pública, catálogo e agenda ainda não configurada', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Seu estilo/ })).toBeVisible();
  await page.getByRole('link', { name: 'Conhecer serviços' }).click();
  await expect(
    page.getByRole('heading', { name: 'Corte', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('article')
      .filter({
        has: page.getByRole('heading', { name: 'Corte', exact: true }),
      }),
  ).toContainText('R$ 30,00');
  await page
    .getByRole('link', { name: 'Ver detalhes de Corte + luzes' })
    .click();
  await expect(
    page.getByText(/O agendamento online será liberado/),
  ).toBeVisible();
  await page.goto('/agendar');
  await expect(
    page.getByText(/A agenda online ainda não foi liberada/),
  ).toBeVisible();
  await expect(page.getByLabel('Data do atendimento')).toBeDisabled();
});
test('protege área administrativa e perfil sem sessão', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/conta');
  await expect(page).toHaveURL(/\/login/);
});
test('páginas principais sem violações graves de acessibilidade e sem overflow', async ({
  page,
}) => {
  for (const url of [
    '/',
    '/servicos',
    '/agendar',
    '/login',
    '/sobre',
    '/contato',
  ]) {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations,
      `${url}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
