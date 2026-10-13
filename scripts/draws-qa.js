async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const active = () => page.locator('.page-draws:not([hidden])');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(new URL('#draws', page.url()).href);
  await page.reload();
  await page.getByRole('heading', { name: '听牌', exact: true }).waitFor();
  check(await page.locator('.bottom-nav button').count() === 4, 'four navigation items');
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const expected = [['19.1%', '17.0%', '8.5%', '31.9%'], ['35.0%', '31.5%', '16.5%', '54.1%'], ['19.6%', '17.4%', '8.7%', '32.6%']];
    for (let stage = 0; stage < 3; stage++) {
      await active().locator('.draw-stage button').nth(stage).click();
      const rates = await active().locator('.draw-probability').allTextContents();
      check(JSON.stringify(rates) === JSON.stringify(expected[stage]), 'all percentages for selected stage');
      for (const [id, count] of [['flush', 9], ['open-ended', 8], ['gutshot', 4], ['combo', 15]]) {
        const row = active().locator(`[data-draw="${id}"]`);
        await row.locator('.draw-toggle').click();
        check(await row.locator('.draw-detail').isVisible(), 'example expands');
        check(await row.locator('.draw-out-cards .playing-card').count() === count, 'outs illustrated');
        check(await row.locator('.draw-example-board .playing-card').count() === (stage === 2 ? 4 : 3), 'board matches street');
        if (id === 'combo') check(await row.locator('.draw-out-cards .overlap').count() === 2, 'two overlapping outs highlighted');
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
        await row.locator('.draw-toggle').click();
      }
    }
    await active().locator('.draw-stage button').first().click();
    await page.locator('.bottom-nav button').last().click();
    await page.screenshot({ path: `output/playwright/draws-${width}.png` });
    await active().locator('[data-draw="flush"] .draw-toggle').click();
    await page.screenshot({ path: `output/playwright/draws-flush-${width}.png` });
    await active().locator('.draw-stage button').nth(1).click();
    await active().locator('[data-draw="combo"] .draw-toggle').click();
    await active().locator('[data-draw="combo"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/draws-combo-${width}.png` });
    await page.locator('.bottom-nav button').first().click();
    await page.goBack();
    check(await active().locator('[data-draw="combo"] .draw-detail').isVisible(), 'back restores draw example');
    check(await active().locator('.draw-stage button').nth(1).getAttribute('aria-pressed') === 'true', 'stage retained across navigation');
    await active().locator('[data-draw="combo"] .draw-toggle').click();
    await page.getByRole('button', { name: '规则与数据说明 / Information' }).click();
    check((await page.getByRole('dialog').innerText()).includes('Outs'), 'draw-specific information');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await active().locator('[data-draw="combo"] .draw-toggle').click();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'landscape fits');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('heading', { name: '听牌', exact: true }).waitFor();
  await page.locator('.bottom-nav button').last().click();
  await active().locator('.draw-stage button').first().click();
  check(errors.length === 0, errors.join('; '));
  return { passed: true, widths: [360, 390, 430], stages: 3, drawingTypes: 4, errors };
}
