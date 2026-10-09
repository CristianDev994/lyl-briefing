/* Un currículum por persona, guardado solamente en este navegador. */
(() => {
  'use strict';
  const databaseName = 'lyl-briefing-cv-v2';
  const storeName = 'files';
  const maxBytes = 10 * 1024 * 1024;

  function checkPersona(persona) {
    if (persona !== 'luis' && persona !== 'lino') throw new Error('Selecciona a Luis o Lino antes de adjuntar un currículum.');
  }

  // Returns the same File on success; throws Error for invalid metadata.
  // The file is never parsed, rendered or uploaded by this module.
  function validate(file) {
    if (!(file instanceof File)) throw new Error('Selecciona un archivo de tu dispositivo.');
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) throw new Error('El currículum debe ser un PDF, DOC o DOCX.');
    if (file.size < 1) throw new Error('El archivo está vacío. Selecciona otro currículum.');
    if (file.size > maxBytes) throw new Error('El currículum no puede superar los 10 MB.');
    return file;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      let request;
      let settled = false;
      const timer = setTimeout(() => fail(new Error('El navegador no ha podido abrir el almacenamiento del currículum.')), 4000);
      function fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
      try {
        if (!window.indexedDB) throw new Error('Este navegador no permite guardar el currículum.');
        request = window.indexedDB.open(databaseName, 1);
      } catch (error) {
        fail(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (settled) {
          request.transaction.abort();
          return;
        }
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'persona' });
      };
      request.onerror = () => fail(request.error || new Error('No se pudo abrir el almacenamiento del currículum.'));
      request.onblocked = () => fail(new Error('Cierra otras pestañas de este cuestionario para guardar el currículum.'));
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }

  async function run(persona, mode, operation, deserialize = value => value) {
    checkPersona(persona);
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let transaction;
      let value;
      let failure;
      let settled = false;
      function finish(error) {
        if (settled) return;
        settled = true;
        db.close();
        if (error) reject(error);
        else resolve(value);
      }
      try {
        transaction = db.transaction(storeName, mode);
        // Commit, rather than request success, confirms a write or deletion.
        transaction.oncomplete = () => finish(failure);
        transaction.onabort = () => finish(failure || transaction.error || new Error('No se pudo completar el cambio del currículum.'));
        transaction.onerror = () => { failure = transaction.error || failure; };
        const request = operation(transaction.objectStore(storeName));
        request.onerror = () => { failure = request.error || new Error('No se pudo acceder al currículum.'); };
        request.onsuccess = () => {
          try { value = deserialize(request.result); }
          catch (error) {
            failure = error;
            transaction.abort();
          }
        };
      } catch (error) {
        if (transaction) {
          failure = error;
          try { transaction.abort(); }
          catch (_) { finish(error); }
        } else finish(error);
      }
    });
  }

  async function get(persona) {
    return run(persona, 'readonly', store => store.get(persona), record => {
      if (record === undefined) return null;
      if (!record || record.persona !== persona || !(record.blob instanceof Blob) || typeof record.name !== 'string') {
        throw new Error('No se pudo recuperar el currículum guardado. Adjunta el archivo de nuevo.');
      }
      return validate(new File([record.blob], record.name, {
        type: typeof record.type === 'string' ? record.type : '',
        lastModified: Number.isFinite(record.lastModified) ? record.lastModified : 0
      }));
    });
  }

  async function put(persona, file) {
    checkPersona(persona);
    validate(file);
    return run(persona, 'readwrite', store => store.put({
      persona,
      blob: file.slice(0, file.size, file.type),
      name: file.name,
      type: file.type,
      lastModified: file.lastModified
    }), () => file);
  }

  async function remove(persona) {
    return run(persona, 'readwrite', store => store.delete(persona), () => undefined);
  }

  const crcTable = new Uint32Array(256);
  for (let index = 0; index < crcTable.length; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    crcTable[index] = value >>> 0;
  }

  function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  }

  function safeFilename(value, fallback) {
    let name = String(value || '').split(/[\\/]/).pop()
      .replace(/[\u0000-\u001f\u007f-\u009f<>:"|?*]/g, '_')
      .replace(/[. ]+$/g, '').trim();
    if (!name || name === '.' || name === '..') name = fallback;
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) name = '_' + name;
    const extension = /\.[a-z0-9]{1,8}$/i.exec(name)?.[0] || '';
    const stem = extension ? name.slice(0, -extension.length) : name;
    return Array.from(stem).slice(0, 120 - extension.length).join('') + extension;
  }

  // A standard uncompressed ZIP lets desktop users download both documents
  // with one action. Only byte copying occurs; the CV content is not interpreted.
  async function packageAnswers(text, textFilename, file) {
    validate(file);
    if (typeof text !== 'string') throw new Error('No se pudieron preparar las respuestas.');
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    if (textBytes.length > 1024 * 1024) throw new Error('Las respuestas son demasiado grandes para preparar el archivo.');
    const answerName = safeFilename(textFilename, 'respuestas.txt');
    let cvName = safeFilename(file.name, 'curriculum.pdf');
    if (cvName.toLowerCase() === answerName.toLowerCase()) cvName = safeFilename('cv-' + cvName, 'curriculum.pdf');
    const entries = [
      { name: answerName, bytes: textBytes },
      { name: cvName, bytes: new Uint8Array(await file.arrayBuffer()) }
    ];
    const localParts = [];
    const centralParts = [];
    let localSize = 0;
    let centralSize = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.name);
      const checksum = crc32(entry.bytes);
      const local = new Uint8Array(30 + name.length);
      const header = new DataView(local.buffer);
      header.setUint32(0, 0x04034b50, true);
      header.setUint16(4, 20, true);
      header.setUint16(6, 0x0800, true); // UTF-8 filenames; no data descriptor.
      header.setUint16(12, 33, true); // 1 January 1980; no personal timestamp.
      header.setUint32(14, checksum, true);
      header.setUint32(18, entry.bytes.length, true);
      header.setUint32(22, entry.bytes.length, true);
      header.setUint16(26, name.length, true);
      local.set(name, 30);
      localParts.push(local, entry.bytes);

      const central = new Uint8Array(46 + name.length);
      const directory = new DataView(central.buffer);
      directory.setUint32(0, 0x02014b50, true);
      directory.setUint16(4, 20, true);
      directory.setUint16(6, 20, true);
      directory.setUint16(8, 0x0800, true);
      directory.setUint16(14, 33, true);
      directory.setUint32(16, checksum, true);
      directory.setUint32(20, entry.bytes.length, true);
      directory.setUint32(24, entry.bytes.length, true);
      directory.setUint16(28, name.length, true);
      directory.setUint32(42, localSize, true);
      central.set(name, 46);
      centralParts.push(central);
      centralSize += central.length;
      localSize += local.length + entry.bytes.length;
    }
    const end = new Uint8Array(22);
    const endHeader = new DataView(end.buffer);
    endHeader.setUint32(0, 0x06054b50, true);
    endHeader.setUint16(8, entries.length, true);
    endHeader.setUint16(10, entries.length, true);
    endHeader.setUint32(12, centralSize, true);
    endHeader.setUint32(16, localSize, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  window.LYLCV = Object.freeze({ get, put, remove, validate, maxBytes, packageAnswers });
})();
