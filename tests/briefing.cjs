/* Browser acceptance checks. Every contact and curriculum below is synthetic. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'docs');
const output = path.join(root, 'test-results');
const recipient = '34999999999';
const storageKey = persona => 'lyl-briefing-v2-' + persona;
const results = [];
const modelContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(publicRoot, 'questionnaire.js'), 'utf8'), modelContext);
const model = JSON.parse(JSON.stringify(modelContext.window.LYL_QUESTIONS));
assert.equal(model.version, '2', 'Run these checks against the individual questionnaire.');
const fields = model.steps.flatMap(step => step.fields);
const answerFields = fields.filter(field => !['cv', 'file'].includes(field.type));
const textField = answerFields.find(field => ['text', 'textarea'].includes(field.type));
const longField = answerFields.find(field => field.type === 'textarea');
assert.ok(textField && longField, 'Personal experience must allow free text.');
const cvStep = model.steps.findIndex(step => step.fields.some(field => field.type === 'cv' || field.id === 'curriculum'));
assert.ok(cvStep >= 0, 'An optional curriculum must be available.');
const indexOfField = field => model.steps.findIndex(step => step.fields.some(item => item.id === field.id));
const plainAnswers = Object.fromEntries(answerFields.map(field => {
  let value = field.options ? (field.type === 'checkboxes' ? [field.options[0]] : field.options[0]) : `Respuesta individual de prueba: ${field.id}`;
  if (field.type === 'email') value = 'prueba@example.test';
  if (field.type === 'tel') value = '34999999998';
  if (field.type === 'url') value = 'https://example.test/';
  if (field.type === 'number') value = '2';
  return [field.id, value];
}));
const xss = '<img src=x onerror="window.__qaXss=true">';
plainAnswers[longField.id] = 'Experiencia personal de prueba. ' + xss;
const pdfBytes = Buffer.from('%PDF-1.4\n% Curriculum sintetico para pruebas: Luis.\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
const pdf = { name: 'curriculum-luis-prueba.pdf', mimeType: 'application/pdf', buffer: pdfBytes };
function draft(answers = plainAnswers, step = model.steps.length, persona = 'luis') {
  return { app: 'lyl-briefing', version: model.version, persona, savedAt: '2026-10-09T12:00:00.000Z', step, answers };
}
function failMessage(error) { return error && error.stack ? error.stack : String(error); }
async function test(name, action) {
  const started = Date.now();
  try { await action(); results.push({ name, status: 'PASS', ms: Date.now() - started }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, status: 'FAIL', ms: Date.now() - started, error: failMessage(error) }); console.error('FAIL ' + name + '\n' + failMessage(error)); }
}
async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({ viewport: innerWidth, root: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(geometry.root <= geometry.viewport + 1 && geometry.body <= geometry.viewport + 1, label + ': ' + JSON.stringify(geometry));
}
async function reveal(locator) {
  await locator.evaluate(node => { for (let p = node.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; });
}
async function fillStep(page, index, values = plainAnswers) {
  for (const field of model.steps[index].fields) {
    const value = values[field.id];
    if (value === undefined || ['cv', 'file'].includes(field.type)) continue;
    if (field.type === 'checkboxes' || field.type === 'radio') {
      for (const option of Array.isArray(value) ? value : [value]) {
        const input = page.locator('#' + field.id + '-' + field.options.indexOf(option));
        await reveal(input); await input.check();
      }
    } else {
      const input = page.locator('#' + field.id); await reveal(input);
      if (field.type === 'select') await input.selectOption(value); else await input.fill(String(value));
    }
  }
}
async function goStep(page, index) {
  // Hidden mobile sidebar is used only to prepare isolated tests; full flows use Continue.
  await page.locator('#step-nav button').nth(index).evaluate(node => node.click());
  if (index === model.steps.length) await page.locator('#delivery').waitFor();
  else assert.equal(await page.locator('#step-title').innerText(), model.steps[index].title);
}
async function downloadBuffer(page, selector, name) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  const download = await pending; const file = path.join(output, name || download.suggestedFilename());
  await download.saveAs(file); return fs.readFileSync(file);
}
async function downloadText(page, selector, name) { return (await downloadBuffer(page, selector, name)).toString('utf8'); }
async function restore(page, data, action = 'confirm') {
  await page.locator('#restore-file').setInputFiles({ name: 'synthetic-copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.locator('#replace-dialog').waitFor({ state: 'visible' });
  await page.locator(action === 'cancel' ? '#cancel-restore' : '#confirm-restore').click();
}
async function attachCV(page, file = pdf) {
  await goStep(page, cvStep); await page.locator('#curriculum').setInputFiles(file);
  await page.waitForFunction(name => document.getElementById('cv-status').textContent.includes(name), file.name);
}
async function storedCV(page, persona) {
  return page.evaluate(async name => {
    const value = await window.LYLCV.get(name); if (!value) return null;
    const file = value.file || value;
    return { name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
  }, persona);
}
function unzip(buffer) {
  const entries = new Map(); let offset = 0;
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6), method = buffer.readUInt16LE(offset + 8);
    const size = buffer.readUInt32LE(offset + 18), nameLength = buffer.readUInt16LE(offset + 26), extraLength = buffer.readUInt16LE(offset + 28);
    assert.equal(flags & 8, 0, 'ZIP local headers must declare sizes.');
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength, compressed = buffer.subarray(start, start + size);
    const data = method === 0 ? compressed : method === 8 ? zlib.inflateRawSync(compressed) : null;
    assert.ok(data, 'Unsupported ZIP method: ' + method);
    assert.ok(!name.includes('..') && !/^[\/\\]/.test(name), 'ZIP entry must use a safe relative filename.');
    entries.set(name, data); offset = start + size;
  }
  assert.ok(entries.size >= 2, 'ZIP must contain answers and the curriculum.'); return entries;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'); let relative;
    try { relative = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400); res.end(); return; }
    if (relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(publicRoot, '.' + relative);
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('Not found'); return; }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser; const contexts = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'), headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
    async function open({ width = 390, persona = 'luis', hash, stored, extraStorage = {}, init } = {}) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, acceptDownloads: true });
      context.setDefaultTimeout(10000); contexts.push(context); const external = [], errors = [];
      await context.route('**/*', route => {
        const url = route.request().url();
        if (/^https?:/.test(url) && new URL(url).origin !== origin) { external.push(url); return route.abort(); }
        return route.continue();
      });
      const initialStorage = { ...extraStorage }; if (stored !== undefined) initialStorage[storageKey(persona)] = stored;
      if (Object.keys(initialStorage).length) await context.addInitScript(values => {
        if (!localStorage.getItem('qa-seeded')) {
          for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
          localStorage.setItem('qa-seeded', 'yes');
        }
      }, initialStorage);
      if (init) await context.addInitScript(init);
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      const fragment = hash === undefined ? '#contacto=' + recipient + '&persona=' + persona : hash;
      await page.goto(origin + '/' + fragment, { waitUntil: 'networkidle' });
      if (new URLSearchParams(fragment.replace(/^#/, '')).get('persona')) {
        await page.locator('#step-title').waitFor();
        await page.waitForFunction(() => !document.getElementById('questionnaire').inert);
      }
      else await page.locator('#choose-luis').waitFor();
      return { context, page, external, errors };
    }

    await test('Shared entry chooses Luis or Lino and retains their identity and recipient', async () => {
      const { page, external, errors } = await open({ hash: '#contacto=' + recipient });
      assert.equal(await page.locator('#choose-luis').isVisible(), true); assert.equal(await page.locator('#choose-lino').isVisible(), true);
      await noOverflow(page, 'owner selection'); await page.locator('#choose-luis').click();
      assert.match(await page.locator('#persona-name').innerText(), /Luis/);
      assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('persona'), 'luis');
      assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('contacto'), recipient);
      await page.locator('#change-persona').click(); await page.locator('#choose-lino').click();
      assert.match(await page.locator('#persona-name').innerText(), /Lino/);
      await page.reload({ waitUntil: 'networkidle' }); assert.match(await page.locator('#persona-name').innerText(), /Lino/);
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    for (const width of [390, 320]) await test(width + 'px: complete individual flow, validation, autosave and safe review', async () => {
      const persona = width === 390 ? 'luis' : 'lino'; const { page, external, errors } = await open({ width, persona });
      const firstRequiredStep = model.steps.findIndex(step => step.fields.some(field => field.required));
      for (let index = 0; index < model.steps.length; index++) {
        assert.equal(await page.locator('#step-title').innerText(), model.steps[index].title);
        if (index === firstRequiredStep) {
          await page.locator('#next').click(); assert.equal(await page.locator('#validation-summary').isVisible(), true);
          assert.equal(await page.locator('#step-title').innerText(), model.steps[index].title);
        }
        await fillStep(page, index); await noOverflow(page, 'step ' + (index + 1) + ' at ' + width);
        if (index === 0) await page.screenshot({ path: path.join(output, 'mobile-first-' + width + '.png') });
        await page.locator('#next').click();
      }
      await page.locator('#delivery').waitFor(); assert.equal(await page.locator('.review-section').count(), model.steps.length);
      assert.equal(await page.locator('.review-missing').count(), 0);
      assert.ok((await page.locator('#step-content').innerText()).includes(xss)); assert.equal(await page.locator('#step-content img').count(), 0);
      assert.equal(await page.evaluate(() => Boolean(window.__qaXss)), false);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey(persona));
      assert.equal(saved.persona, persona); assert.equal(saved.answers[longField.id], plainAnswers[longField.id]);
      await noOverflow(page, 'review at ' + width); await page.locator('#delivery').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, 'mobile-review-' + width + '.png') });
      await page.reload({ waitUntil: 'networkidle' }); assert.match(await page.locator('#delivery').innerText(), new RegExp(recipient));
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    await test('The short route accepts only required choices and no curriculum', async () => {
      const { page, errors } = await open();
      const required = Object.fromEntries(answerFields.filter(field => field.required).map(field => [field.id, plainAnswers[field.id]]));
      for (let index = 0; index < model.steps.length; index++) { await fillStep(page, index, required); await page.locator('#next').click(); }
      await page.locator('#delivery').waitFor(); assert.equal(await page.locator('.review-missing').count(), 0);
      const text = await downloadText(page, '#download-text', 'synthetic-required-only.txt');
      assert.match(text, /Luis/); assert.equal(await storedCV(page, 'luis'), null); assert.deepEqual(errors, []);
    });

    await test('Each owner has independent answers and CVs, including after reload', async () => {
      const { page, errors, external } = await open({ stored: draft(plainAnswers, indexOfField(textField)) });
      await page.locator('#' + textField.id).fill('Experiencia exclusiva de Luis'); await attachCV(page);
      assert.deepEqual((await storedCV(page, 'luis')).bytes, Array.from(pdfBytes)); assert.equal(await storedCV(page, 'lino'), null);
      await page.locator('#change-persona').click(); await page.locator('#choose-lino').click(); await goStep(page, indexOfField(textField));
      assert.equal(await page.locator('#' + textField.id).inputValue(), ''); await page.locator('#' + textField.id).fill('Experiencia exclusiva de Lino');
      await goStep(page, cvStep); assert.ok(!(await page.locator('#cv-status').innerText()).includes(pdf.name));
      const linoBytes = Buffer.from('%PDF-1.4\n% Curriculum sintetico de Lino.\n%%EOF\n');
      await attachCV(page, { name: 'curriculum-lino-prueba.pdf', mimeType: 'application/pdf', buffer: linoBytes });
      await page.reload({ waitUntil: 'networkidle' }); assert.match(await page.locator('#persona-name').innerText(), /Lino/);
      assert.match(await page.locator('#cv-status').innerText(), /curriculum-lino-prueba.pdf/);
      assert.deepEqual((await storedCV(page, 'lino')).bytes, Array.from(linoBytes));
      await page.locator('#change-persona').click(); await page.locator('#choose-luis').click(); await goStep(page, indexOfField(textField));
      assert.equal(await page.locator('#' + textField.id).inputValue(), 'Experiencia exclusiva de Luis'); await goStep(page, cvStep);
      assert.match(await page.locator('#cv-status').innerText(), /curriculum-luis-prueba.pdf/);
      assert.deepEqual((await storedCV(page, 'luis')).bytes, Array.from(pdfBytes)); assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    await test('Legacy collective v1 answers are never assigned to an individual', async () => {
      const oldDraft = { app: 'lyl-briefing', version: '1', step: 0, answers: { nombre_publico: 'OLD COLLECTIVE ANSWER', [textField.id]: 'OLD COLLECTIVE ANSWER' } };
      const { page } = await open({ extraStorage: { 'lyl-briefing-v1': oldDraft } }); await goStep(page, indexOfField(textField));
      assert.equal(await page.locator('#' + textField.id).inputValue(), '');
      await page.locator('#change-persona').click(); await page.locator('#choose-lino').click(); await goStep(page, indexOfField(textField));
      assert.equal(await page.locator('#' + textField.id).inputValue(), '');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('lyl-briefing-v1'))), oldDraft);
    });

    await test('Exports identify the owner, omit the recipient and preserve every WhatsApp part', async () => {
      const longAnswers = { ...plainAnswers };
      for (const field of answerFields.filter(field => field.type === 'textarea')) longAnswers[field.id] = `${field.id}: ` + 'Reparación ágil 🛠️. '.repeat(50);
      const { page, external, errors } = await open({ stored: draft(longAnswers) });
      const jsonText = await downloadText(page, '#backup', 'synthetic-luis-backup.json'), backup = JSON.parse(jsonText);
      assert.equal(backup.persona, 'luis'); assert.equal(backup.version, '2'); assert.ok(!jsonText.includes(recipient));
      assert.equal(Object.hasOwn(backup.answers, 'curriculum'), false, 'CV binary must not enter JSON answers.');
      const fullText = await downloadText(page, '#download-text', 'synthetic-luis-answers.txt');
      assert.match(fullText, /Luis/); assert.ok(!fullText.includes(recipient));
      const hrefs = await page.locator('a[data-part]').evaluateAll(nodes => nodes.map(node => node.href));
      assert.ok(hrefs.length > 1, 'Long answers must be split into bounded links.');
      const parts = hrefs.map((href, index) => {
        const url = new URL(href); assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/' + recipient);
        assert.ok(href.length < 5400, 'WhatsApp links must have a bounded size.'); const message = url.searchParams.get('text');
        assert.match(message.split('\n')[0], new RegExp('Parte ' + (index + 1) + ' de ' + hrefs.length, 'i')); return message.slice(message.indexOf('\n') + 1);
      });
      assert.equal(parts.join(''), fullText, 'Combined WhatsApp bodies must equal the TXT exactly.');
      for (const value of Object.values(backup.answers)) assert.ok(fullText.includes(Array.isArray(value) ? value.join('; ') : value.trim()), 'TXT is missing an answer.');
      await page.evaluate(() => {
        window.__qaOpened = []; document.addEventListener('click', event => {
          const anchor = event.target.closest('a'); if (anchor && anchor.href.startsWith('https://wa.me/')) { window.__qaOpened.push(anchor.href); event.preventDefault(); }
        }, true);
      });
      await page.locator('a[data-part]').first().click(); assert.equal(await page.evaluate(() => window.__qaOpened.length), 1);
      assert.match(await page.locator('#delivery-status').innerText(), /abiert|Enviar/i);
      assert.doesNotMatch(await page.locator('#delivery-status').innerText(), /enviado correctamente|recibido correctamente|respuestas enviadas/i);
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    await test('Missing required answers block WhatsApp, sharing and final downloads', async () => {
      const { page } = await open({ stored: draft({}) }); const downloads = []; page.on('download', d => downloads.push(d.suggestedFilename()));
      await page.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a[href^="https://wa.me/"]')) e.preventDefault(); }, true));
      for (const selector of ['a[data-part]', '#download-text', '#share-file']) { await page.locator(selector).first().click(); assert.equal(await page.locator('#validation-summary').isVisible(), true); }
      assert.equal(await page.locator('[data-opened="true"]').count(), 0); assert.deepEqual(downloads, []);
    });

    await test('Invalid or absent recipient allows contact selection without losing owner identity', async () => {
      for (const hash of ['#persona=luis', '#persona=luis&contacto=incorrecto']) {
        const { page, external } = await open({ hash, stored: draft() });
        assert.equal(new URL(await page.locator('a[data-part]').first().getAttribute('href')).pathname, '/');
        assert.match(await page.locator('#persona-name').innerText(), /Luis/); assert.deepEqual(external, []);
      }
    });

    await test('Study and accessible skip links retain recipient and individual identity', async () => {
      const { page, external } = await open({ stored: draft() }); const pending = page.waitForEvent('popup');
      await page.locator('.study-link').click(); const popup = await pending; await popup.waitForLoadState('networkidle');
      assert.equal(new URL(popup.url()).pathname, '/estudio.html'); await popup.close();
      await page.locator('.skip').focus(); await page.keyboard.press('Enter'); await page.reload({ waitUntil: 'networkidle' });
      const params = new URLSearchParams(new URL(page.url()).hash.slice(1)); assert.equal(params.get('contacto'), recipient); assert.equal(params.get('persona'), 'luis');
      assert.match(await page.locator('#delivery').innerText(), new RegExp(recipient)); assert.deepEqual(external, []);
    });

    await test('Restore confirms replacement, validates owner and sanitizes unsafe structures', async () => {
      const { page, errors } = await open({ stored: draft(plainAnswers, indexOfField(textField)) });
      await page.locator('#' + textField.id).fill('Borrador original de Luis'); await restore(page, draft(), 'cancel');
      assert.equal(await page.locator('#' + textField.id).inputValue(), 'Borrador original de Luis');
      await page.locator('#restore-file').setInputFiles({ name: 'lino.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(draft(plainAnswers, 0, 'lino'))) });
      await page.waitForFunction(() => document.getElementById('feedback').textContent.length > 0);
      assert.equal(await page.locator('#replace-dialog').isVisible(), false); assert.equal(await page.locator('#' + textField.id).inputValue(), 'Borrador original de Luis');
      const malicious = { ...plainAnswers, [longField.id]: 'Z'.repeat(5000), unknown_field: 'not allowed' };
      const select = answerFields.find(field => field.type === 'select'); if (select) malicious[select.id] = 'option that does not exist';
      if (textField.id !== longField.id) malicious[textField.id] = xss;
      Object.defineProperty(malicious, '__proto__', { value: { polluted: true }, enumerable: true }); await restore(page, draft(malicious, 500));
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey('luis'));
      assert.equal(saved.persona, 'luis'); assert.equal(saved.step, model.steps.length); assert.ok(saved.answers[longField.id].length <= 1000);
      assert.equal(saved.answers.unknown_field, undefined); assert.equal(Object.hasOwn(saved.answers, '__proto__'), false);
      if (select) assert.equal(saved.answers[select.id], undefined);
      assert.equal(await page.evaluate(() => Boolean(window.__qaXss || ({}).polluted)), false); assert.equal(await page.locator('#step-content img').count(), 0); assert.deepEqual(errors, []);
    });

    await test('Invalid JSON and incompatible versions never overwrite an individual draft', async () => {
      const { page } = await open({ stored: draft(plainAnswers, indexOfField(textField)) }); await page.locator('#' + textField.id).fill('No sustituir');
      for (const buffer of [Buffer.from('{broken'), Buffer.from(JSON.stringify({ ...draft(), version: '1' })), Buffer.from(JSON.stringify({ ...draft(), version: '999' }))]) {
        await page.locator('#feedback').evaluate(node => { node.textContent = ''; });
        await page.locator('#restore-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer });
        await page.waitForFunction(() => document.getElementById('feedback').textContent.length > 0);
        assert.equal(await page.locator('#' + textField.id).inputValue(), 'No sustituir'); assert.equal(await page.locator('#replace-dialog').isVisible(), false);
      }
    });

    await test('CV type and size validation preserve the prior attachment; removal survives reload', async () => {
      const { page, external, errors } = await open({ stored: draft() }); await attachCV(page);
      for (const [file, expectedError] of [
        [{ name: 'danger.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('synthetic non-document') }, 'PDF, DOC o DOCX'],
        [{ name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) }, 'vacío'],
        [{ name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(11 * 1024 * 1024, 65) }, '10 MB']
      ]) {
        await page.locator('#curriculum').setInputFiles(file);
        await page.waitForFunction(text => document.getElementById('cv-status').textContent.includes(text), expectedError);
        assert.ok(!(await page.locator('#cv-status').innerText()).includes(file.name));
        assert.deepEqual((await storedCV(page, 'luis')).bytes, Array.from(pdfBytes));
      }
      await page.locator('#remove-cv').click(); await page.waitForFunction(async () => !(await window.LYLCV.get('luis')));
      assert.equal(await storedCV(page, 'luis'), null); assert.ok(!(await page.locator('#cv-status').innerText()).includes(pdf.name));
      await page.reload({ waitUntil: 'networkidle' }); assert.ok(!(await page.locator('#cv-status').innerText()).includes(pdf.name));
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    await test('Confirmed clearing erases only the selected owner and their CV', async () => {
      const { page } = await open({ stored: draft(plainAnswers, cvStep), extraStorage: { [storageKey('lino')]: draft({ ...plainAnswers, [textField.id]: 'Conservar Lino' }, cvStep, 'lino') } });
      await attachCV(page); await page.evaluate(async () => window.LYLCV.put('lino', new File(['%PDF-1.4\nLino\n%%EOF'], 'lino.pdf', { type: 'application/pdf' })));
      await page.locator('#clear').click(); await page.locator('#cancel-clear').click(); assert.ok(await storedCV(page, 'luis'));
      await page.locator('#clear').click(); await page.locator('#confirm-clear').click(); await page.waitForFunction(async () => !(await window.LYLCV.get('luis')));
      assert.equal(await storedCV(page, 'luis'), null); assert.ok(await storedCV(page, 'lino'));
      assert.equal((await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey('lino'))).answers[textField.id], 'Conservar Lino');
      await page.reload({ waitUntil: 'networkidle' }); await goStep(page, indexOfField(textField)); assert.equal(await page.locator('#' + textField.id).inputValue(), '');
    });

    await test('Native sharing contains the exact CV and full answers as two real files', async () => {
      const { page, external, errors } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => Array.isArray(data.files) && data.files.length > 0 });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
          window.__qaShared = await Promise.all(data.files.map(async file => ({ name: file.name, type: file.type, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) })));
        } });
      } });
      await attachCV(page); await goStep(page, model.steps.length); const fullText = await downloadText(page, '#download-text', 'synthetic-share-answers.txt');
      await page.locator('#share-file').click(); await page.waitForFunction(() => Array.isArray(window.__qaShared));
      const shared = await page.evaluate(() => window.__qaShared); assert.equal(shared.length, 2);
      const curriculum = shared.find(file => file.name === pdf.name); assert.ok(curriculum, 'Sharing must carry the actual CV, not only its filename.');
      assert.deepEqual(curriculum.bytes, Array.from(pdfBytes));
      assert.equal(Buffer.from(shared.find(file => file.name.endsWith('.txt')).bytes).toString('utf8'), fullText);
      assert.doesNotMatch(await page.locator('#delivery-status').innerText(), /recibido correctamente|respuestas enviadas|enviado correctamente/i);
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
    });

    await test('Unsupported sharing downloads a ZIP containing exact answers and CV bytes', async () => {
      const { page, external } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      } });
      await attachCV(page); await goStep(page, model.steps.length); const text = await downloadText(page, '#download-text', 'synthetic-fallback-answers.txt');
      for (const [selector, name] of [['#share-file', 'synthetic-share-fallback.zip'], ['#download-package', 'synthetic-complete-package.zip']]) {
        const entries = unzip(await downloadBuffer(page, selector, name));
        const answer = [...entries].find(([n]) => n.endsWith('.txt')), curriculum = [...entries].find(([n]) => n.endsWith('.pdf'));
        assert.ok(answer && curriculum); assert.equal(answer[1].toString('utf8'), text); assert.deepEqual(curriculum[1], pdfBytes);
      }
      assert.match(await page.locator('#delivery-status').innerText(), /adjunta|adjuntarlo|adjuntar|WhatsApp/i); assert.deepEqual(external, []);
    });

    await test('Share cancellation preserves answers and attachment without claiming delivery', async () => {
      const { page } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Cancelled in test', 'AbortError'); } });
      } });
      await attachCV(page); await goStep(page, model.steps.length); await page.locator('#share-file').click();
      await page.waitForFunction(() => /cancelad/i.test(document.getElementById('delivery-status').textContent));
      assert.ok(await storedCV(page, 'luis')); assert.ok(await page.evaluate(key => !!localStorage.getItem(key), storageKey('luis')));
      assert.doesNotMatch(await page.locator('#delivery-status').innerText(), /enviado correctamente|recibido/i);
    });

    await test('Without a CV or native share, complete text can still be downloaded', async () => {
      const { page } = await open({ stored: draft(), init: () => {
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      } });
      const text = await downloadText(page, '#share-file', 'synthetic-no-cv-fallback.txt'); assert.match(text, /Luis/); assert.ok(text.includes(plainAnswers[longField.id]));
    });

    await test('Unavailable localStorage keeps the form usable and permits an individual backup', async () => {
      const { page, errors } = await open({ init: () => {
        Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value() { throw new DOMException('Storage blocked in test', 'SecurityError'); } });
      } });
      assert.equal(await page.locator('#storage-warning').isVisible(), true); await goStep(page, indexOfField(textField));
      await page.locator('#' + textField.id).fill('Borrador sin almacenamiento'); const exported = JSON.parse(await downloadText(page, '#backup', 'synthetic-no-storage.json'));
      assert.equal(exported.persona, 'luis'); assert.equal(exported.answers[textField.id], 'Borrador sin almacenamiento'); assert.deepEqual(errors, []);
    });

    await test('Blocked IndexedDB keeps the current CV shareable and warns about session-only storage', async () => {
      const { page, errors } = await open({ stored: draft(), init: () => {
        Object.defineProperty(IDBFactory.prototype, 'open', { configurable: true, value() { throw new DOMException('IndexedDB blocked in test', 'SecurityError'); } });
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.__qaSessionFiles = data.files.map(file => file.name); } });
      } });
      await attachCV(page); assert.match(await page.locator('#cv-status').innerText(), /sesión|cerrar|guardar|conservar|almacena/i);
      await goStep(page, model.steps.length); await page.locator('#share-file').click(); await page.waitForFunction(() => Array.isArray(window.__qaSessionFiles));
      assert.ok((await page.evaluate(() => window.__qaSessionFiles)).includes(pdf.name)); assert.deepEqual(errors, []);
    });

    await test('Cross-tab updates and clearing synchronize only the matching owner', async () => {
      const { page, context, errors } = await open({ stored: draft(plainAnswers, indexOfField(textField)), extraStorage: { [storageKey('lino')]: draft({ ...plainAnswers, [textField.id]: 'Mantener Lino' }, indexOfField(textField), 'lino') } });
      const second = await context.newPage(); await second.goto(origin + '/#contacto=' + recipient + '&persona=luis', { waitUntil: 'networkidle' });
      const lino = await context.newPage(); await lino.goto(origin + '/#contacto=' + recipient + '&persona=lino', { waitUntil: 'networkidle' });
      await page.locator('#' + textField.id).fill('Luis actualizado');
      await second.waitForFunction(id => document.getElementById(id).value === 'Luis actualizado', textField.id);
      assert.equal(await lino.locator('#' + textField.id).inputValue(), 'Mantener Lino'); await second.locator('#clear').click(); await second.locator('#confirm-clear').click();
      await page.waitForFunction(key => localStorage.getItem(key) === null, storageKey('luis')); await second.close();
      await page.reload({ waitUntil: 'networkidle' }); await goStep(page, indexOfField(textField)); assert.equal(await page.locator('#' + textField.id).inputValue(), '');
      assert.equal(await lino.locator('#' + textField.id).inputValue(), 'Mantener Lino'); assert.deepEqual(errors, []);
    });

    await test('Failed deletion does not claim the persisted draft was erased', async () => {
      const { page } = await open({ stored: draft(plainAnswers, indexOfField(textField)) }); await page.locator('#' + textField.id).fill('Copia persistente');
      await page.evaluate(() => Object.defineProperty(Storage.prototype, 'removeItem', { configurable: true, value() { throw new DOMException('Deletion blocked in test', 'SecurityError'); } }));
      await page.locator('#clear').click(); await page.locator('#confirm-clear').click();
      await page.locator('#clear-dialog').waitFor({ state: 'hidden' });
      assert.match(await page.locator('#feedback').innerText(), /no.*confirm|no.*borrar|no.*eliminar|no.*borrado/i);
      assert.ok(await page.evaluate(key => localStorage.getItem(key).includes('Copia persistente'), storageKey('luis')));
    });
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
    const report = { generatedAt: new Date().toISOString(), passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, results };
    fs.writeFileSync(path.join(output, 'qa-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, failed: report.failed, report: path.join(output, 'qa-report.json') }));
    if (report.failed) process.exitCode = 1;
  }
})().catch(error => { console.error(failMessage(error)); process.exitCode = 1; });
