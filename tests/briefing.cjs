/* Browser acceptance checks. All contact details below are synthetic. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'docs');
const output = path.join(root, 'test-results');
const recipient = '34999999999';
const storageKey = 'lyl-briefing-v1';
const results = [];
const modelContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(publicRoot, 'questionnaire.js'), 'utf8'), modelContext);
const model = JSON.parse(JSON.stringify(modelContext.window.LYL_QUESTIONS));
const fields = model.steps.flatMap(step => step.fields);
const plainAnswers = Object.fromEntries(fields.map(field => {
  let value = field.options ? (field.type === 'checkboxes' ? [field.options[0]] : field.options[0]) : `Respuesta de prueba: ${field.id}`;
  if (field.type === 'email') value = 'prueba@example.test';
  if (field.type === 'tel') value = '34999999998';
  if (field.type === 'url') value = 'https://example.test/';
  if (field.type === 'number') value = '2';
  return [field.id, value];
}));
const xss = '<img src=x onerror="window.__qaXss=true">';
plainAnswers.nombre_publico = 'L&L Prueba ' + xss;
plainAnswers.diferencia_real = 'Somos un negocio de prueba. ' + xss;

function draft(answers = plainAnswers, step = 7) {
  return { app: 'lyl-briefing', version: model.version, savedAt: '2026-10-09T12:00:00.000Z', step, answers };
}
function failMessage(error) { return error && error.stack ? error.stack : String(error); }
async function test(name, action) {
  const started = Date.now();
  try {
    await action();
    results.push({ name, status: 'PASS', ms: Date.now() - started });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, status: 'FAIL', ms: Date.now() - started, error: failMessage(error) });
    console.error('FAIL ' + name + '\n' + failMessage(error));
  }
}
async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({ viewport: window.innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(geometry.root <= geometry.viewport + 1 && geometry.body <= geometry.viewport + 1, label + ': ' + JSON.stringify(geometry));
}
async function fillStep(page, index, values = plainAnswers) {
  for (const field of model.steps[index].fields) {
    const value = values[field.id];
    if (value === undefined) continue;
    if (field.type === 'checkboxes' || field.type === 'radio') {
      for (const option of Array.isArray(value) ? value : [value]) {
        const optionIndex = field.options.indexOf(option);
        await page.locator('#' + field.id + '-' + optionIndex).check();
      }
    } else if (field.type === 'select') await page.locator('#' + field.id).selectOption(value);
    else await page.locator('#' + field.id).fill(String(value));
  }
}
async function downloadText(page, selector, name) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await pending;
  const file = path.join(output, name);
  await download.saveAs(file);
  return fs.readFileSync(file, 'utf8');
}
async function restore(page, data, action = 'confirm') {
  await page.locator('#restore-file').setInputFiles({ name: 'synthetic-copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.locator('#replace-dialog').waitFor({ state: 'visible' });
  await page.locator(action === 'cancel' ? '#cancel-restore' : '#confirm-restore').click();
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let relative;
    try { relative = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400); res.end(); return; }
    if (relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(publicRoot, '.' + relative);
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('Not found'); return; }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const contexts = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
    async function open({ width = 390, hash = '#contacto=' + recipient, stored, init } = {}) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, acceptDownloads: true });
      contexts.push(context);
      const external = [];
      const errors = [];
      await context.route('**/*', route => {
        const url = route.request().url();
        if (/^https?:/.test(url) && new URL(url).origin !== origin) { external.push(url); return route.abort(); }
        return route.continue();
      });
      if (stored !== undefined) await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(stored) });
      if (init) await context.addInitScript(init);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/' + hash, { waitUntil: 'networkidle' });
      await page.locator('#step-title').waitFor();
      return { context, page, external, errors };
    }

    await test('390px: seven steps, review, input validation, autosave and safe text rendering', async () => {
      const { page, external, errors } = await open();
      await noOverflow(page, 'first step 390px');
      await page.screenshot({ path: path.join(output, 'mobile-first.png') });
      await page.locator('#next').click();
      assert.equal(await page.locator('#step-title').innerText(), model.steps[0].title);
      assert.equal(await page.locator('#validation-summary').isVisible(), true);
      assert.ok(await page.locator('[aria-invalid="true"]').count() >= 3);
      await fillStep(page, 0);
      await page.locator('#email_coordinacion').fill('correo-invalido');
      await page.locator('#next').click();
      assert.match(await page.locator('#error-email_coordinacion').innerText(), /correo válido/);
      await page.locator('#email_coordinacion').fill(plainAnswers.email_coordinacion);
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).answers.email_coordinacion === 'prueba@example.test', storageKey);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#nombre_publico').inputValue(), plainAnswers.nombre_publico);
      assert.equal(await page.locator('#email_coordinacion').inputValue(), plainAnswers.email_coordinacion);
      for (let index = 0; index < model.steps.length; index++) {
        assert.equal(await page.locator('#step-title').innerText(), model.steps[index].title);
        await fillStep(page, index);
        await noOverflow(page, 'step ' + (index + 1) + ' 390px');
        await page.locator('#next').click();
      }
      assert.match(await page.locator('#step-title').innerText(), /listas para revisar/);
      assert.equal(await page.locator('.review-section').count(), 7);
      assert.equal(await page.locator('.review-missing').count(), 0);
      assert.ok((await page.locator('#step-content').innerText()).includes(xss));
      assert.equal(await page.locator('#step-content img').count(), 0);
      assert.equal(await page.evaluate(() => Boolean(window.__qaXss)), false);
      await noOverflow(page, 'review 390px');
      await page.locator('#delivery').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'mobile-review.png') });
      await page.reload({ waitUntil: 'networkidle' });
      assert.match(await page.locator('#delivery').innerText(), new RegExp(recipient));
      assert.equal(await page.locator('.review-section').count(), 7);
      assert.equal(external.length, 0, 'No external request should be made during completion.');
      assert.deepEqual(errors, []);
    });

    await test('320px: all seven steps and completed review remain inside viewport', async () => {
      const { page, errors } = await open({ width: 320 });
      for (let index = 0; index < model.steps.length; index++) {
        await fillStep(page, index);
        await noOverflow(page, 'step ' + (index + 1) + ' 320px');
        await page.locator('#next').click();
      }
      await noOverflow(page, 'review 320px');
      await page.locator('#delivery').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'mobile-review-320.png') });
      assert.deepEqual(errors, []);
    });

    await test('Checkbox uncertainty options replace normal choices and vice versa', async () => {
      const { page } = await open({ stored: draft(plainAnswers, 1) });
      const field = fields.find(item => item.id === 'clientes_preferidos');
      const unknown = field.options.findIndex(value => value === 'No lo sé todavía');
      await page.locator('#clientes_preferidos-1').check();
      await page.locator('#clientes_preferidos-' + unknown).check();
      assert.deepEqual(await page.locator('[name="clientes_preferidos"]:checked').evaluateAll(nodes => nodes.map(node => node.value)), ['No lo sé todavía']);
      await page.locator('#clientes_preferidos-0').check();
      assert.deepEqual(await page.locator('[name="clientes_preferidos"]:checked').evaluateAll(nodes => nodes.map(node => node.value)), [field.options[0]]);
    });

    await test('JSON/TXT exports and WhatsApp parts preserve all answers without sending', async () => {
      const longAnswers = { ...plainAnswers };
      for (const field of fields.filter(field => field.type === 'textarea')) longAnswers[field.id] = `${field.id}: ` + 'Reparación ágil 🛠️. '.repeat(50);
      const { page, external, errors } = await open({ stored: draft(longAnswers) });
      const jsonText = await downloadText(page, '#backup', 'synthetic-backup.json');
      const backup = JSON.parse(jsonText);
      assert.equal(backup.app, 'lyl-briefing');
      assert.equal(backup.version, model.version);
      assert.equal(Object.keys(backup.answers).length, fields.length);
      assert.ok(!jsonText.includes(recipient), 'Recipient must not be saved in the exported draft.');
      const fullText = await downloadText(page, '#download-text', 'synthetic-answers.txt');
      const hrefs = await page.locator('.delivery-actions a').evaluateAll(nodes => nodes.map(node => node.href));
      assert.ok(hrefs.length > 1, 'Long answers should be split into multiple links.');
      const parts = hrefs.map((href, index) => {
        const url = new URL(href);
        assert.equal(url.origin, 'https://wa.me');
        assert.equal(url.pathname, '/' + recipient);
        assert.ok(href.length < 5100, 'Each link should keep a bounded size.');
        const message = url.searchParams.get('text');
        assert.ok(message.startsWith(`L&L · Parte ${index + 1} de ${hrefs.length}\n`));
        return message.replace(/^L&L · Parte \d+ de \d+\n/, '');
      });
      assert.equal(parts.join(''), fullText, 'Concatenated WhatsApp bodies must match the complete TXT exactly.');
      for (const value of Object.values(backup.answers)) {
        const expected = Array.isArray(value) ? value.join('; ') : value.trim();
        assert.ok(fullText.includes(expected), 'TXT is missing an entered answer.');
      }
      await page.evaluate(() => {
        window.__qaOpened = [];
        document.addEventListener('click', event => {
          const anchor = event.target.closest('a');
          if (anchor && anchor.href.startsWith('https://wa.me/')) { window.__qaOpened.push(anchor.href); event.preventDefault(); }
        }, true);
      });
      await page.locator('.delivery-actions a').first().click();
      assert.equal(await page.evaluate(() => window.__qaOpened.length), 1);
      assert.match(await page.locator('#delivery-status').innerText(), /abierta.*Pulsad «Enviar»/);
      assert.doesNotMatch(await page.locator('#delivery-status').innerText(), /respuestas enviadas|enviado correctamente|recibido correctamente/i);
      assert.equal(external.length, 0, 'WhatsApp requests must be intercepted, never sent.');
      assert.deepEqual(errors, []);
    });

    await test('Required omissions block WhatsApp and final exports', async () => {
      const { page } = await open({ stored: draft({ nombre_publico: 'Incompleto' }) });
      await page.evaluate(() => document.addEventListener('click', event => { if (event.target.closest('a[href^="https://wa.me/"]')) event.preventDefault(); }, true));
      await page.locator('.delivery-actions a').first().click();
      assert.equal(await page.locator('#validation-summary').isVisible(), true);
      assert.equal(await page.locator('[data-opened="true"]').count(), 0);
      assert.equal(await page.locator('#delivery-status').innerText(), '');
      await page.locator('#download-text').click();
      assert.equal(await page.locator('#validation-summary').isVisible(), true);
    });

    await test('A clean link has no recipient; malformed recipient falls back safely', async () => {
      for (const hash of ['', '#contacto=incorrecto']) {
        const { page, external } = await open({ hash, stored: draft() });
        assert.match(await page.locator('#delivery').innerText(), /no lleva un destinatario/);
        const href = await page.locator('.delivery-actions a').first().getAttribute('href');
        assert.equal(new URL(href).pathname, '/');
        if (hash) assert.match(await page.locator('#feedback').innerText(), /WhatsApp válido/);
        assert.equal(external.length, 0);
      }
    });

    await test('The study opens separately and the questionnaire keeps recipient on reload', async () => {
      const { page, external } = await open({ stored: draft() });
      const popupPromise = page.waitForEvent('popup');
      await page.locator('.study-link').click();
      const popup = await popupPromise;
      await popup.waitForLoadState('networkidle');
      assert.equal(new URL(popup.url()).pathname, '/estudio.html');
      assert.equal(new URL(page.url()).hash, '#contacto=' + recipient);
      await popup.close();
      await page.reload({ waitUntil: 'networkidle' });
      assert.match(await page.locator('#delivery').innerText(), new RegExp(recipient));
      assert.equal(external.length, 0, 'Study must not load third-party resources spontaneously.');
    });

    await test('Accessible skip link preserves recipient after reload', async () => {
      const { page } = await open();
      await page.locator('.skip').focus();
      await page.keyboard.press('Enter');
      await page.reload({ waitUntil: 'networkidle' });
      await restore(page, draft());
      assert.match(await page.locator('#delivery').innerText(), new RegExp(recipient), 'Skip link must not discard the private delivery destination.');
    });

    await test('Clear requires confirmation; cancel preserves answers and confirmed clear survives reload', async () => {
      const { page } = await open();
      await page.locator('#nombre_publico').fill('Borrador que debe conservarse');
      await page.waitForFunction(key => !!localStorage.getItem(key), storageKey);
      await page.locator('#clear').click();
      await page.locator('#cancel-clear').click();
      assert.equal(await page.locator('#nombre_publico').inputValue(), 'Borrador que debe conservarse');
      await page.locator('#clear').click();
      await page.locator('#confirm-clear').click();
      assert.equal(await page.locator('#nombre_publico').inputValue(), '');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#nombre_publico').inputValue(), '');
      const saved = await page.evaluate(key => localStorage.getItem(key), storageKey);
      assert.ok(saved === null || Object.keys(JSON.parse(saved).answers).length === 0);
    });

    await test('Restore confirmation, cancellation and sanitization reject unknown fields and unsafe structures', async () => {
      const { page, errors } = await open();
      await page.locator('#nombre_publico').fill('Borrador original');
      await restore(page, draft(), 'cancel');
      assert.equal(await page.locator('#nombre_publico').inputValue(), 'Borrador original');
      const malicious = JSON.parse(JSON.stringify(plainAnswers));
      malicious.nombre_publico = xss;
      malicious.zonas_prioritarias = 'Z'.repeat(5000);
      malicious.persona_contacto = { text: 'invalid object' };
      malicious.clientes_preferidos = ['No lo sé todavía', 'opción inventada', fields.find(field => field.id === 'clientes_preferidos').options[0], 'No lo sé todavía'];
      malicious.perfil_google = 'opción inventada';
      malicious.unknown_field = 'not allowed';
      Object.defineProperty(malicious, '__proto__', { value: { polluted: true }, enumerable: true });
      await restore(page, draft(malicious, 500));
      const saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey));
      assert.equal(saved.step, 7);
      assert.equal(saved.answers.nombre_publico, xss);
      assert.equal(saved.answers.zonas_prioritarias.length, 1000);
      assert.equal(saved.answers.persona_contacto, undefined);
      assert.equal(saved.answers.perfil_google, undefined);
      assert.equal(saved.answers.unknown_field, undefined);
      assert.equal(Object.hasOwn(saved.answers, '__proto__'), false);
      assert.deepEqual(saved.answers.clientes_preferidos, ['No lo sé todavía']);
      assert.equal(await page.evaluate(() => Boolean(window.__qaXss || ({}).polluted)), false);
      assert.equal(await page.locator('#step-content img').count(), 0);
      assert.deepEqual(errors, []);
    });

    await test('Invalid JSON and incompatible restore versions keep existing answers', async () => {
      const { page } = await open();
      await page.locator('#nombre_publico').fill('No sustituir');
      await page.locator('#restore-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
      await page.waitForFunction(() => document.getElementById('feedback').textContent.includes('formato válido'));
      assert.equal(await page.locator('#nombre_publico').inputValue(), 'No sustituir');
      await page.locator('#restore-file').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...draft(), version: '999' })) });
      await page.waitForFunction(() => document.getElementById('feedback').textContent.includes('no corresponde'));
      assert.equal(await page.locator('#nombre_publico').inputValue(), 'No sustituir');
      assert.equal(await page.locator('#replace-dialog').isVisible(), false);
    });

    await test('Restore limits preserve Unicode safely at a maximum-length boundary', async () => {
      const { page, errors } = await open();
      await restore(page, draft({ ...plainAnswers, nombre_publico: 'N'.repeat(239) + '🛠' }));
      assert.equal(await page.locator('#delivery').count(), 1, 'Review delivery must still render after restoring a clipped emoji.');
      assert.deepEqual(errors, []);
    });

    await test('Unavailable localStorage keeps the form usable and allows JSON backup', async () => {
      const { page, errors } = await open({ init: () => {
        Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Storage blocked in test', 'SecurityError'); } });
      } });
      assert.equal(await page.locator('#storage-warning').isVisible(), true);
      await page.locator('#nombre_publico').fill('Borrador sin almacenamiento');
      const exported = JSON.parse(await downloadText(page, '#backup', 'synthetic-no-storage.json'));
      assert.equal(exported.answers.nombre_publico, 'Borrador sin almacenamiento');
      assert.deepEqual(errors, []);
    });

    await test('Draft changes and deletion synchronize between tabs without resurrecting old answers', async () => {
      const { page, context, errors } = await open();
      await page.locator('#nombre_publico').fill('Primera versión');
      const second = await context.newPage();
      await second.goto(origin + '/#contacto=' + recipient, { waitUntil: 'networkidle' });
      assert.equal(await second.locator('#nombre_publico').inputValue(), 'Primera versión');
      await page.locator('#nombre_publico').fill('Versión actualizada');
      await second.waitForFunction(() => document.getElementById('nombre_publico').value === 'Versión actualizada');
      await second.locator('#clear').click();
      await second.locator('#confirm-clear').click();
      await page.waitForFunction(() => document.getElementById('nombre_publico').value === '');
      await second.close();
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#nombre_publico').inputValue(), '');
      assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), null);
      assert.deepEqual(errors, []);
    });

    await test('Failed localStorage deletion never claims the stored copy was erased', async () => {
      const { page } = await open();
      await page.locator('#nombre_publico').fill('Copia persistente');
      await page.evaluate(() => Object.defineProperty(Storage.prototype, 'removeItem', { configurable: true, value() { throw new DOMException('Deletion blocked in test', 'SecurityError'); } }));
      await page.locator('#clear').click();
      await page.locator('#confirm-clear').click();
      assert.equal(await page.locator('#nombre_publico').inputValue(), '');
      assert.match(await page.locator('#feedback').innerText(), /no se ha podido confirmar/);
      assert.ok(await page.evaluate(key => localStorage.getItem(key).includes('Copia persistente'), storageKey));
    });

    await test('Share cancellation conserves draft and does not claim a delivery', async () => {
      const { page } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled in test', 'AbortError'); } });
      } });
      await page.locator('#share-file').click();
      await page.waitForFunction(() => document.getElementById('delivery-status').textContent.includes('cancelado'));
      assert.ok(await page.evaluate(key => !!localStorage.getItem(key), storageKey));
      assert.doesNotMatch(await page.locator('#delivery-status').innerText(), /enviado|recibido/i);
    });

    await test('Unsupported native share offers complete text download', async () => {
      const { page } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      } });
      const text = await downloadText(page, '#share-file', 'synthetic-share-fallback.txt');
      assert.ok(text.includes(plainAnswers.nombre_publico));
      assert.match(await page.locator('#delivery-status').innerText(), /descargado.*Adjuntadlo/);
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    const report = { generatedAt: new Date().toISOString(), passed: results.filter(result => result.status === 'PASS').length, failed: results.filter(result => result.status === 'FAIL').length, results };
    fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: path.join(output, 'qa-report.json') }));
    if (report.failed) process.exitCode = 1;
  }
})().catch(error => { console.error(failMessage(error)); process.exitCode = 1; });
