// @ts-check
import { expect, test } from '@playwright/test';

test.describe('operator dashboard smoke', () => {
  test('renders analytics by default, board on tab, stubs agent-run API', async ({ page, request }) => {
    await page.goto('/');

    await expect(page.locator('#analytics-view')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-panel"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#view-title')).toHaveText('Аналитика');

    await page.locator('.nav-tab[data-view="board"]').click();
    await expect(page.locator('[data-testid="kanban-board-panel"]')).toBeVisible();
    await expect(page.locator('#board .task-atom').first()).toBeVisible({ timeout: 15_000 });

    const readyCard = page.locator('#board .task-atom[data-task-id="ready-task"]');
    await expect(readyCard).toBeVisible();
    await readyCard.click();

    const drawer = page.locator('#detail-drawer');
    await expect(drawer).toHaveClass(/is-open/);
    await expect(page.locator('#detail-title')).toContainText('Ready Task');
    await expect(page.locator('#detail-close')).toBeVisible();

    const journalResponse = await request.get('/api/agent-run/journal');
    expect(journalResponse.ok()).toBeTruthy();
    const journal = await journalResponse.json();
    expect(journal.schema).toBe('operator.agent-run.journal.v1');

    const agentRunResponse = await request.post('/api/agent-run', {
      data: {
        taskId: 'ready-task',
        provider: 'local',
        persistBacklog: true,
      },
    });
    expect(agentRunResponse.ok()).toBeTruthy();
    const agentRun = await agentRunResponse.json();
    expect(agentRun.schema).toBe('operator.agent-run.response.v1');
    expect(agentRun.ok).toBe(true);
    expect(agentRun.taskId).toBe('ready-task');

    await page.locator('#detail-close').click();
    await expect(drawer).not.toHaveClass(/is-open/);
  });
});
