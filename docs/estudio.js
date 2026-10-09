'use strict';
// Fragment navigation can focus a whole panel. Show its ring only for keyboard use.
document.addEventListener('keydown', event => {
  if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) document.documentElement.classList.add('keyboard-navigation');
}, true);
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-navigation'), true);
const buttons=[...document.querySelectorAll('[data-tab]')];
function showTab(id,focus=false){if(!document.getElementById('tab-'+id))id='decision';buttons.forEach(b=>{const active=b.dataset.tab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;document.getElementById(b.dataset.tab).hidden=!active;if(active&&focus)b.focus()});try{history.replaceState(null,'','#'+id)}catch(_){} }
buttons.forEach((b,i)=>{b.addEventListener('click',()=>showTab(b.dataset.tab));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%buttons.length;if(e.key==='ArrowLeft')n=(i-1+buttons.length)%buttons.length;if(e.key==='Home')n=0;if(e.key==='End')n=buttons.length-1;if(n!==undefined){e.preventDefault();showTab(buttons[n].dataset.tab,true)}})});
showTab(location.hash.slice(1)||'decision');window.addEventListener('hashchange',()=>showTab(location.hash.slice(1)));
const tasks=[...document.querySelectorAll('[data-task]')],key='lyl-plan-20261009-v1';let state={};try{state=JSON.parse(localStorage.getItem(key)||'{}');if(!state||Array.isArray(state)||typeof state!=='object')state={}}catch(_){state={}}
function updateTasks(){const n=tasks.filter(t=>t.checked).length;document.getElementById('progress').value=n;document.getElementById('progress-label').textContent=n+' de '+tasks.length;try{localStorage.setItem(key,JSON.stringify(Object.fromEntries(tasks.map(t=>[t.dataset.task,t.checked]))))}catch(_){document.getElementById('storage-note').textContent='El navegador no permite guardar las casillas: se conservarán solo mientras esta página esté abierta.'}}
tasks.forEach(t=>{t.checked=state[t.dataset.task]===true;t.addEventListener('change',updateTasks)});updateTasks();document.getElementById('reset-tasks').addEventListener('click',()=>{tasks.forEach(t=>t.checked=false);updateTasks()});
const euro=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);const dec=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n);
function calc(){const ids=['invoice','materials','travelcost','people','onsite','traveltime','admin','target'];let values={};let valid=true;ids.forEach(id=>{const el=document.getElementById(id);el.setAttribute('aria-invalid',String(!el.validity.valid||el.value===''));if(!el.validity.valid||el.value==='')valid=false;values[id]=Number(el.value)});const o=id=>document.getElementById(id);if(!valid){['out-hours','out-available','out-rate','out-min'].forEach(id=>o(id).textContent='—');o('out-verdict').textContent='Revisa los valores: usa importes y horas no negativos y una o dos personas.';return}const hours=values.people*(values.onsite+values.traveltime)+values.admin;const available=values.invoice-values.materials-values.travelcost;const minimum=values.materials+values.travelcost+hours*values.target;o('out-hours').textContent=dec(hours)+' horas-persona';o('out-available').textContent=euro(available);o('out-rate').textContent=hours>0?euro(available/hours):'Sin horas para calcular';o('out-min').textContent=euro(minimum);o('out-verdict').textContent=hours===0?'Añade el tiempo real del equipo para evaluar el encargo.':values.invoice<minimum?'El importe del ejemplo queda '+euro(minimum-values.invoice)+' por debajo del objetivo.':'El importe cubre el objetivo de este ejemplo; no demuestra beneficio neto real.'}
document.getElementById('calculator').addEventListener('input',calc);document.getElementById('calculator').addEventListener('submit',e=>e.preventDefault());document.getElementById('reset-calc').addEventListener('click',()=>{document.getElementById('calculator').reset();calc()});calc();
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{const text=document.getElementById(b.dataset.copy).textContent;const status=b.nextElementSibling;try{await navigator.clipboard.writeText(text);status.textContent='Copiado'}catch(_){const range=document.createRange();range.selectNodeContents(document.getElementById(b.dataset.copy));const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);status.textContent='Texto seleccionado. Usa Ctrl+C o copiar.'}}));
let opened=[];window.addEventListener('beforeprint',()=>{opened=[...document.querySelectorAll('details')].filter(d=>!d.open);opened.forEach(d=>d.open=true)});window.addEventListener('afterprint',()=>opened.forEach(d=>d.open=false));document.getElementById('print').addEventListener('click',()=>window.print());

// The economic model is isolated from the personal questionnaires and their drafts.
(() => {
  const model = window.LYLEconomics;
  const form = document.getElementById('profit-form');
  if (!model || !form) return;
  const storageKey = 'lyl-study-economics-v1';
  const names = Object.keys(model.bounds);
  const currency = value => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  const number = value => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value);
  const byId = id => document.getElementById(id);
  let storageAvailable = true;
  const status = document.createElement('p');
  status.className = 'tiny'; status.id = 'profit-storage'; status.setAttribute('role', 'status'); form.append(status);
  function read() { return Object.fromEntries(names.map(name => [name, Number(byId('profit-' + name).value)])); }
  function fill(values) { names.forEach(name => { byId('profit-' + name).value = values[name]; }); }
  function render(persist = true) {
    const values = read();
    const invalid = names.filter(name => { const field = byId('profit-' + name); const bad = field.value === '' || !field.validity.valid; field.setAttribute('aria-invalid', String(bad)); return bad; });
    const result = model.calculate(values);
    const error = byId('profit-error');
    if (invalid.length || !result.valid) {
      error.hidden = false; error.textContent = 'Revisa los campos marcados: no pueden quedar vacíos ni superar los límites indicados. La ocupación debe estar entre 0 y 100 % y la tarifa ser mayor que cero.';
      byId('profit-output').hidden = true;
      status.textContent = 'Estos valores incompletos no se han guardado.';
      return;
    }
    error.hidden = true; byId('profit-output').hidden = false;
    const preset = model.scenarios.find(s => names.every(name => values[name] === s[name]));
    document.querySelectorAll('[data-scenario]').forEach(button => button.setAttribute('aria-pressed', String(!!preset && button.dataset.scenario === preset.id)));
    byId('profit-description').textContent = preset ? preset.description : 'Tu escenario personalizado. Sigue siendo una simulación: verifica demanda, precios aceptados y costes reales.';
    const output = { ...result, materialCost: values.materials, fixed: values.fixed };
    const hours = new Set(['capacity', 'billable', 'nonBillable', 'breakEvenHours']);
    byId('profit-output').querySelectorAll('[data-profit]').forEach(node => {
      const name = node.dataset.profit, value = output[name];
      if (name === 'requiredRate') node.textContent = value === null ? 'No calculable sin horas facturables' : currency(value) + '/hora-persona';
      else if (name === 'requiredUtilization') node.textContent = number(value) + ' %';
      else node.textContent = hours.has(name) ? number(value) + ' h' : currency(value);
    });
    byId('hours-billable').style.width = values.utilization + '%';
    byId('hours-other').style.width = (100 - values.utilization) + '%';
    byId('hours-caption').textContent = number(result.billable) + ' horas-persona facturables y ' + number(result.nonBillable) + ' para el resto, por mes activo.';
    let verdict;
    if (result.annualBeforeIRPF < 0) verdict = 'Este escenario deja pérdidas de caja antes del IRPF. No produce una remuneración positiva para los socios.';
    else if (result.requiredUtilization > 100) verdict = 'Con esta tarifa, el objetivo exigiría más horas que las disponibles. Hay que cambiar precio, costes u objetivo; ampliar la ocupación no basta.';
    else if (result.requiredUtilization > 80) verdict = 'El objetivo exige una ocupación muy alta. Deja poco espacio para viajes, captación e imprevistos; valida la agenda antes de asumirlo.';
    else verdict = 'El objetivo encaja en la capacidad matemática de este escenario. Falta comprobar que llegan y se cobran suficientes encargos a esa tarifa.';
    byId('profit-verdict').textContent = verdict + ' El umbral de gastos no incluye una remuneración objetivo: alcanzarlo no significa que los socios ya ganen dinero.';
    if (persist) { try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, values })); storageAvailable = true; } catch (_) { storageAvailable = false; } }
    status.textContent = storageAvailable ? 'Escenario guardado solo en este navegador. No modifica las respuestas de Luis ni de Lino.' : 'El navegador no permite guardar este escenario; puedes usarlo mientras la página siga abierta.';
  }
  let restored = false;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored && stored.version === 1 && model.calculate(stored.values).valid) { fill(stored.values); restored = true; }
  } catch (_) { storageAvailable = false; }
  if (!restored) fill(model.scenarios.find(s => s.id === 'base'));
  form.addEventListener('input', () => render());
  form.addEventListener('submit', event => event.preventDefault());
  document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => { const preset = model.scenarios.find(s => s.id === button.dataset.scenario); if (preset) { fill(preset); render(); } }));
  byId('profit-reset').addEventListener('click', () => { fill(model.scenarios.find(s => s.id === 'base')); render(); });
  render();
})();

// Surface quotations use total job hours and their own local draft.
(() => {
  const model = window.LYLSurface;
  const form = document.getElementById('surface-form');
  if (!model || !form) return;
  const key = 'lyl-study-surface-v1';
  const names = Object.keys(model.bounds);
  const byId = id => document.getElementById(id);
  const status = byId('surface-storage');
  let storageAvailable = true;
  function fill(values) { names.forEach(name => { byId('surface-' + name).value = values[name]; }); }
  function render() {
    const values = Object.fromEntries(names.map(name => [name, Number(byId('surface-' + name).value)]));
    const invalid = names.filter(name => {
      const field = byId('surface-' + name);
      const bad = field.value === '' || !field.validity.valid;
      field.setAttribute('aria-invalid', String(bad));
      return bad;
    });
    const result = model.calculate(values);
    const error = byId('surface-error');
    if (invalid.length || !result.valid) {
      byId('surface-output').hidden = true;
      error.hidden = false;
      error.textContent = 'Completa los campos dentro de sus límites. La superficie y el precio deben ser mayores que cero, y al menos uno de los dos debe tener horas de trabajo.';
      if (result.errors?.includes('personHours')) ['luisHours', 'linoHours'].forEach(name => byId('surface-' + name).setAttribute('aria-invalid', 'true'));
      status.textContent = 'Los valores incompletos no sustituyen el último ejemplo guardado.';
      return;
    }
    error.hidden = true;
    byId('surface-output').hidden = false;
    byId('surface-output').querySelectorAll('[data-surface]').forEach(node => {
      const name = node.dataset.surface;
      node.textContent = name === 'personHours' ? dec(result[name]) + ' h' : euro(result[name]) + (name === 'quotedMinimumRate' ? '/m²' : name === 'perHour' ? '/h' : '');
    });
    const explanation = result.contribution < 0
      ? 'El presupuesto no cubre ni los costes directos del encargo.'
      : result.shortfall > 0.005
        ? 'Faltan ' + euro(result.shortfall) + ' sin IVA para alcanzar el objetivo indicado.'
        : 'El presupuesto alcanza el objetivo indicado por hora-persona total.';
    byId('surface-verdict').textContent = explanation + ' Revisa las horas y el alcance antes de comprometer el precio.';
    try { localStorage.setItem(key, JSON.stringify({ version: 1, values })); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    status.textContent = storageAvailable
      ? 'Ejemplo guardado solo en este navegador. No modifica los cuestionarios ni el escenario mensual.'
      : 'El navegador no permite guardar el ejemplo; solo se conserva mientras esta página siga abierta.';
  }
  let restored = false;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored?.version === 1 && model.calculate(stored.values).valid) { fill(stored.values); restored = true; }
  } catch (_) { storageAvailable = false; }
  if (!restored) fill(model.defaults);
  form.addEventListener('input', render);
  form.addEventListener('submit', event => event.preventDefault());
  byId('surface-reset').addEventListener('click', () => { fill(model.defaults); render(); });
  render();
})();
