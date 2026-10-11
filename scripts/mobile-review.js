async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.screenshot({ path: 'output/playwright/mobile-hands.png' });
  const metrics = await page.evaluate(() => Object.fromEntries(['.players-panel', '.hand-summary', '.matrix', '.matrix-legend', '.bottom-nav'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { top: r.top, bottom: r.bottom, height: r.height }]; })));
  await page.locator('.bottom-nav button').nth(1).click();
  await page.screenshot({ path: 'output/playwright/mobile-rankings.png' });
  await page.locator('.bottom-nav button').nth(2).click();
  await page.getByRole('button', { name: '8 人桌', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/mobile-positions.png' });
  return metrics;
}
