async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (ok, text) => { if (!ok) throw new Error(text); };
  const active = () => page.locator('.page:not([hidden])');
  const tab = async i => page.locator('.bottom-nav button').nth(i).click();
  const closed = async () => page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(new URL('#hands', page.url()).href);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 }); await tab(0); await tab(0);
    check(await page.getByRole('gridcell').count() === 169, 'matrix complete');
    await active().locator('[data-hand="AKs"]').click();
    await page.getByRole('slider').press('Home');
    const equity = await active().locator('.equity-number strong').innerText();
    await page.getByRole('slider').press('End');
    check(await active().locator('.equity-number strong').innerText() !== equity, 'equity updates');
    check(await active().locator('.hand-name strong').innerText() === 'AKs', 'selection retained');
    check(await active().locator('.matrix-cell').evaluateAll(c => new Set(c.map(x => getComputedStyle(x).backgroundColor)).size) === 4, 'four colors');
    await active().locator('.equity-band-keys button').first().click();
    check((await active().locator('.band-explanation').innerText()).includes('18.8%'), 'legend boundary');
    await active().getByRole('button', { name: '收起区间' }).click();
    await page.getByRole('button', { name: '放大矩阵 / Expand matrix' }).click();
    const dialog = page.getByRole('dialog');
    check(await dialog.locator('.matrix-cell').count() === 169, 'expanded complete');
    await dialog.locator('[data-hand="22"]').click();
    check(await dialog.locator('.hand-name strong').innerText() === '22', 'summary updated');
    check(await dialog.evaluate(el => {
      const r = s => el.querySelector(s).getBoundingClientRect();
      return r('.sheet-header').top >= 0 && r('.hand-summary').bottom <= r('.matrix-scroll').top + 1 && r('.matrix-header').top >= r('.matrix-scroll').top - 1 && r('.matrix-row:last-child .matrix-row-label').left >= r('.matrix-scroll').left - 1 && el.scrollTop === 0;
    }), 'fixed expanded header, summary and axes');
    await page.screenshot({ path: `output/playwright/expanded-${width}.png` });
    await page.goBack(); await closed();
    check(await active().locator('.hand-name strong').innerText() === '22', 'back closes matrix');
    await page.goForward(); await dialog.waitFor();
    await page.getByRole('button', { name: '关闭 / Close' }).click(); await closed();
    await page.getByRole('button', { name: '规则与数据说明 / Information' }).click();
    check((await dialog.innerText()).includes('200,000'), 'methodology');
    await page.keyboard.press('Escape'); await closed();
    await tab(1);
    const fullHouse = active().locator('.ranking-item').filter({ has: page.getByRole('heading', { name: '葫芦', exact: true }) });
    if (await fullHouse.locator('button').getAttribute('aria-expanded') !== 'true') await fullHouse.locator('button').click();
    await page.evaluate(() => scrollTo(0, 210));
    const y = await page.evaluate(() => scrollY);
    await tab(2); await tab(1);
    check(await fullHouse.locator('.ranking-detail').isVisible(), 'ranking state retained');
    check(Math.abs(await page.evaluate(() => scrollY) - y) < 2, 'scroll restored');
    await tab(1); check(await page.evaluate(() => scrollY) === 0, 'active tab scrolls top');
    await fullHouse.locator('button').click(); await page.screenshot({ path: `output/playwright/rankings-${width}.png` });
    await tab(2);
    for (let n = 2; n <= 8; n++) {
      await page.getByRole('button', { name: `${n} 人桌`, exact: true }).click();
      check(await active().locator('.seat').count() === n, 'seat count');
      await active().locator('.street-toggle button').first().click();
      check(await active().locator('.seat.first-to-act strong').innerText() === (n === 2 ? 'BTN/SB' : n === 3 ? 'BTN' : 'UTG'), `${n} preflop`);
      await active().locator('.street-toggle button').last().click();
      check(await active().locator('.seat.first-to-act strong').innerText() === (n === 2 ? 'BB' : 'SB'), `${n} postflop`);
      await active().locator('.seat').last().click();
      check(await active().locator('.position-abbr').innerText() === await active().locator('.seat.selected strong').innerText(), 'inline seat updates');
      check(await page.getByRole('dialog').count() === 0, 'no seat modal');
    }
    await tab(0); await tab(2);
    check(await active().locator('.position-abbr').innerText() === 'CO', 'position retained');
    check(await active().locator('.street-toggle button').last().getAttribute('aria-pressed') === 'true', 'street retained');
    await page.goBack(); await page.getByRole('heading', { name: '起手牌', exact: true }).waitFor();
    await page.goForward(); await page.getByRole('heading', { name: '牌桌位置', exact: true }).waitFor();
    await tab(2); await page.screenshot({ path: `output/playwright/positions-${width}.png` });
  }
  for (const size of [{ width: 360, height: 740 }, { width: 390, height: 750 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    for (let i = 0; i < 3; i++) {
      await tab(i); await tab(i);
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
    }
    check(await active().evaluate(el => {
      const detail = el.querySelector('.position-dock').getBoundingClientRect();
      return [...el.querySelectorAll('.seat')].every(seat => seat.getBoundingClientRect().bottom <= detail.top);
    }), 'short-screen position detail never covers a seat');
    await active().locator('.position-more summary').click();
    check(await active().locator('.position-more').getAttribute('open') !== null, 'position explanation expands inline');
    await active().locator('.position-more summary').click();
    await page.screenshot({ path: `output/playwright/positions-${size.width}x${size.height}.png` });
    await tab(0); await page.getByRole('button', { name: '放大矩阵 / Expand matrix' }).click();
    await page.getByRole('dialog').locator('[data-hand="22"]').click();
    check(await page.getByRole('dialog').locator('.matrix-scroll').evaluate(el => el.clientHeight > 80), 'expanded fits landscape');
    await page.screenshot({ path: `output/playwright/expanded-${size.width}x${size.height}.png` });
    await page.keyboard.press('Escape'); await closed();
  }
  await page.setViewportSize({ width: 390, height: 844 }); await tab(0);
  await page.getByRole('button', { name: '6 人桌', exact: true }).click();
  await active().locator('[data-hand="AA"]').click(); await tab(0);
  check(await active().locator('.matrix-legend').evaluate(el => el.getBoundingClientRect().bottom <= document.querySelector('.bottom-nav').getBoundingClientRect().top), 'matrix and legend fit 390×844');
  await page.reload();
  check(await page.getByRole('slider').inputValue() === '6', 'players saved');
  check(await active().locator('.hand-name strong').innerText() === 'AA', 'hand saved');
  await page.screenshot({ path: 'output/playwright/hands-390.png' });
  await page.evaluate(() => localStorage.setItem('pocket.preferences.v1', 'broken-json')); await page.reload();
  check(await page.getByRole('slider').inputValue() === '6', 'storage recovery');
  check(errors.length === 0, errors.join('; '));
  return { passed: true, mobileWidths: [360, 390, 430], shortHeights: [740, 750], landscape: '844×390', errors };
}
