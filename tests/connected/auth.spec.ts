import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('login real e isolamento do painel administrativo', async ({ page }) => {
  const credentials: { role: string; email: string; password: string }[] =
    JSON.parse(await readFile('.local/remote-test-credentials.json', 'utf8'));
  for (const role of ['admin', 'customer']) {
    const account = credentials.find((c) => c.role === role)!;
    await page.goto('/login?admin=1');
    await page.getByLabel('E-mail', { exact: true }).fill(account.email);
    await page.getByLabel('Senha', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(role === 'admin' ? /\/admin$/ : /\/conta$/, {
      timeout: 30000,
    });
    if (role === 'admin') {
      await expect(
        page.getByRole('heading', { name: 'Visão geral' }),
      ).toBeVisible();
      await page.goto('/admin/servicos');
      await expect(
        page.getByText('Corte · Ativo', { exact: true }),
      ).toBeVisible();
      await page.goto('/admin/configuracoes');
      await expect(page.getByLabel('Antecedência para reservar (minutos)', { exact: true })).toHaveValue('60');
      await expect(page.getByLabel('Janela de agendamento (dias)', { exact: true })).toHaveValue('30');
      await expect(page.getByLabel('Antecedência para cancelar (minutos)', { exact: true })).toHaveValue('120');
      await expect(page.getByLabel('Antecedência para reagendar (minutos)', { exact: true })).toHaveValue('120');
      await expect(page.getByLabel('Liberar agenda online com as políticas acima')).toBeChecked();
      await page.goto('/admin/clientes');
      await page
        .getByLabel('Buscar cliente pelo nome')
        .fill('cliente-inexistente-validacao');
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(
        page.getByText('Nenhum cliente encontrado para esta busca.'),
      ).toBeVisible();
      await expect(
        page.getByRole('navigation', { name: 'Paginação de clientes' }),
      ).toContainText('Página 1 de 1');
      await page.goto('/admin/clientes?page=999999');
      await expect(page).toHaveURL(/page=1/);
      await page.goto('/admin/agenda?page=999999&day=2026-10-29');
      await expect(page).toHaveURL(/page=1/);
      await expect(page).toHaveURL(/day=2026-10-29/);
      await expect(
        page.getByRole('navigation', { name: 'Paginação de atendimentos' }),
      ).toContainText('Página 1 de 1');
      await page.goto('/admin/relatorios');
      await page
        .getByRole('combobox', { name: 'Serviço', exact: true })
        .selectOption('10000000-0000-4000-8000-000000000001');
      await page
        .getByRole('combobox', { name: 'Profissional', exact: true })
        .selectOption('20000000-0000-4000-8000-000000000001');
      await page.getByRole('button', { name: 'Atualizar relatório' }).click();
      await expect(page).toHaveURL(/service=10000000/);
      await expect(
        page.getByText('Valor dos serviços concluídos', { exact: true }),
      ).toBeVisible();
      await page.goto('/admin/relatorios?from=2026-10-27&to=2026-10-01');
      await expect(
        page.getByRole('alert').filter({ hasText: 'ordem cronológica' }),
      ).toBeVisible();
      await page.goto('/conta');
    } else {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/conta$/);
    }
    await page.getByRole('button', { name: 'Sair da conta' }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});
