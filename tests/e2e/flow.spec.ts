import { test, expect, type Page } from '@playwright/test';

// End-to-end happy path: create teams + tournaments, enter every score,
// verify the resulting overall leaderboard.
//
// Setup:
//   Teams:        Alpha, Bravo
//   Tournaments:  Quiz (points, higher wins), Puzzle (time, lower wins)
//   Scores:       Quiz   -> Alpha 10, Bravo 5   (Alpha 1st)
//                 Puzzle -> Alpha 50s, Bravo 100s (Alpha 1st, faster)
//   Placement (2 teams): 1st = 2 pts, 2nd = 1 pt
//   Overall:      Alpha 2+2 = 4, Bravo 1+1 = 2  -> Alpha wins

async function createTeam(page: Page, name: string) {
  await page.goto('/teams');
  await page.fill('input[name="name"]', name);
  await page.getByRole('button', { name: 'Add team' }).click();
  await expect(page.locator('summary', { hasText: name })).toBeVisible();
}

async function createTournament(page: Page, name: string, type: 'points' | 'time') {
  await page.goto('/tournaments');
  await page.fill('input[name="name"]', name);
  await page.selectOption('select[name="type"]', type);
  await page.getByRole('button', { name: 'Create tournament' }).click();
  // After the redirect the list shows the tournament with an "Enter scores" link.
  await expect(
    page.locator('.card', { hasText: name }).getByRole('link', { name: /Enter scores/i }),
  ).toBeVisible();
}

async function enterScore(page: Page, tournament: string, team: string, value: string) {
  await page.goto('/tournaments');
  await page
    .locator('.card', { hasText: tournament })
    .getByRole('link', { name: /Enter scores/i })
    .click();
  // Score entry lives under /score/<id>.
  await expect(page).toHaveURL(/\/score\/\d+$/);
  await expect(page.getByRole('heading', { name: tournament })).toBeVisible();

  const form = page.locator('form', { hasText: team });
  await form.locator('input[name="raw"]').fill(value);
  const saveBtn = form.locator('button[type="submit"]');
  // saveScore has no redirect; wait for the server action POST to finish.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && r.status() < 400),
    saveBtn.click(),
  ]);
  // Button must clearly confirm completion with the transient "Saved ✓" state.
  await expect(saveBtn).toHaveText(/Saved ✓/, { timeout: 5000 });
}

test('full flow: teams, tournaments, scores, leaderboard', async ({ page }) => {
  await createTeam(page, 'Alpha');
  await createTeam(page, 'Bravo');

  await createTournament(page, 'Quiz', 'points');
  await createTournament(page, 'Puzzle', 'time');

  await enterScore(page, 'Quiz', 'Alpha', '10');
  await enterScore(page, 'Quiz', 'Bravo', '5');
  await enterScore(page, 'Puzzle', 'Alpha', '50');
  await enterScore(page, 'Puzzle', 'Bravo', '100');

  // Per-tournament: Quiz leaderboard should rank Alpha (10) above Bravo (5).
  await page.goto('/tournaments');
  await page
    .locator('.card', { hasText: 'Quiz' })
    .getByRole('link', { name: /Enter scores/i })
    .click();
  const quizRows = page.locator('.rowcard');
  await expect(quizRows.nth(0)).toContainText('Alpha');
  await expect(quizRows.nth(1)).toContainText('Bravo');

  // Public board defaults OFF -> visitors see the disabled message.
  await page.goto('/');
  await expect(page.getByText('Public leaderboard is currently disabled')).toBeVisible();

  // Admin enables it from the tournaments page.
  await page.goto('/tournaments');
  await page.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByRole('button', { name: 'Turn off' })).toBeVisible();

  // Now the overall board is public: Alpha 4 pts (1st), Bravo 2 pts (2nd).
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Standings' })).toBeVisible();
  const overall = page.locator('.rowcard');
  await expect(overall.nth(0)).toContainText('Alpha');
  await expect(overall.nth(0)).toContainText('4');
  await expect(overall.nth(1)).toContainText('Bravo');
  await expect(overall.nth(1)).toContainText('2');
});
