/* Acceptance checks for the published study. No customer data or external requests. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'docs');
const output = path.join(root, 'test-results');
const tabs = ['decision', 'mercado', 'precios', 'beneficios', 'captacion', 'plan', 'numeros', 'web', 'fuentes'];
const results = [];
// Fixed, independently worked examples: the browser's economics module is not imported here.
const golden = {
  arranque: { revenue: 4613.50, billable: 128, nonBillable: 192, monthlyBeforeIRPF: 2570.62, annualRevenue: 50748.50, perPersonBeforeIRPF: 1116.950833, perPersonAfterProvision: 893.560667, requiredRate: 56.303816, requiredUtilization: 70.379770 },
  base: { revenue: 8216, billable: 192, nonBillable: 128, monthlyBeforeIRPF: 5427.12, annualRevenue: 90376, perPersonBeforeIRPF: 2413.68, perPersonAfterProvision: 1930.944, requiredRate: 39.011246, requiredUtilization: 61.596705 },
  solido: { revenue: 10673, billable: 224, nonBillable: 96, monthlyBeforeIRPF: 7300.76, annualRevenue: 117403, perPersonBeforeIRPF: 3263.265, perPersonAfterProvision: 2610.612, requiredRate: 34.335671, requiredUtilization: 57.226118 },
  exigente: { revenue: 13245, billable: 256, nonBillable: 64, monthlyBeforeIRPF: 9199.40, annualRevenue: 145695, perPersonBeforeIRPF: 4124.725, perPersonAfterProvision: 3299.78, requiredRate: 30.724651, requiredUtilization: 54.621603 }
};
const simple = { days: 10, hours: 6, utilization: 50, rate: 40, materials: 0, markup: 0, fixed: 0, reta: 0, contingency: 0, months: 12, taxReserve: 0, incomeGoal: 1200 };
const surfaceDefault = { surfaceRevenue: 1000, revenue: 1000, vat: 210, totalWithVAT: 1210, personHours: 32, costs: 250, contribution: 750, perHour: 23.4375, minimumRevenue: 1050, quotedMinimumRate: 10.5 };
async function test(name, action) {
  const started = Date.now();
  try { await action(); results.push({ name, status: 'PASS', ms: Date.now() - started }); console.log('PASS ' + name); }
  catch (error) { const message = error.stack || String(error); results.push({ name, status: 'FAIL', ms: Date.now() - started, error: message }); console.error('FAIL ' + name + '\n' + message); }
}
async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(geometry.root <= geometry.width + 1 && geometry.body <= geometry.width + 1, label + ': ' + JSON.stringify(geometry));
}
async function showTab(page, id) {
  await page.locator('#tab-' + id).click();
  assert.equal(await page.locator('#' + id).isVisible(), true, id + ' must be visible.');
  assert.equal(await page.locator('#tab-' + id).getAttribute('aria-selected'), 'true');
  assert.equal(new URL(page.url()).hash, '#' + id);
}
function spanishNumber(text) {
  const match = String(text).replace(/[\u00a0\u202f]/g, ' ').match(/[-−]?\d[\d.,]*/);
  assert.ok(match, 'Expected a number in: ' + text);
  return Number(match[0].replace('−', '-').replace(/\./g, '').replace(',', '.'));
}
async function outputValue(page, key) { return spanishNumber(await page.locator('#profit-output [data-profit="' + key + '"]').innerText()); }
async function expectOutputs(page, expected, label) {
  assert.equal(await page.locator('#profit-error').isVisible(), false, label + ': no validation error.');
  assert.equal(await page.locator('#profit-output').isVisible(), true, label + ': results visible.');
  for (const [key, value] of Object.entries(expected)) {
    const locator = page.locator('#profit-output [data-profit="' + key + '"]');
    const text = await locator.innerText();
    const actual = spanishNumber(text);
    // Match the precision actually presented, allowing deliberate whole-euro formatting.
    const decimals = text.match(/,([0-9]+)/);
    const tolerance = decimals ? 0.5 / Math.pow(10, decimals[1].length) + 0.00001 : 0.50001;
    assert.ok(Math.abs(actual - value) <= tolerance, label + ' ' + key + ': expected ' + value + ', got ' + text);
  }
  assert.doesNotMatch(await page.locator('#profit-output').innerText(), /NaN|Infinity|undefined/);
}
async function setProfit(page, values) {
  for (const [key, value] of Object.entries(values)) await page.locator('#profit-' + key).fill(String(value));
}
async function setSurface(page, values) {
  for (const [key, value] of Object.entries(values)) await page.locator('#surface-' + key).fill(String(value));
}
async function expectSurface(page, expected, label) {
  assert.equal(await page.locator('#surface-error').isVisible(), false, label + ': no validation error.');
  assert.equal(await page.locator('#surface-output').isVisible(), true, label + ': results visible.');
  for (const [key, value] of Object.entries(expected)) {
    const text = await page.locator('#surface-output [data-surface="' + key + '"]').innerText();
    const decimals = text.match(/,([0-9]+)/);
    const tolerance = decimals ? 0.5 / Math.pow(10, decimals[1].length) + 0.00001 : 0.50001;
    assert.ok(Math.abs(spanishNumber(text) - value) <= tolerance, label + ' ' + key + ': expected ' + value + ', got ' + text);
  }
  assert.doesNotMatch(await page.locator('#surface-output').innerText(), /NaN|Infinity|undefined/);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    let relative;
    try { relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (_) { res.writeHead(400); res.end(); return; }
    if (relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(publicRoot, '.' + relative);
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('Not found'); return; }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const sessions = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
    async function open({ width = 390, hash = '#decision', storageBlocked = false } = {}) {
      const context = await browser.newContext({ viewport: { width, height: width > 740 ? 1000 : 844 }, deviceScaleFactor: 1, isMobile: width <= 740, hasTouch: width <= 740 });
      context.setDefaultTimeout(10000);
      const external = [], errors = [], httpErrors = [];
      await context.route('**/*', route => {
        const url = route.request().url();
        if (/^https?:/.test(url) && new URL(url).origin !== origin) { external.push(url); return route.abort(); }
        return route.continue();
      });
      if (storageBlocked) await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled for acceptance test', 'SecurityError'); } });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }); });
      const session = { context, page, external, errors, httpErrors }; sessions.push(session);
      await page.goto(origin + '/estudio.html' + hash, { waitUntil: 'networkidle' });
      await page.locator('[role="tab"][aria-selected="true"]').waitFor();
      return session;
    }

    for (const width of [320, 390, 1440]) await test(width + 'px: nine accessible tabs without page overflow', async () => {
      const { page } = await open({ width });
      assert.equal(await page.locator('[role="tablist"]').count(), 1);
      assert.equal(await page.locator('[role="tab"]').count(), tabs.length);
      for (const id of tabs) {
        await showTab(page, id);
        const selected = await page.locator('[role="tab"][aria-selected="true"]').allTextContents(); assert.equal(selected.length, 1);
        assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
        assert.equal(await page.locator('#' + id).getAttribute('aria-labelledby'), 'tab-' + id);
        assert.equal(await page.locator('#tab-' + id).getAttribute('aria-controls'), id);
        assert.equal(await page.locator('#tab-' + id).getAttribute('tabindex'), '0');
        await noOverflow(page, width + ' / ' + id);
      }
      await showTab(page, 'decision');
      if (width !== 320) {
        for (const photo of await page.locator('#decision figure img').all()) { await photo.scrollIntoViewIfNeeded(); await photo.evaluate(image => image.decode()); }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, 'estudio-' + width + '-portada.png'), fullPage: true });
        await page.screenshot({ path: path.join(output, 'estudio-' + width + '-portada-viewport.png'), fullPage: false });
      }
      await showTab(page, 'beneficios'); await page.locator('#beneficios').scrollIntoViewIfNeeded();
      if (width !== 320) await page.screenshot({ path: path.join(output, 'estudio-' + width + '-beneficios.png'), fullPage: true });
      await showTab(page, 'numeros');
      await expectSurface(page, surfaceDefault, width + 'px surface defaults');
      if (width !== 320) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, 'estudio-' + width + '-cotizar-viewport.png'), fullPage: false });
        await page.locator('#surface-output').screenshot({ path: path.join(output, 'estudio-' + width + '-superficie-resultados.png') });
      }
    });

    await test('Direct benefit links, invalid hashes and keyboard navigation', async () => {
      const { page } = await open({ hash: '#beneficios' });
      assert.equal(await page.locator('#beneficios').isVisible(), true);
      await page.locator('#tab-beneficios').focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#tab-captacion').evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator('#captacion').isVisible(), true);
      await page.keyboard.press('End'); assert.equal(new URL(page.url()).hash, '#fuentes');
      await page.keyboard.press('ArrowRight'); assert.equal(new URL(page.url()).hash, '#decision');
      await page.keyboard.press('ArrowLeft'); assert.equal(new URL(page.url()).hash, '#fuentes');
      await page.keyboard.press('Home'); assert.equal(new URL(page.url()).hash, '#decision');
      await page.evaluate(() => { location.hash = '#does-not-exist'; });
      await page.waitForFunction(() => location.hash === '#decision');
      assert.equal(await page.locator('#decision').isVisible(), true);
    });

    await test('Pointer and fragment navigation leave panels unoutlined; keyboard focus remains visible', async () => {
      const { page } = await open({ width: 1440, hash: '#decision' });
      const outline = locator => locator.evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
      assert.equal((await outline(page.locator('#decision'))).style, 'none');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal((await outline(page.locator('#decision'))).style, 'none');
      await page.locator('#decision .hero-copy h2').click();
      assert.equal((await outline(page.locator('#decision'))).style, 'none');
      assert.equal(await page.locator('html').evaluate(node => node.classList.contains('keyboard-navigation')), false);
      await page.locator('#tab-decision').focus();
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#decision').evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator('html').evaluate(node => node.classList.contains('keyboard-navigation')), true);
      const panelRing = await outline(page.locator('#decision'));
      assert.equal(panelRing.style, 'solid'); assert.ok(panelRing.width >= 2);
      await page.locator('#decision .hero-copy h2').click();
      assert.equal((await outline(page.locator('#decision'))).style, 'none');
      assert.equal(await page.locator('html').evaluate(node => node.classList.contains('keyboard-navigation')), false);
      await showTab(page, 'numeros');
      await page.locator('#tab-numeros').focus(); await page.keyboard.press('Tab');
      assert.equal(await page.locator('#numeros').evaluate(node => node === document.activeElement), true);
      await page.locator('#surface-area').focus();
      const inputRing = await outline(page.locator('#surface-area'));
      assert.equal(inputRing.style, 'solid'); assert.ok(inputRing.width >= 2, 'Normal form controls retain a visible keyboard focus ring.');
    });

    await test('Surface quote separates customer VAT, material costs and both owners hours', async () => {
      const { page } = await open({ hash: '#numeros' });
      await expectSurface(page, surfaceDefault, '100 m² default');
      assert.match(await page.locator('#surface-output').innerText(), /No es beneficio neto ni sueldo/);
      assert.match(await page.locator('#surface-verdict').innerText(), /50,00/);
      await setSurface(page, { supplements: 100 });
      await expectSurface(page, { surfaceRevenue: 1000, revenue: 1100, vat: 231, totalWithVAT: 1331, costs: 250, contribution: 850, personHours: 32, minimumRevenue: 1050, quotedMinimumRate: 9.5 }, 'extras are sale, materials remain a cost');
      await setSurface(page, { luisHours: 12, linoHours: 8 });
      await expectSurface(page, { personHours: 20, perHour: 42.5, minimumRevenue: 750, quotedMinimumRate: 6.5 }, 'unequal workloads');
      await setSurface(page, { luisHours: 10, linoHours: 0 });
      await expectSurface(page, { personHours: 10, perHour: 85, minimumRevenue: 500, quotedMinimumRate: 4 }, 'Luis alone');
      await setSurface(page, { luisHours: 0, linoHours: 10 });
      await expectSurface(page, { personHours: 10, perHour: 85 }, 'Lino alone');
      await page.locator('#surface-reset').click();
      await expectSurface(page, surfaceDefault, 'surface reset');
    });

    await test('Surface quote shows losses, zero required area charge and cents rounded upward', async () => {
      const { page } = await open({ hash: '#numeros' });
      await setSurface(page, { rate: 2 });
      await expectSurface(page, { revenue: 200, contribution: -50, perHour: -1.5625 }, 'loss');
      assert.match(await page.locator('#surface-verdict').innerText(), /no cubre ni los costes directos/i);
      await page.locator('#surface-reset').click();
      await setSurface(page, { supplements: 1050 });
      await expectSurface(page, { revenue: 2050, minimumRevenue: 1050, quotedMinimumRate: 0 }, 'extras cover the target');
      await setSurface(page, { area: 3, rate: 1, supplements: 0, materials: 0, otherCosts: 0, luisHours: 1, linoHours: 0, target: 1 });
      await expectSurface(page, { personHours: 1, minimumRevenue: 1, quotedMinimumRate: 0.34 }, 'round up one third of a euro');
    });

    await test('Invalid area quotes hide old results, flag zero owner hours and recover on reset', async () => {
      const { page } = await open({ hash: '#numeros' });
      for (const [key, value] of [['area', '0'], ['rate', ''], ['supplements', '-1'], ['materials', '-1'], ['luisHours', '10001'], ['target', '201']]) {
        await page.locator('#surface-reset').click(); await page.locator('#surface-' + key).fill(value);
        assert.equal(await page.locator('#surface-error').isVisible(), true, key + '=' + value);
        assert.equal(await page.locator('#surface-output').isVisible(), false);
        assert.equal(await page.locator('#surface-' + key).getAttribute('aria-invalid'), 'true');
        assert.doesNotMatch(await page.locator('#numeros').innerText(), /NaN|Infinity|undefined/);
      }
      await page.locator('#surface-reset').click();
      await setSurface(page, { luisHours: 0, linoHours: 0 });
      assert.equal(await page.locator('#surface-output').isVisible(), false);
      assert.equal(await page.locator('#surface-error').isVisible(), true);
      for (const name of ['luisHours', 'linoHours']) assert.equal(await page.locator('#surface-' + name).getAttribute('aria-invalid'), 'true');
      await page.locator('#surface-reset').click(); await expectSurface(page, surfaceDefault, 'invalid surface recovery');
    });

    await test('Area quote saves its last valid inputs without changing monthly or personal drafts', async () => {
      const { page } = await open({ hash: '#beneficios' });
      const ownerDrafts = { 'lyl-briefing-v2-luis': '{"synthetic":"Luis surface test"}', 'lyl-briefing-v2-lino': '{"synthetic":"Lino surface test"}' };
      await page.evaluate(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); }, ownerDrafts);
      await setProfit(page, simple);
      const monthly = await page.evaluate(() => localStorage.getItem('lyl-study-economics-v1'));
      await showTab(page, 'numeros');
      const quote = { area: 50, rate: 20, supplements: 100, materials: 200, otherCosts: 50, luisHours: 12, linoHours: 8, target: 25 };
      await setSurface(page, quote);
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('lyl-study-surface-v1'))), { version: 1, values: quote });
      await page.locator('#surface-area').fill('');
      assert.equal(await page.locator('#surface-output').isVisible(), false);
      await page.reload({ waitUntil: 'networkidle' });
      await expectSurface(page, { revenue: 1100, contribution: 850, personHours: 20, perHour: 42.5, quotedMinimumRate: 13 }, 'restored last valid area quote');
      assert.equal(await page.locator('#surface-area').inputValue(), '50');
      assert.equal(await page.evaluate(() => localStorage.getItem('lyl-study-economics-v1')), monthly);
      for (const [key, value] of Object.entries(ownerDrafts)) assert.equal(await page.evaluate(name => localStorage.getItem(name), key), value);
      await page.locator('#surface-reset').click(); await expectSurface(page, surfaceDefault, 'reset is isolated');
      assert.equal(await page.evaluate(() => localStorage.getItem('lyl-study-economics-v1')), monthly);
      for (const [key, value] of Object.entries(ownerDrafts)) assert.equal(await page.evaluate(name => localStorage.getItem(name), key), value);
      for (const stored of ['{bad json', '{"version":1,"values":{"area":-1}}']) {
        await page.evaluate(value => localStorage.setItem('lyl-study-surface-v1', value), stored);
        await page.reload({ waitUntil: 'networkidle' }); await expectSurface(page, surfaceDefault, 'corrupt area draft recovery');
      }
      await showTab(page, 'beneficios');
      await expectOutputs(page, { revenue: 2400, billable: 60, perPersonAfterProvision: 1200 }, 'monthly example remains unchanged');
    });

    await test('Area quote remains usable when storage is blocked and states its limit', async () => {
      const { page, errors } = await open({ hash: '#numeros', storageBlocked: true });
      await expectSurface(page, surfaceDefault, 'storage blocked defaults');
      assert.match(await page.locator('#surface-storage').innerText(), /no permite guardar.*abierta/i);
      await setSurface(page, { rate: 12 });
      await expectSurface(page, { revenue: 1200, contribution: 950 }, 'storage blocked edit');
      assert.match(await page.locator('#surface-storage').innerText(), /no permite guardar/i);
      await page.reload({ waitUntil: 'networkidle' });
      await expectSurface(page, surfaceDefault, 'blocked storage cannot promise restored draft');
      assert.deepEqual(errors, []);
    });

    await test('Default financial outputs match a fully worked two-person example', async () => {
      const { page } = await open({ hash: '#beneficios' });
      await expectOutputs(page, golden.base, 'default base');
      assert.equal(await page.locator('#profit-rate').inputValue(), '38');
      assert.equal(await page.locator('#profit-utilization').inputValue(), '60');
      assert.equal(await page.locator('#profit-months').inputValue(), '11');
    });

    await test('All four presets recalculate and reset restores the base scenario', async () => {
      const { page } = await open({ hash: '#beneficios' });
      assert.equal(await page.locator('#profit-scenarios [data-scenario]').count(), 4);
      for (const id of ['arranque', 'base', 'solido', 'exigente']) {
        await page.locator('#profit-scenarios [data-scenario="' + id + '"]').click();
        await expectOutputs(page, golden[id], id);
      }
      await page.locator('#profit-reset').click(); await expectOutputs(page, golden.base, 'reset');
    });

    await test('Editing capacity and price counts each worker exactly once and inverts the income goal', async () => {
      const { page } = await open({ hash: '#beneficios' });
      await setProfit(page, simple);
      await expectOutputs(page, { revenue: 2400, billable: 60, nonBillable: 60, monthlyBeforeIRPF: 2400, annualRevenue: 28800, perPersonBeforeIRPF: 1200, perPersonAfterProvision: 1200, requiredRate: 40, requiredUtilization: 50 }, 'simple fixture');
      await setProfit(page, { utilization: 100 });
      await expectOutputs(page, { revenue: 4800, billable: 120, nonBillable: 0, perPersonAfterProvision: 2400, requiredRate: 20, requiredUtilization: 50 }, 'full occupancy');
      await setProfit(page, { rate: 20 });
      await expectOutputs(page, { revenue: 2400, billable: 120, perPersonAfterProvision: 1200, requiredRate: 20, requiredUtilization: 100 }, 'halved rate');
      await setProfit(page, { incomeGoal: 2400 });
      await expectOutputs(page, { requiredRate: 40, requiredUtilization: 200 }, 'goal beyond capacity');
    });

    await test('Inactive month still incurs overhead and both RETA payments', async () => {
      const { page } = await open({ hash: '#beneficios' });
      await setProfit(page, { months: 12 });
      await expectOutputs(page, { revenue: 8216, monthlyBeforeIRPF: 5427.12, annualRevenue: 98592, perPersonBeforeIRPF: 2713.56, perPersonAfterProvision: 2170.848 }, '12 months');
      await setProfit(page, { months: 11 }); await expectOutputs(page, golden.base, '11 months retains 12 months fixed costs');
    });

    await test('Invalid and empty inputs hide financial results without NaN or stale success', async () => {
      const { page } = await open({ hash: '#beneficios' });
      for (const [key, value] of [['rate', '0'], ['rate', ''], ['utilization', '101'], ['months', '0'], ['taxReserve', '-1']]) {
        await page.locator('#profit-reset').click(); await page.locator('#profit-' + key).fill(value);
        assert.equal(await page.locator('#profit-error').isVisible(), true, key + '=' + value);
        assert.equal(await page.locator('#profit-output').isVisible(), false, 'Do not leave valid-looking stale results.');
        assert.doesNotMatch(await page.locator('#beneficios').innerText(), /NaN|Infinity|undefined/);
        assert.equal(await page.locator('#profit-' + key).getAttribute('aria-invalid'), 'true');
      }
      await page.locator('#profit-reset').click(); await expectOutputs(page, golden.base, 'recovery');
    });

    await test('Zero occupancy shows a real loss and no income-tax provision on that loss', async () => {
      const { page } = await open({ hash: '#beneficios' });
      await setProfit(page, { ...simple, utilization: 0, fixed: 100, reta: 50, months: 11, taxReserve: 20 });
      await expectOutputs(page, { revenue: 0, billable: 0, nonBillable: 120, monthlyBeforeIRPF: -200, annualRevenue: 0, perPersonBeforeIRPF: -100, perPersonAfterProvision: -100, requiredUtilization: 72.727273 }, 'no work');
      const rate = await page.locator('#profit-output [data-profit="requiredRate"]').innerText();
      assert.doesNotMatch(rate, /NaN|Infinity/); assert.ok(!/\d/.test(rate), 'No finite price can fund a goal with zero billable hours.');
    });

    await test('Original per-job calculator keeps travel and administration in the team total', async () => {
      const { page } = await open({ hash: '#numeros' });
      await page.locator('#reset-calc').click();
      assert.equal(spanishNumber(await page.locator('#out-hours').innerText()), 6.5);
      assert.equal(spanishNumber(await page.locator('#out-available').innerText()), 105);
      assert.equal(spanishNumber(await page.locator('#out-rate').innerText()), 16.15);
      assert.equal(spanishNumber(await page.locator('#out-min').innerText()), 207.5);
      await page.locator('#people').fill('1');
      assert.equal(spanishNumber(await page.locator('#out-hours').innerText()), 3.5);
      assert.equal(spanishNumber(await page.locator('#out-rate').innerText()), 30);
      await page.locator('#people').fill('3');
      assert.equal((await page.locator('#out-hours').innerText()).trim(), '—');
      await page.locator('#reset-calc').click(); assert.equal(spanishNumber(await page.locator('#out-hours').innerText()), 6.5);
    });

    await test('Local plan persistence survives reload and storage refusal degrades honestly', async () => {
      const normal = await open({ hash: '#plan' });
      const first = normal.page.locator('[data-task]').first(); await first.check();
      await normal.page.reload({ waitUntil: 'networkidle' }); assert.equal(await normal.page.locator('[data-task]').first().isChecked(), true);
      await normal.page.locator('#reset-tasks').click(); assert.equal(await normal.page.locator('[data-task]:checked').count(), 0);
      const blocked = await open({ hash: '#plan', storageBlocked: true });
      await blocked.page.locator('[data-task]').first().check();
      assert.match(await blocked.page.locator('#storage-note').innerText(), /solo|sólo|abierta|no permite|no.*guardar/i);
      await showTab(blocked.page, 'beneficios'); await expectOutputs(blocked.page, golden.base, 'storage blocked');
      assert.match(await blocked.page.locator('#profit-storage').innerText(), /no permite guardar/i);
      assert.deepEqual(blocked.errors, []);
    });

    await test('Economic drafts restore the last valid scenario without touching personal questionnaires', async () => {
      const { page } = await open({ hash: '#beneficios' });
      const ownerDrafts = { 'lyl-briefing-v2-luis': '{"synthetic":"Luis draft"}', 'lyl-briefing-v2-lino': '{"synthetic":"Lino draft"}' };
      await page.evaluate(values => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); }, ownerDrafts);
      await setProfit(page, simple);
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lyl-study-economics-v1')));
      assert.equal(stored.version, 1); assert.deepEqual(stored.values, simple);
      await page.locator('#profit-rate').fill('');
      assert.equal(await page.locator('#profit-output').isVisible(), false);
      await page.reload({ waitUntil: 'networkidle' });
      await expectOutputs(page, { revenue: 2400, billable: 60, perPersonAfterProvision: 1200 }, 'restored valid draft');
      assert.equal(await page.locator('#profit-rate').inputValue(), '40');
      for (const [key, value] of Object.entries(ownerDrafts)) assert.equal(await page.evaluate(name => localStorage.getItem(name), key), value);
      await page.evaluate(() => localStorage.setItem('lyl-study-economics-v1', '{invalid json'));
      await page.reload({ waitUntil: 'networkidle' }); await expectOutputs(page, golden.base, 'corrupt storage recovers to base');
      await page.evaluate(() => localStorage.setItem('lyl-study-economics-v1', JSON.stringify({ version: 1, values: { rate: -1 } })));
      await page.reload({ waitUntil: 'networkidle' }); await expectOutputs(page, golden.base, 'invalid stored model recovers to base');
    });

    await test('Three responsive resource photographs, six local variants and ten licensed icons load', async () => {
      const { page, context } = await open({ width: 1440 });
      const pictures = page.locator('img[src*="assets/study/"]:not([src*="/icons/"])');
      assert.equal(await pictures.count(), 3);
      for (let index = 0; index < await pictures.count(); index++) {
        const picture = pictures.nth(index);
        const panelId = await picture.evaluate(node => node.closest('[role="tabpanel"]')?.id);
        if (panelId) await showTab(page, panelId);
        await picture.scrollIntoViewIfNeeded();
        await picture.evaluate(node => node.decode());
        assert.ok((await picture.getAttribute('alt') || '').length > 12, 'Photographs need descriptive alternatives.');
        assert.match(await picture.getAttribute('srcset'), /640w/);
        assert.ok(await picture.evaluate(node => node.complete && node.naturalWidth > 0));
      }
      const variants = fs.readdirSync(path.join(publicRoot, 'assets/study')).filter(file => file.endsWith('.webp'));
      assert.equal(variants.length, 6);
      const iconNames = fs.readdirSync(path.join(publicRoot, 'assets/study/icons')).filter(file => file.endsWith('.svg'));
      assert.equal(iconNames.length, 10);
      for (const relative of [...variants.map(name => 'assets/study/' + name), ...iconNames.map(name => 'assets/study/icons/' + name), 'assets/study/credits.json', 'assets/study/credits.txt', 'assets/study/icons/LICENSE', 'assets/study/icons/LICENSE-FEATHER']) {
        const response = await context.request.get(origin + '/' + relative); assert.equal(response.status(), 200, relative);
        assert.ok((await response.body()).length > 0, relative + ' must not be empty.');
      }
      const renderedIcons = await page.locator('img[src*="assets/study/icons/"]').count();
      assert.ok(renderedIcons >= 9, 'The interface should actually display its local icons.');
      await showTab(page, 'fuentes');
      assert.equal(await page.locator('figcaption').count(), 0, 'Visible photo credits were removed at the user request.');
      assert.doesNotMatch(await page.locator('body').textContent(), /Unsplash/i, 'The study does not show stock-photo source labels.');
      await showTab(page, 'decision');
      for (const picture of await pictures.all()) assert.equal(await picture.isVisible(), true, 'Removing credit labels must keep every photo visible.');
    });

    await test('Print exposes all sections and restores collapsed details afterwards', async () => {
      const { page } = await open({ width: 1440, hash: '#beneficios' });
      const before = await page.locator('details').evaluateAll(items => items.map(item => item.open));
      await page.emulateMedia({ media: 'print' });
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
      for (const id of tabs) assert.equal(await page.locator('#' + id).isVisible(), true, 'Print must include ' + id);
      assert.equal(await page.locator('details:not([open])').count(), 0);
      assert.equal(await page.locator('[role="tablist"]').isVisible(), false, 'Navigation is not useful on paper.');
      await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
      await page.emulateMedia({ media: 'screen' });
      assert.deepEqual(await page.locator('details').evaluateAll(items => items.map(item => item.open)), before);
      assert.equal(await page.locator('#beneficios').isVisible(), true);
    });

    await test('Every exercised screen has no script errors, broken HTTP resources or external tracking requests', async () => {
      for (const session of sessions) {
        assert.deepEqual(session.errors, [], session.page.url());
        assert.deepEqual(session.httpErrors, [], session.page.url());
        assert.deepEqual(session.external, [], session.page.url());
      }
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'estudio-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log('\n' + results.filter(result => result.status === 'PASS').length + '/' + results.length + ' study checks passed.');
    if (results.some(result => result.status === 'FAIL')) process.exitCode = 1;
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
