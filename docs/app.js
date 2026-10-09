/* Respuestas individuales. Ningún dato se envía automáticamente. */
(() => {
  'use strict';
  const model = window.LYL_QUESTIONS;
  if (!model || !window.LYLCV) return;
  const steps = model.steps, fields = steps.flatMap(s => s.fields);
  const names = { luis: 'Luis', lino: 'Lino' };
  const $ = id => document.getElementById(id);
  const form = $('questionnaire'), content = $('step-content'), feedback = $('feedback'), summary = $('validation-summary');
  const params = new URLSearchParams(location.hash.slice(1));
  const contactInput = (params.get('contacto') || '').replace(/^\+/, '');
  const recipient = /^[1-9]\d{7,14}$/.test(contactInput) ? contactInput : '';
  let persona = '', current = 0, answers = Object.create(null), cvFile = null, cvPersisted = false;
  let cvNotice = '', cvBusy = false, pendingRestore = null, generation = 0, queuedExternal = false;
  const key = () => 'lyl-briefing-v2-' + persona;
  const uncertain = value => /^No lo sé/i.test(value);
  const limit = field => field.type === 'textarea' ? 1000 : 240;
  const cleanText = (text, max = 1000) => Array.from(text.slice(0, max)).map(c => c.length === 1 && /[\uD800-\uDFFF]/.test(c) ? '\uFFFD' : c).join('');
  function setBusy(value) {
    cvBusy = value;
    ['backup', 'change-persona', 'clear', 'restore-file'].forEach(id => { $(id).disabled = value; });
    if (!value && queuedExternal && persona) {
      queuedExternal = false;
      queueMicrotask(() => { try { syncExternal(localStorage.getItem(key())); } catch (_) {} });
    }
  }
  function el(tag, props = {}, text) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => { if (k === 'class') node.className = v; else if (k === 'htmlFor') node.htmlFor = v; else node.setAttribute(k, String(v)); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sanitize(raw) {
    const clean = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const field of fields) {
      const value = raw[field.id];
      if (field.type === 'cv') continue;
      if (field.type === 'checkboxes' && Array.isArray(value)) {
        const selected = [...new Set(value.filter(v => typeof v === 'string' && field.options.includes(v)))];
        clean[field.id] = selected.some(uncertain) ? [selected.find(uncertain)] : selected;
      } else if (typeof value === 'string' && (!field.options || field.options.includes(value))) clean[field.id] = cleanText(value, limit(field));
    }
    return clean;
  }
  function validDraft(data, who = persona) { return data && data.app === 'lyl-briefing' && data.version === model.version && data.persona === who && data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers); }
  function attachment() { return cvFile ? { name: cvFile.name, size: cvFile.size, lastModified: cvFile.lastModified, persisted: cvPersisted } : null; }
  function snapshot() { return { app: 'lyl-briefing', version: model.version, persona, savedAt: new Date().toISOString(), step: current, answers, attachment: attachment(), cvIncluded: false }; }
  function save() {
    if (!persona) return;
    try { localStorage.setItem(key(), JSON.stringify(snapshot())); $('draft-state').textContent = 'Borrador de ' + names[persona] + ' guardado'; $('storage-warning').hidden = true; }
    catch (_) { $('draft-state').textContent = 'Sin guardado automático'; $('storage-warning').hidden = false; $('storage-warning').textContent = 'Este navegador no guarda tus respuestas. Usa «Guardar copia del borrador» antes de salir. El CV se comparte aparte y no está incluido en esa copia.'; }
  }
  function updateLink() {
    const hash = new URLSearchParams();
    if (recipient) hash.set('contacto', recipient);
    if (persona) hash.set('persona', persona);
    history.replaceState(null, '', location.pathname + location.search + (hash.size ? '#' + hash : ''));
    document.querySelector('.brand').href = './' + (hash.size ? '#' + hash : '');
  }
  async function readCV(expected, token) {
    let file = null, note = '';
    try {
      const stored = await window.LYLCV.get(persona);
      if (stored && expected && expected.persisted !== false && stored.name === expected.name && stored.size === expected.size && stored.lastModified === expected.lastModified) file = stored;
      else if (expected) note = 'Tu CV no está disponible en este navegador. Adjunta el archivo de nuevo si quieres compartirlo.';
    } catch (_) { note = expected ? 'No se ha podido recuperar tu CV. Adjunta el archivo de nuevo.' : 'El CV podrá usarse en esta pestaña, pero este navegador podría no guardarlo.'; }
    if (token !== generation) return;
    cvFile = file; cvPersisted = !!file; cvNotice = note;
  }
  async function activate(who) {
    const token = ++generation;
    persona = Object.hasOwn(names, who) ? who : '';
    current = 0; answers = Object.create(null); cvFile = null; cvPersisted = false; cvNotice = ''; pendingRestore = null; queuedExternal = false;
    $('identity-picker').hidden = !!persona; $('personal-form').hidden = !persona; $('step-nav').hidden = !persona;
    feedback.textContent = ''; updateLink();
    if (!persona) { setBusy(false); $('identity-title').focus({ preventScroll: true }); return; }
    $('persona-name').textContent = names[persona];
    let stored = null;
    try { const data = JSON.parse(localStorage.getItem(key()) || 'null'); if (validDraft(data)) stored = data; } catch (_) { /* Keep a damaged draft untouched until the user answers. */ }
    if (stored) { answers = sanitize(stored.answers); current = Number.isInteger(stored.step) ? Math.max(0, Math.min(steps.length, stored.step)) : 0; }
    setBusy(true); render(); form.inert = true; $('draft-state').textContent = 'Abriendo tu borrador…';
    await readCV(stored && stored.attachment, token);
    if (token !== generation) return;
    setBusy(false); form.inert = false; render(); $('draft-state').textContent = stored ? 'Borrador de ' + names[persona] + ' recuperado' : 'Tu borrador empieza aquí';
    try { const probe = key() + '-probe'; localStorage.setItem(probe, '1'); localStorage.removeItem(probe); } catch (_) { save(); }
    if (params.has('contacto') && !recipient) feedback.textContent = 'El enlace no contiene un WhatsApp válido. Al compartir, elige el contacto de tu programador.';
  }
  function displayValue(field) {
    if (field.type === 'cv') return cvFile ? cvFile.name + ' · ' + formatSize(cvFile.size) + ' (compartir como archivo)' : 'Sin currículum adjunto';
    const value = answers[field.id]; return Array.isArray(value) ? value.join('; ') : typeof value === 'string' ? value.trim() : '';
  }
  function errorFor(field) { return field.required && !displayValue(field) ? 'Elige una respuesta para continuar.' : ''; }
  const errorsIn = index => steps[index].fields.map(field => ({ field, message: errorFor(field) })).filter(e => e.message);
  const allErrors = () => steps.flatMap((s, index) => errorsIn(index).map(e => ({ ...e, index })));
  function updateNav() {
    const list = el('ol', { class: 'step-list' });
    [...steps.map(s => s.title), 'Revisar y enviar'].forEach((name, i) => {
      const li = el('li'), complete = i < steps.length && errorsIn(i).length === 0;
      const button = el('button', { type: 'button', class: 'step-link' + (complete ? ' completed' : '') });
      if (i === current) button.setAttribute('aria-current', 'step');
      button.append(el('span', { class: 'step-number' }, String(i + 1)), el('span', {}, name)); button.addEventListener('click', () => go(i)); li.append(button); list.append(li);
    });
    $('step-nav').replaceChildren(list);
    $('step-position').textContent = current === steps.length ? 'Último paso · Revisar y enviar' : `Paso ${current + 1} de ${steps.length + 1}`;
    $('progress').max = steps.length + 1; $('progress').value = current + 1;
  }
  function changed(field, node) {
    if (field.type === 'checkboxes') {
      let selected = [...content.querySelectorAll(`input[name="${field.id}"]:checked`)].map(n => n.value);
      if (node.checked && uncertain(node.value)) selected = [node.value]; else if (node.checked) selected = selected.filter(v => !uncertain(v));
      content.querySelectorAll(`input[name="${field.id}"]`).forEach(n => { n.checked = selected.includes(n.value); }); answers[field.id] = selected;
    } else answers[field.id] = node.value;
    save(); const error = $('error-' + field.id); if (error) { error.hidden = true; error.textContent = ''; }
    content.querySelectorAll(`[name="${field.id}"],#group-${field.id}`).forEach(n => n.removeAttribute('aria-invalid')); summary.hidden = true;
  }
  function formatSize(size) { return size < 1024 * 1024 ? Math.max(1, Math.round(size / 1024)) + ' KB' : (size / (1024 * 1024)).toFixed(1) + ' MB'; }
  function cvStatus() {
    if (!$('cv-status')) return;
    $('cv-status').textContent = cvBusy ? 'Preparando el archivo…' : (cvFile ? cvFile.name + ' · ' + formatSize(cvFile.size) + '. ' : '') + (cvNotice || (cvFile ? (cvPersisted ? 'Guardado en este navegador. Todavía no se ha enviado.' : 'Solo disponible en esta pestaña; vuelve a adjuntarlo si recargas o cambias de persona.') : 'Puedes continuar sin currículum.'));
    $('remove-cv').hidden = !cvFile; $('remove-cv').disabled = cvBusy; $('curriculum').disabled = cvBusy; $('next').disabled = cvBusy;
  }
  async function finishCVMutation(owner, token) {
    let deletedElsewhere = false, merged = false;
    if (queuedExternal) {
      queuedExternal = false;
      try {
        const latest = JSON.parse(localStorage.getItem(key()) || 'null');
        if (latest === null) {
          // A concurrent explicit deletion wins over an in-flight attachment.
          deletedElsewhere = true;
          try { await window.LYLCV.remove(owner); } catch (_) { cvNotice = 'El borrado del CV no se pudo confirmar. Elimina los datos del sitio en los ajustes del navegador.'; }
          if (token !== generation) return;
          answers = Object.create(null); current = 0; cvFile = null; cvPersisted = false;
        } else if (validDraft(latest, owner)) {
          // Keep the latest answers from the other tab and the attachment just edited here.
          answers = sanitize(latest.answers); current = Number.isInteger(latest.step) ? Math.max(0, Math.min(steps.length, latest.step)) : 0; merged = true;
        }
      } catch (_) { /* save() below reports unavailable storage. */ }
    }
    if (!deletedElsewhere) save();
    setBusy(false);
    if (deletedElsewhere || merged) { render(); feedback.textContent = deletedElsewhere ? 'El borrador se ha borrado desde otra pestaña.' : 'Se han conservado las respuestas de la otra pestaña y el cambio de tu currículum.'; }
    else cvStatus();
  }
  function renderCV(field) {
    const wrapper = el('div', { class: 'field cv-field', id: 'field-' + field.id });
    const label = el('label', { htmlFor: 'curriculum', class: 'field-label' }, field.label + ' '); label.append(el('span', { class: 'optional' }, '(opcional)'));
    const input = el('input', { id: 'curriculum', type: 'file', accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'aria-describedby': 'cv-help cv-status', class: 'cv-input' });
    const status = el('p', { id: 'cv-status', class: 'field-help', role: 'status', 'aria-live': 'polite' });
    const remove = el('button', { id: 'remove-cv', type: 'button', class: 'text-button' }, 'Quitar currículum');
    wrapper.append(label, el('p', { id: 'cv-help', class: 'field-help' }, (field.help || '') + ' PDF, DOC o DOCX · máximo 10 MB. Solo tu propio CV; no hace falta poner DNI ni dirección completa.'), input, status, remove);
    input.addEventListener('change', async () => {
      const file = input.files[0]; input.value = ''; if (!file) return;
      try { window.LYLCV.validate(file); } catch (error) { cvNotice = error.message; cvStatus(); return; }
      const owner = persona, token = generation; setBusy(true); cvNotice = ''; cvStatus(); cvFile = file; cvPersisted = false;
      try { await window.LYLCV.put(owner, file); if (token === generation) cvPersisted = true; } catch (_) { if (token === generation) cvNotice = 'Disponible en esta pestaña. No se ha podido guardar el CV: vuelve a adjuntarlo si recargas, cierras o cambias de persona.'; }
      if (token !== generation) return;
      await finishCVMutation(owner, token);
    });
    remove.addEventListener('click', async () => {
      const owner = persona, token = generation; setBusy(true); cvStatus();
      try { await window.LYLCV.remove(owner); if (token === generation) { cvFile = null; cvPersisted = false; cvNotice = 'Currículum quitado de este navegador.'; } }
      catch (_) { if (token === generation) cvNotice = 'No se ha podido borrar el CV guardado. Inténtalo de nuevo o elimina los datos de este sitio en los ajustes del navegador.'; }
      if (token !== generation) return;
      await finishCVMutation(owner, token);
    }); return wrapper;
  }
  function renderField(field) {
    if (field.type === 'cv') return renderCV(field);
    const wrapper = el('div', { class: 'field', id: 'field-' + field.id });
    const multi = ['checkboxes', 'radio'].includes(field.type), group = multi ? el('fieldset') : wrapper;
    const label = el(multi ? 'legend' : 'label', { class: 'field-label', ...(multi ? {} : { htmlFor: field.id }) }, field.label + ' ');
    label.append(el('span', { class: field.required ? 'required-mark' : 'optional' }, field.required ? '*' : '(opcional)')); group.append(label);
    const described = 'help-' + field.id + ' error-' + field.id;
    if (multi) {
      const options = el('div', { class: 'option-list', id: 'group-' + field.id, 'aria-describedby': described });
      field.options.forEach((value, i) => {
        const input = el('input', { type: field.type === 'checkboxes' ? 'checkbox' : 'radio', name: field.id, id: field.id + '-' + i, value, 'aria-describedby': described });
        input.checked = field.type === 'checkboxes' ? (answers[field.id] || []).includes(value) : answers[field.id] === value;
        if (field.required) input.setAttribute('aria-required', 'true');
        const option = el('label', { class: 'option', htmlFor: input.id }); option.append(input, el('span', {}, value)); options.append(option); input.addEventListener('change', () => changed(field, input));
      }); group.append(options); wrapper.append(group);
    } else {
      const input = el(field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input', { id: field.id, name: field.id, 'aria-describedby': described });
      if (field.type === 'select') { input.append(el('option', { value: '' }, 'Elige una opción')); field.options.forEach(v => input.append(el('option', { value: v }, v))); }
      else { if (field.type !== 'textarea') input.type = field.type; input.maxLength = limit(field); if (field.placeholder) input.placeholder = field.placeholder; input.autocomplete = 'off'; }
      input.value = answers[field.id] || ''; if (field.required) input.setAttribute('aria-required', 'true');
      group.append(input); input.addEventListener(field.type === 'select' ? 'change' : 'input', () => changed(field, input));
    }
    wrapper.append(el('p', { class: 'field-help', id: 'help-' + field.id }, field.help || ''), el('p', { class: 'error-text', id: 'error-' + field.id, hidden: true })); return wrapper;
  }
  function showErrors(errors) {
    summary.replaceChildren(el('strong', {}, 'Falta alguna respuesta breve:'));
    const list = el('ul'); errors.forEach(({ field, message, index }) => {
      const item = el('li'), link = el('button', { type: 'button' }, field.label);
      link.addEventListener('click', () => { if (index !== undefined && index !== current) go(index); const first = document.querySelector(`#field-${field.id} input,#field-${field.id} textarea,#field-${field.id} select`); if (first) first.focus(); }); item.append(link); list.append(item);
      const msg = $('error-' + field.id); if (msg) { msg.hidden = false; msg.textContent = message; content.querySelectorAll(`[name="${field.id}"],#group-${field.id}`).forEach(n => n.setAttribute('aria-invalid', 'true')); }
    }); summary.append(list); summary.hidden = false; summary.focus();
  }
  function go(index, focus = true) {
    if (cvBusy) return;
    current = Math.max(0, Math.min(steps.length, index)); render(); save();
    if (focus) { $('step-title').focus({ preventScroll: true }); document.querySelector('.workspace').scrollIntoView({ block: 'start', behavior: 'auto' }); }
  }
  function render() {
    content.replaceChildren(); summary.hidden = true; updateNav();
    const heading = el('div', { class: 'step-heading' });
    heading.append(el('span', { class: 'eyebrow' }, names[persona] + ' · ' + (current === steps.length ? 'Tu resumen' : `Paso ${current + 1}`)), el('h2', { id: 'step-title', tabindex: '-1' }, current === steps.length ? names[persona] + ', revisa tus respuestas' : steps[current].title));
    heading.append(el('p', {}, current === steps.length ? 'Comprueba que reflejan tu experiencia. Tu socio enviará su propio cuestionario.' : steps[current].intro));
    if (current < steps.length) heading.append(el('span', { class: 'required-note' }, '* Necesario. El resto puedes dejarlo en blanco.'));
    content.append(heading); $('previous').hidden = current === 0; $('next').hidden = current === steps.length; $('next').disabled = cvBusy;
    $('next').textContent = current === steps.length - 1 ? 'Revisar mis respuestas' : 'Continuar';
    if (current === steps.length) renderReview(); else { steps[current].fields.forEach(f => content.append(renderField(f))); cvStatus(); }
  }
  function fullText() {
    const lines = ['CUESTIONARIO INDIVIDUAL L&L — ' + names[persona].toUpperCase(), 'Responde: ' + names[persona] + '. Mi experiencia y mi opinión personal.', 'Para el programador. Mi socio responde por separado.', ''];
    steps.forEach((step, i) => { lines.push(`${i + 1}. ${step.title.toUpperCase()}`); step.fields.forEach(f => lines.push(`${f.label}: ${displayValue(f) || 'Sin indicar'}`)); lines.push(''); });
    if (cvFile) lines.push('IMPORTANTE: el texto no contiene el CV. Se entrega como archivo aparte o dentro del ZIP.');
    return lines.join('\n').trim();
  }
  function chunksOf(text) {
    const chunks = []; let chunk = '';
    for (const char of text) { if (chunk && encodeURIComponent(chunk + char).length > 4800) { chunks.push(chunk); chunk = ''; } chunk += char; }
    if (chunk) chunks.push(chunk); return chunks;
  }
  function download(name, type, value) {
    const blob = value instanceof Blob ? value : new Blob([value], { type });
    const url = URL.createObjectURL(blob), a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filename = ext => 'respuestas-lyl-' + persona + '-' + new Date().toISOString().slice(0, 10) + '.' + ext;
  function readyToSend() { const errors = allErrors(); if (errors.length) { showErrors(errors); return false; } return !cvBusy; }
  function renderReview() {
    const missing = allErrors(); if (missing.length) content.append(el('p', { class: 'review-missing' }, `Faltan ${missing.length} respuestas. Puedes editar los apartados indicados.`));
    steps.forEach((step, index) => {
      const block = el('section', { class: 'review-section' }), title = el('h3', {}, step.title);
      const edit = el('button', { class: 'text-button', type: 'button', 'aria-label': 'Editar: ' + step.title }, 'Editar'); edit.addEventListener('click', () => go(index)); title.append(edit); block.append(title);
      const dl = el('dl'); step.fields.forEach(f => { const value = displayValue(f); dl.append(el('dt', {}, f.label), el('dd', { class: value ? '' : 'unanswered' }, value || 'Sin indicar')); }); block.append(dl); content.append(block);
    });
    const box = el('section', { class: 'delivery', id: 'delivery' }); box.append(el('h3', {}, 'Enviar mi cuestionario'));
    box.append(el('p', {}, recipient ? 'Tu programador · WhatsApp +' + recipient : 'Selecciona el contacto de tu programador en WhatsApp o al compartir.'));
    const status = el('div', { class: 'delivery-status', id: 'delivery-status', role: 'status', 'aria-live': 'polite' });
    const share = el('button', { type: 'button', class: 'button primary', id: 'share-file' }, cvFile ? 'Compartir respuestas + CV' : 'Compartir mis respuestas');
    const packageButton = el('button', { type: 'button', class: 'button secondary', id: 'download-package' }, 'Descargar respuestas + CV (.zip)');
    async function packageDownload() {
      if (!readyToSend() || !cvFile) return;
      const text = fullText(), file = cvFile, txtName = filename('txt'), zipName = filename('zip');
      packageButton.disabled = true; share.disabled = true;
      try { const zip = await window.LYLCV.packageAnswers(text, txtName, file); download(zipName, 'application/zip', zip); status.textContent = 'ZIP descargado con tus respuestas y tu CV. Abre el chat de tu programador, adjunta el ZIP como documento y pulsa Enviar.'; }
      catch (_) { status.textContent = 'No se ha podido preparar el ZIP. Descarga las respuestas y adjunta también el CV original desde tu dispositivo en WhatsApp.'; }
      finally { packageButton.disabled = false; share.disabled = false; }
    }
    share.addEventListener('click', async () => {
      if (!readyToSend()) return;
      const text = fullText(), file = new File([text], filename('txt'), { type: 'text/plain' }), files = cvFile ? [file, cvFile] : [file];
      try {
        // No awaited file read before share: keep the click's user activation.
        if (navigator.share && navigator.canShare && navigator.canShare({ files })) await navigator.share({ files, title: 'Cuestionario individual de ' + names[persona] + ' · L&L' });
        else if (cvFile) { await packageDownload(); return; }
        else if (navigator.share) await navigator.share({ title: 'Cuestionario de ' + names[persona], text });
        else { download(filename('txt'), 'text/plain;charset=utf-8', text); status.textContent = 'Respuestas descargadas. Adjunta el archivo al chat de tu programador y pulsa Enviar.'; return; }
        status.textContent = 'Comprueba en la aplicación elegida que has enviado los archivos al programador. Abrir el selector no confirma la recepción.';
      } catch (error) { status.textContent = error.name === 'AbortError' ? 'Has cancelado el selector. Tus respuestas y tu CV siguen aquí.' : 'No se ha podido compartir. Usa la descarga y adjunta el archivo en WhatsApp.'; }
    });
    box.append(share, el('p', { class: 'field-help' }, cvFile ? 'Elige WhatsApp y el contacto del programador. Si tu navegador no permite compartir ambos archivos, se descargará un ZIP con los dos para adjuntarlo al chat.' : 'Elige WhatsApp y el contacto del programador; después confirma el envío allí.'));
    if (cvFile) { packageButton.addEventListener('click', packageDownload); box.append(packageButton); }
    box.append(el('h4', {}, 'O enviar las respuestas como mensaje'));
    if (cvFile) box.append(el('p', { class: 'attachment-reminder' }, 'Estos botones envían solo texto. Para incluir el CV, adjúntalo después en WhatsApp con el icono del clip → Documento.'));
    const chunks = chunksOf(fullText()), links = el('div', { class: 'delivery-actions' });
    if (chunks.length > 1) box.append(el('p', {}, `El mensaje ocupa ${chunks.length} partes. Envía todas o utiliza el archivo completo de arriba.`));
    chunks.forEach((chunk, i) => {
      const message = chunks.length > 1 ? `L&L · ${names[persona]} · Parte ${i + 1} de ${chunks.length}\n` + chunk : chunk;
      const link = el('a', { class: 'button secondary', href: 'https://wa.me/' + recipient + '?text=' + encodeURIComponent(message), target: '_blank', rel: 'noopener noreferrer', 'data-part': String(i + 1) }, chunks.length === 1 ? 'Abrir WhatsApp con mis respuestas' : `Abrir WhatsApp · parte ${i + 1} de ${chunks.length}`);
      link.addEventListener('click', e => { if (!readyToSend()) { e.preventDefault(); return; } save(); link.dataset.opened = 'true'; status.textContent = `Parte ${i + 1} abierta. Pulsa Enviar en WhatsApp.` + (chunks.length > 1 ? ' Después vuelve para enviar las demás partes.' : '') + (cvFile ? ' Recuerda adjuntar el CV; el mensaje solo contiene texto.' : ''); }); links.append(link);
    }); box.append(links);
    const alternatives = el('div', { class: 'secondary-delivery' });
    const copy = el('button', { type: 'button', class: 'button secondary', id: 'copy-all' }, 'Copiar texto');
    copy.addEventListener('click', async () => {
      if (!readyToSend()) return;
      try { await navigator.clipboard.writeText(fullText()); status.textContent = 'Respuestas copiadas. Pégalas y envíalas al programador.' + (cvFile ? ' Adjunta también el CV como documento.' : ''); }
      catch (_) { let area = $('copy-fallback'); if (!area) { area = el('textarea', { id: 'copy-fallback', class: 'copy-fallback', readonly: true, 'aria-label': 'Respuestas para copiar' }); box.append(area); } area.value = fullText(); area.focus(); area.select(); status.textContent = 'Copia el texto y pégalo en WhatsApp.'; }
    });
    const saveText = el('button', { type: 'button', class: 'button secondary', id: 'download-text' }, 'Descargar solo respuestas');
    saveText.addEventListener('click', () => { if (!readyToSend()) return; download(filename('txt'), 'text/plain;charset=utf-8', fullText()); status.textContent = 'Respuestas descargadas; aún no se han enviado.' + (cvFile ? ' El CV se adjunta por separado o con el ZIP.' : ' Adjunta el archivo en WhatsApp.'); });
    alternatives.append(copy, saveText); box.append(alternatives, status, el('p', { class: 'receipt' }, 'Tu borrador se conserva. Cuando el programador confirme la recepción, puedes borrarlo de este dispositivo.')); content.append(box);
  }
  form.addEventListener('submit', event => { event.preventDefault(); if (current < steps.length && !cvBusy) { const errors = errorsIn(current); if (errors.length) showErrors(errors); else go(current + 1); } });
  $('previous').addEventListener('click', () => go(current - 1));
  ['luis', 'lino'].forEach(who => $('choose-' + who).addEventListener('click', () => activate(who)));
  $('change-persona').addEventListener('click', () => activate(''));
  document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); if (persona) go(0); else $('identity-title').focus(); });
  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); (persona ? $('step-title') : $('identity-title')).focus(); });
  document.querySelectorAll('a[href="estudio.html"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  $('backup').addEventListener('click', () => { save(); download(filename('json'), 'application/json', JSON.stringify(snapshot(), null, 2)); feedback.textContent = 'Copia de ' + names[persona] + ' guardada. Contiene las respuestas, no el CV. Conserva también tu archivo original.'; });
  const restoreInput = $('restore-file');
  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files[0], owner = persona; restoreInput.value = ''; if (!file) return;
    try {
      if (file.size > 200000) throw new Error('El archivo es demasiado grande.');
      const data = JSON.parse(await file.text()); if (persona !== owner) return;
      if (data.persona && data.persona !== persona) throw new Error('Esta copia pertenece a otra persona. Cambia al nombre correcto para recuperarla.');
      if (!validDraft(data)) throw new Error('La copia no corresponde a este cuestionario individual.');
      pendingRestore = { persona, answers: sanitize(data.answers), step: Number.isInteger(data.step) ? Math.max(0, Math.min(steps.length, data.step)) : 0 }; $('replace-dialog').showModal();
    } catch (error) { feedback.textContent = 'No se ha recuperado la copia. ' + (error instanceof SyntaxError ? 'El formato no es válido.' : error.message); }
  });
  $('cancel-restore').addEventListener('click', () => { pendingRestore = null; $('replace-dialog').close(); });
  $('confirm-restore').addEventListener('click', () => { if (pendingRestore && pendingRestore.persona === persona) { answers = pendingRestore.answers; current = pendingRestore.step; pendingRestore = null; render(); save(); feedback.textContent = 'Respuestas recuperadas. El CV actual se conserva; si no está adjunto, selecciónalo de nuevo.'; } $('replace-dialog').close(); });
  $('clear').addEventListener('click', () => { $('clear-title').textContent = '¿Borrar el borrador de ' + names[persona] + '?'; $('clear-dialog').showModal(); });
  $('cancel-clear').addEventListener('click', () => $('clear-dialog').close());
  $('confirm-clear').addEventListener('click', async () => {
    const owner = persona, draftKey = key(); $('confirm-clear').disabled = true; let cvRemoved = false, removed = false;
    try { await window.LYLCV.remove(owner); cvRemoved = true; } catch (_) { /* Report incomplete deletion instead of claiming success. */ }
    try { localStorage.removeItem(draftKey); removed = localStorage.getItem(draftKey) === null; } catch (_) { /* Keep truthful status below. */ }
    if (persona === owner) {
      generation++; answers = Object.create(null); current = 0; if (cvRemoved) { cvFile = null; cvPersisted = false; } cvNotice = ''; setBusy(false); render(); $('draft-state').textContent = 'Borrador vacío';
      feedback.textContent = removed && cvRemoved ? 'Borrador y CV de ' + names[owner] + ' borrados de este navegador.' : 'No se ha podido confirmar el borrado completo. Elimina los datos de este sitio desde los ajustes del navegador. Las copias descargadas se borran por separado.';
    }
    $('confirm-clear').disabled = false; $('clear-dialog').close();
  });
  async function syncExternal(value) {
    if (!persona) return;
    if (cvBusy) { queuedExternal = true; return; }
    try {
      const data = value === null ? null : JSON.parse(value); if (data && !validDraft(data)) return;
      const token = ++generation; answers = data ? sanitize(data.answers) : Object.create(null); current = data && Number.isInteger(data.step) ? Math.max(0, Math.min(steps.length, data.step)) : 0;
      setBusy(true); form.inert = true; await readCV(data && data.attachment, token); if (token !== generation) return;
      setBusy(false); form.inert = false; render(); $('draft-state').textContent = data ? 'Borrador actualizado' : 'Borrador vacío'; feedback.textContent = 'Tu borrador se ha actualizado desde otra pestaña.';
    } catch (_) { /* Ignore unrelated or malformed storage. */ }
  }
  window.addEventListener('storage', event => { if (persona && (event.key === key() || event.key === null)) syncExternal(event.newValue); });
  window.addEventListener('pageshow', event => { if (event.persisted && persona) { try { syncExternal(localStorage.getItem(key())); } catch (_) {} } });
  window.addEventListener('hashchange', () => { const requested = new URLSearchParams(location.hash.slice(1)).get('persona') || ''; if (requested !== persona) activate(requested); });
  try {
    const legacy = localStorage.getItem('lyl-briefing-v1');
    if (legacy) { $('legacy-notice').hidden = false; $('download-legacy').addEventListener('click', () => download('respuestas-lyl-anteriores.json', 'application/json', legacy)); }
  } catch (_) { /* Storage can be unavailable. */ }
  activate(params.get('persona') || '');
})();
