/* Aplicación estática: las respuestas permanecen en el navegador hasta compartir. */
(() => {
  'use strict';
  const model = window.LYL_QUESTIONS;
  if (!model || !Array.isArray(model.steps)) return;
  const steps = model.steps;
  const fields = steps.flatMap(s => s.fields);
  const byId = new Map(fields.map(f => [f.id, f]));
  const key = 'lyl-briefing-v1';
  const form = document.getElementById('questionnaire');
  const content = document.getElementById('step-content');
  const feedback = document.getElementById('feedback');
  const summary = document.getElementById('validation-summary');
  const MAX_ENCODED = 4800;
  const shortLabels = {
    nombre_publico:'Nombre comercial', persona_contacto:'Responsable', telefono_coordinacion:'Tel. coordinación', email_coordinacion:'Correo coordinación', municipio_base:'Base',
    zonas_prioritarias:'Zonas', desplazamiento_maximo:'Viaje por trayecto', politica_desplazamiento:'Desplazamientos', clientes_preferidos:'Clientes deseados',
    servicios_dominados:'Servicios', servicios_prioritarios:'Trabajos prioritarios', servicios_excluidos:'Exclusiones', experiencia:'Experiencia', acreditaciones:'Formación/seguro', equipo_medios:'Medios',
    fotos_disponibles:'Fotos', material_disponible:'Otros materiales', resenas_casos:'Reseñas/casos', permisos_material:'Permisos de publicación',
    capacidad_semanal:'Capacidad', horarios:'Horarios', gestion_consultas:'Atención de consultas', objetivo_90_dias:'Objetivo 90 días', precios_costes:'Importes/costes',
    canales_actuales:'Captación actual', enlaces_publicos:'Perfiles', perfil_google:'Google Maps', dominio_estado:'Dominio', dominio_detalle:'Detalle de dominio',
    estilo_web:'Estilo', referencias_web:'Referencias', diferencia_real:'Por qué recomendar L&L', contacto_preferido:'Contacto preferido', contacto_publico:'Contacto autorizado para publicar'
  };
  // El destino solo puede venir en el enlace que comparte el programador.
  // No se guarda en el repositorio, en el borrador ni en un servidor.
  const params = new URLSearchParams(location.hash.slice(1));
  const contactInput = (params.get('contacto') || '').replace(/^\+/, '');
  const recipient = /^[1-9]\d{7,14}$/.test(contactInput) ? contactInput : '';
  const invalidRecipient = params.has('contacto') && !recipient;
  const originalLink = recipient ? './#contacto=' + recipient : './';
  document.querySelector('.brand').href = originalLink;
  document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();document.getElementById('step-title').focus();form.scrollIntoView({block:'start'})});
  document.querySelectorAll('a[href="estudio.html"]').forEach(a => {a.target='_blank';a.rel='noopener noreferrer'});
  if (invalidRecipient) feedback.textContent='El enlace no contiene un WhatsApp válido. Al terminar podréis compartir el archivo o elegir el contacto del programador en WhatsApp.';
  let current = 0;
  let answers = Object.create(null);
  let pendingRestore = null;
  const uncertain = value => /^(No lo sé|No tenemos más|Todavía no recibimos|Aún debemos)/i.test(value);
  const limit = field => field.type==='textarea' ? 1000 : field.type==='tel' ? 35 : field.type==='email' ? 180 : 240;
  function sanitize(raw) {
    const clean = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const field of fields) {
      const value = raw[field.id];
      if (field.type==='checkboxes') {
        if (Array.isArray(value)) {
          const selected = [...new Set(value.filter(v=>typeof v==='string' && field.options.includes(v)))];
          clean[field.id] = selected.some(uncertain) ? [selected.find(uncertain)] : selected;
        }
      } else if (typeof value==='string') {
        if (field.options && !field.options.includes(value)) continue;
        clean[field.id] = Array.from(value.slice(0,limit(field))).map(c=>c.length===1&&/[\uD800-\uDFFF]/.test(c)?'\uFFFD':c).join('');
      }
    }
    return clean;
  }
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && stored.app==='lyl-briefing' && stored.version===model.version) {
      answers=sanitize(stored.answers);
      current=Number.isInteger(stored.step) ? Math.max(0,Math.min(steps.length,stored.step)) : 0;
    }
  } catch (_) { /* Un borrador dañado no impide completar un cuestionario nuevo. */ }
  function el(tag,props={},text) {
    const node=document.createElement(tag);
    Object.entries(props).forEach(([k,v])=>{if(k==='class')node.className=v;else if(k==='htmlFor')node.htmlFor=v;else node.setAttribute(k,String(v))});
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function snapshot(){return {app:'lyl-briefing',version:model.version,savedAt:new Date().toISOString(),step:current,answers}}
  function save() {
    try {localStorage.setItem(key,JSON.stringify(snapshot()));document.getElementById('draft-state').textContent='Borrador guardado';document.getElementById('storage-warning').hidden=true}
    catch(_){document.getElementById('draft-state').textContent='Sin guardado automático';const warning=document.getElementById('storage-warning');warning.hidden=false;warning.textContent='Este navegador no permite guardar el borrador. Antes de salir, usa «Guardar copia del borrador» para conservar tus respuestas.'}
  }
  function displayValue(field) {
    const value=answers[field.id];
    return Array.isArray(value)?value.join('; '):typeof value==='string'?value.trim():'';
  }
  function errorFor(field) {
    const value=displayValue(field);
    if(field.required&&!value)return 'Completa esta respuesta o indica que está pendiente.';
    if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return 'Escribe un correo válido o deja el campo vacío.';
    if(field.type==='tel'&&value&&(value.replace(/\D/g,'').length<7 || /[^\d+\s().-]/.test(value)))return 'Revisa el teléfono o deja el campo vacío.';
    if(field.type==='url'&&value){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return 'Escribe un enlace http o https válido.'}catch(_){return 'Escribe un enlace completo o deja el campo vacío.'}}
    return '';
  }
  function errorsIn(index){return steps[index].fields.map(field=>({field,message:errorFor(field)})).filter(x=>x.message)}
  function allErrors(){return steps.flatMap((step,index)=>errorsIn(index).map(e=>({...e,index})))}
  function updateNav() {
    const list=el('ol',{class:'step-list'});
    const names=[...steps.map(s=>s.title),'Revisar y enviar'];
    names.forEach((name,i)=>{
      const li=el('li');const complete=i<steps.length && errorsIn(i).length===0;
      const b=el('button',{type:'button',class:'step-link'+(complete?' completed':'')});
      if(i===current)b.setAttribute('aria-current','step');
      b.append(el('span',{class:'step-number'},String(i+1)),el('span',{},name));b.addEventListener('click',()=>go(i));li.append(b);list.append(li);
    });document.getElementById('step-nav').replaceChildren(list);
    document.getElementById('step-position').textContent=current===steps.length?'Último paso · Revisar y enviar':`Paso ${current+1} de ${steps.length+1}`;
    const progress=document.getElementById('progress');progress.max=steps.length+1;progress.value=current+1;
  }
  function changed(field,node) {
    if(field.type==='checkboxes'){
      let selection=[...content.querySelectorAll(`input[name="${field.id}"]:checked`)].map(n=>n.value);
      if(node.checked&&uncertain(node.value))selection=[node.value];
      else if(node.checked)selection=selection.filter(v=>!uncertain(v));
      content.querySelectorAll(`input[name="${field.id}"]`).forEach(n=>{n.checked=selection.includes(n.value)});answers[field.id]=selection;
    } else {answers[field.id]=node.value}
    save();
    const error=document.getElementById('error-'+field.id);
    if(error){error.hidden=true;error.textContent=''}
    content.querySelectorAll(`[name="${field.id}"],#group-${field.id}`).forEach(n=>n.removeAttribute('aria-invalid'));
    summary.hidden=true;
  }
  function renderField(field) {
    const wrapper=el('div',{class:'field',id:'field-'+field.id});
    const multi=['checkboxes','radio'].includes(field.type);
    const group=multi?el('fieldset'):wrapper;
    const label=el(multi?'legend':'label',{class:'field-label',...(multi?{}:{htmlFor:field.id})},field.label+' ');
    label.append(el('span',{class:field.required?'required-mark':'optional'},field.required?'*':'(opcional)'));
    group.append(label);
    const described=['help-'+field.id,'error-'+field.id].join(' ');
    if(multi){
      const options=el('div',{class:'option-list',id:'group-'+field.id,'aria-describedby':described});
      field.options.forEach((value,i)=>{
        const input=el('input',{type:field.type==='checkboxes'?'checkbox':'radio',name:field.id,id:field.id+'-'+i,value,'aria-describedby':described});
        input.checked=field.type==='checkboxes'?(answers[field.id]||[]).includes(value):answers[field.id]===value;
        if(field.required)input.setAttribute('aria-required','true');
        const option=el('label',{class:'option',htmlFor:input.id});option.append(input,el('span',{},value));options.append(option);input.addEventListener('change',()=>changed(field,input));
      });group.append(options);wrapper.append(group);
    } else {
      const input=el(field.type==='textarea'?'textarea':field.type==='select'?'select':'input',{id:field.id,name:field.id,'aria-describedby':described});
      if(field.type==='select'){
        input.append(el('option',{value:''},'Selecciona una opción'));
        field.options.forEach(v=>input.append(el('option',{value:v},v)));
      }else{
        if(field.type!=='textarea')input.type=field.type;
        input.maxLength=limit(field);if(field.placeholder)input.placeholder=field.placeholder;
        if(field.type==='email')input.autocomplete='email';else if(field.type==='tel')input.autocomplete='tel';else input.autocomplete='off';
      }
      input.value=answers[field.id]||'';
      if(field.required)input.setAttribute('aria-required','true');
      group.append(input);input.addEventListener(field.type==='select'?'change':'input',()=>changed(field,input));
    }
    wrapper.append(el('p',{class:'field-help',id:'help-'+field.id},field.help||''),el('p',{class:'error-text',id:'error-'+field.id,hidden:true}));
    return wrapper;
  }
  function showErrors(errors){
    summary.replaceChildren(el('strong',{},'Revisa estas respuestas para continuar:'));
    const list=el('ul');errors.forEach(({field,message,index})=>{
      const item=el('li');const link=el('button',{type:'button'},field.label);
      link.addEventListener('click',()=>{if(index!==undefined&&index!==current)go(index);const first=document.querySelector(`#field-${field.id} input,#field-${field.id} textarea,#field-${field.id} select`);if(first)first.focus()});item.append(link);list.append(item);
      const msg=document.getElementById('error-'+field.id);if(msg){msg.hidden=false;msg.textContent=message;content.querySelectorAll(`[name="${field.id}"],#group-${field.id}`).forEach(n=>n.setAttribute('aria-invalid','true'))}
    });summary.append(list);summary.hidden=false;summary.focus();
  }
  function go(index,focus=true){save();current=Math.max(0,Math.min(steps.length,index));render();save();if(focus){document.getElementById('step-title').focus({preventScroll:true});document.querySelector('.workspace').scrollIntoView({block:'start',behavior:'auto'})}}
  function render(){
    content.replaceChildren();summary.hidden=true;updateNav();
    const heading=el('div',{class:'step-heading'});heading.append(el('span',{class:'eyebrow'},current===steps.length?'Última revisión':`Paso ${current+1}`),el('h2',{id:'step-title',tabindex:'-1'},current===steps.length?'Vuestras respuestas, listas para revisar':steps[current].title));
    heading.append(el('p',{},current===steps.length?'Comprobad los datos y enviadlos a vuestro programador. Podéis editar cualquier apartado antes de compartir.':steps[current].intro));
    if(current<steps.length)heading.append(el('span',{class:'required-note'},'* Respuesta necesaria. «Por decidir» también es una respuesta válida en los campos abiertos.'));
    content.append(heading);
    document.getElementById('previous').hidden=current===0;
    document.getElementById('next').hidden=current===steps.length;
    document.getElementById('next').textContent=current===steps.length-1?'Revisar respuestas':'Continuar';
    if(current===steps.length){renderReview()}else{steps[current].fields.forEach(f=>content.append(renderField(f)))}
  }
  function fullText(){
    const lines=['CUESTIONARIO L&L — PREPARACIÓN DE LA WEB','Para el programador. Respuestas del responsable de L&L.',''];
    steps.forEach((step,i)=>{lines.push(`${i+1}. ${step.title.toUpperCase()}`);step.fields.forEach(f=>{lines.push(`${shortLabels[f.id]||f.label}: ${displayValue(f)||'Sin indicar'}`)});lines.push('')});
    return lines.join('\n').trim();
  }
  function chunksOf(text){
    const chunks=[];let chunk='';
    // División por caracteres Unicode: conserva exactamente todas las respuestas.
    // Se reserva espacio para el encabezado «parte x de y».
    for(const char of text){
      if(chunk&&encodeURIComponent(chunk+char).length>MAX_ENCODED){chunks.push(chunk);chunk=''}
      chunk+=char;
    }
    if(chunk)chunks.push(chunk);
    return chunks;
  }
  function download(name,type,value){
    const blob=new Blob([value],{type});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function filename(ext){return 'respuestas-lyl-'+new Date().toISOString().slice(0,10)+'.'+ext}
  function renderReview(){
    const missing=allErrors();
    if(missing.length)content.append(el('p',{class:'review-missing'},`Faltan ${missing.length} respuestas por revisar. Podéis leer el resumen y editar los apartados indicados.`));
    steps.forEach((step,index)=>{
      const block=el('section',{class:'review-section'});const title=el('h3',{},step.title);const edit=el('button',{class:'text-button',type:'button'},'Editar');edit.setAttribute('aria-label','Editar: '+step.title);edit.addEventListener('click',()=>go(index));title.append(edit);block.append(title);
      const dl=el('dl');step.fields.forEach(f=>{const value=displayValue(f);dl.append(el('dt',{},f.label),el('dd',{class:value?'':'unanswered'},value||'Sin indicar'))});block.append(dl);content.append(block);
    });
    const box=el('section',{class:'delivery',id:'delivery'});box.append(el('h3',{},'Enviar al programador'));
    box.append(el('p',{},recipient?'Destino de WhatsApp: +'+recipient+'.':'Este enlace no lleva un destinatario. Elegid el contacto de vuestro programador al abrir WhatsApp o al compartir el archivo.'));
    box.append(el('p',{},'Se abrirá WhatsApp con el mensaje preparado. Revisadlo y pulsad «Enviar» allí. Abrir WhatsApp no confirma que el programador lo haya recibido.'));
    const status=el('div',{class:'delivery-status',id:'delivery-status',role:'status','aria-live':'polite'});
    const chunks=chunksOf(fullText());
    if(chunks.length>1)box.append(el('p',{},`Las respuestas se han repartido en ${chunks.length} partes para evitar un enlace demasiado largo. Enviad todas las partes, o compartid el archivo completo con el botón inferior.`));
    const links=el('div',{class:'delivery-actions'});
    chunks.forEach((chunk,i)=>{
      const message=chunks.length>1?`L&L · Parte ${i+1} de ${chunks.length}\n`+chunk:chunk;
      const url='https://wa.me/'+(recipient||'')+'?text='+encodeURIComponent(message);
      const link=el('a',{class:'button primary',href:url,target:'_blank',rel:'noopener noreferrer','data-part':String(i+1)},chunks.length===1?'Abrir WhatsApp con las respuestas':`Abrir WhatsApp · parte ${i+1} de ${chunks.length}`);
      link.addEventListener('click',e=>{
        const errors=allErrors();if(errors.length){e.preventDefault();showErrors(errors);return}
        save();link.dataset.opened='true';status.textContent=`Parte ${i+1} abierta. Pulsad «Enviar» en WhatsApp.`+(chunks.length>1?' Después volved aquí para abrir las demás partes.':' El borrador se conserva.');
      });links.append(link);
    });box.append(links);
    const alternatives=el('div',{class:'secondary-delivery'});
    const share=el('button',{type:'button',class:'button secondary',id:'share-file'},'Compartir archivo completo');
    const copy=el('button',{type:'button',class:'button secondary',id:'copy-all'},'Copiar respuestas');
    const saveText=el('button',{type:'button',class:'button secondary',id:'download-text'},'Descargar respuestas');
    share.addEventListener('click',async()=>{
      const errors=allErrors();if(errors.length){showErrors(errors);return}
      const text=fullText();const file=new File([text],filename('txt'),{type:'text/plain'});
      try{
        if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:'Respuestas de L&L'});
        else if(navigator.share)await navigator.share({title:'Respuestas de L&L',text});
        else{download(filename('txt'),'text/plain;charset=utf-8',text);status.textContent='Archivo descargado. Adjuntadlo al chat de vuestro programador en WhatsApp y enviadlo.';return}
        status.textContent='Comprobad en la aplicación elegida que habéis enviado las respuestas a vuestro programador. Compartir no confirma su recepción.';
      }catch(e){status.textContent=e.name==='AbortError'?'Se ha cancelado el selector. Vuestras respuestas siguen guardadas.':'No se ha podido abrir el selector. Usad «Descargar respuestas» y adjuntad el archivo por WhatsApp.'}
    });
    copy.addEventListener('click',async()=>{
      const errors=allErrors();if(errors.length){showErrors(errors);return}
      try{await navigator.clipboard.writeText(fullText());status.textContent='Respuestas copiadas. Pegadlas y enviadlas en el chat de vuestro programador.'}
      catch(_){let area=document.getElementById('copy-fallback');if(!area){area=el('textarea',{id:'copy-fallback',class:'copy-fallback',readonly:true,'aria-label':'Respuestas listas para copiar'});box.append(area)}area.value=fullText();area.focus();area.select();status.textContent='Seleccionad y copiad el texto; después pegadlo en WhatsApp.'}
    });
    saveText.addEventListener('click',()=>{const errors=allErrors();if(errors.length){showErrors(errors);return}download(filename('txt'),'text/plain;charset=utf-8',fullText());status.textContent='Archivo descargado. Todavía no se ha enviado: adjuntadlo al chat de vuestro programador.'});
    alternatives.append(share,copy,saveText);box.append(alternatives,status,el('p',{class:'receipt'},'El borrador no se borra al abrir WhatsApp. Cuando el programador confirme que lo ha recibido, podéis borrar las respuestas de este dispositivo.'));content.append(box);
  }
  form.addEventListener('submit',event=>{event.preventDefault();if(current<steps.length){const errors=errorsIn(current);if(errors.length){showErrors(errors);return}go(current+1)}});
  document.getElementById('previous').addEventListener('click',()=>go(current-1));
  document.getElementById('backup').addEventListener('click',()=>{save();download(filename('json'),'application/json',JSON.stringify(snapshot(),null,2));feedback.textContent='Copia guardada. Contiene vuestras respuestas: conservadla o compartidla solo con vuestro programador.'});
  const restoreInput=document.getElementById('restore-file');
  restoreInput.addEventListener('change',async()=>{
    const file=restoreInput.files[0];restoreInput.value='';if(!file)return;
    try{
      if(file.size>200000)throw new Error('El archivo supera el tamaño permitido.');
      const data=JSON.parse(await file.text());
      if(data.app!=='lyl-briefing'||data.version!==model.version||!data.answers||typeof data.answers!=='object'||Array.isArray(data.answers))throw new Error('La copia no corresponde a este cuestionario.');
      pendingRestore={answers:sanitize(data.answers),step:Number.isInteger(data.step)?Math.max(0,Math.min(steps.length,data.step)):0};
      document.getElementById('replace-dialog').showModal();
    }catch(e){feedback.textContent='No se ha recuperado la copia. '+(e instanceof SyntaxError?'El archivo no tiene un formato válido.':e.message)}
  });
  document.getElementById('cancel-restore').addEventListener('click',()=>{pendingRestore=null;document.getElementById('replace-dialog').close()});
  document.getElementById('confirm-restore').addEventListener('click',()=>{if(pendingRestore){answers=pendingRestore.answers;current=pendingRestore.step;pendingRestore=null;render();save();feedback.textContent='Copia recuperada. Revisad las respuestas antes de enviarlas.'}document.getElementById('replace-dialog').close()});
  document.getElementById('clear').addEventListener('click',()=>document.getElementById('clear-dialog').showModal());
  document.getElementById('cancel-clear').addEventListener('click',()=>document.getElementById('clear-dialog').close());
  document.getElementById('confirm-clear').addEventListener('click',()=>{
    answers=Object.create(null);current=0;let removed=false;
    try{localStorage.removeItem(key);removed=localStorage.getItem(key)===null}catch(_){}
    render();document.getElementById('draft-state').textContent='Borrador vacío';
    feedback.textContent=removed?'Respuestas borradas de este navegador.':'Se han vaciado las respuestas abiertas, pero no se ha podido confirmar que el navegador borrara su copia guardada. Elimina los datos de este sitio desde los ajustes del navegador.';
    document.getElementById('clear-dialog').close();
  });
  function syncExternalDraft(value){
    try{
      const stored=value===null?null:JSON.parse(value);
      if(stored && (stored.app!=='lyl-briefing'||stored.version!==model.version))return;
      answers=stored?sanitize(stored.answers):Object.create(null);
      current=stored&&Number.isInteger(stored.step)?Math.max(0,Math.min(steps.length,stored.step)):0;
      render();document.getElementById('draft-state').textContent=stored?'Borrador actualizado':'Borrador vacío';
      feedback.textContent=stored?'El borrador se ha actualizado desde otra pestaña de este navegador.':'Las respuestas se han borrado desde otra pestaña.';
    }catch(_){}
  }
  window.addEventListener('storage',event=>{if(event.key===key)syncExternalDraft(event.newValue)});
  window.addEventListener('pageshow',event=>{if(event.persisted){try{syncExternalDraft(localStorage.getItem(key))}catch(_){}}});
  render();
  // Comprobar disponibilidad sin inventar un envío ni guardar respuestas vacías.
  try{const probe=key+'-probe';localStorage.setItem(probe,'1');localStorage.removeItem(probe)}catch(_){save()}
})();
