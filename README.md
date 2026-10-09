# L&L · Cuestionario de preparación web

Sitio estático para que **Luis y Lino respondan por separado** sobre su experiencia, habilidades, disponibilidad y preferencias. Cada persona tiene su propio borrador y entrega identificada. Cinco apartados, veinte preguntas (incluido el CV opcional) y siete obligatorias, todas de selección. Incluye el estudio de Sevilla como consulta.

## Publicación

GitHub Pages publica exclusivamente `docs/`, desde la rama `main`. La web no necesita instalar dependencias ni un servidor de formularios.

- `docs/index.html`: cuestionario móvil.
- `docs/questionnaire.js`: preguntas, opciones y textos.
- `docs/app.js`: validación, borrador, revisión y entrega.
- `docs/cv-store.js`: CV local por persona y paquete ZIP de respuestas + CV.
- `docs/estudio.html`: estudio de mercado.

## Entrega por WhatsApp

La URL pública permite elegir Luis o Lino. El programador puede facilitar enlaces individuales con `#contacto=NUMERO_INTERNACIONAL&persona=luis` y `#contacto=NUMERO_INTERNACIONAL&persona=lino`, usando solo dígitos e incluyendo el prefijo del país. Ese número no debe escribirse en el código, ejemplos reales, capturas ni commits.

El fragmento se procesa en el navegador y no forma parte de la petición HTTP a Pages. No es cifrado ni un secreto: quien tenga el enlace podrá leerlo. No se guarda en el borrador ni se incluye en las copias exportadas. El estudio se abre en otra pestaña para conservar el enlace del cuestionario.

Sin destinatario, WhatsApp permite elegir un contacto. Las respuestas largas se dividen en partes sin truncarlas. También pueden compartirse o descargarse completas como texto. Abrir WhatsApp o el selector de compartir **no confirma el envío ni la recepción**; el usuario termina el envío en la aplicación.

## Currículum opcional

Se admite un archivo PDF, DOC o DOCX por persona, de hasta 10 MiB. Se comprueban extensión y tamaño; no se interpreta, renderiza ni certifica el contenido del documento. El CV se guarda en IndexedDB en este navegador y nunca se sube al alojamiento. Si el navegador impide guardarlo, se avisa de que hay que volver a seleccionarlo al recargar.

«Compartir respuestas + CV» entrega ambos archivos al selector nativo cuando `navigator.canShare` admite esos archivos. El usuario elige WhatsApp y el contacto. Si no hay soporte, descarga un ZIP con las respuestas TXT y el CV original, para adjuntarlo manualmente al chat como documento. El ZIP conserva los bytes del CV; sus nombres de archivo se normalizan. Los enlaces `wa.me` solo llevan texto y recuerdan adjuntar el CV por separado. No hay adjuntos automáticos mediante enlaces de WhatsApp.

Las copias JSON de borrador **no incluyen los bytes del CV**. Al importar solo se admiten copias de la persona seleccionada y de esta versión; el CV actual se conserva. Los borradores antiguos de la versión colectiva permanecen disponibles para descargar y no se asignan a ninguna persona.

## Datos y privacidad

- No hay base de datos de respuestas en servidor, analítica, rastreadores ni envíos automáticos.
- Las respuestas se guardan en `localStorage` bajo claves separadas por persona; los CV, en IndexedDB. Los datos locales no están cifrados por esta aplicación. No se deben introducir contraseñas, documentos de identidad, datos bancarios ni datos privados de terceros. Conviene quitar del CV el DNI y la dirección completa.
- Luis y Lino son identidades del cuestionario, no cuentas autenticadas. Quien use el mismo dispositivo y perfil del navegador puede cambiar de persona y ver sus borradores. Para mantenerlos separados también en acceso, deben usar sus propios dispositivos o perfiles.
- Borrar un borrador elimina las respuestas y el CV de esa persona; no borra el otro borrador ni archivos ya descargados o enviados.
- Se pueden descargar copias JSON para continuar en otro dispositivo. Esos archivos contienen las respuestas y deben compartirse solo con el programador.
- El código usa `textContent` para mostrar respuestas y limita los campos importados a la estructura conocida.
- La web y el repositorio son públicos. `noindex` solicita que no se indexe; no proporciona autenticación.
- GitHub procesa metadatos de conexión de acuerdo con su política. WhatsApp procesa los datos que el usuario decide llevar a esa aplicación.
- Las credenciales de GitHub o DNS nunca son necesarias en el navegador ni deben ponerse en `docs/`.

## Desarrollo y comprobación

Servir `docs/` con cualquier servidor estático local. Las pruebas en `tests/briefing.cjs` usan Playwright y un navegador local, con datos sintéticos; sus salidas se guardan en `test-results/`, excluido de Git.

Para editar: modificar archivos, comprobar el flujo móvil, revisar `git diff --cached` y publicar en `main`. No añadir respuestas reales, copias de credenciales, `.env` ni archivos de otros proyectos. El correo de autor de Git debe ser la dirección `noreply` de GitHub para evitar publicar un correo personal en commits.

Las pruebas usan exclusivamente identidades de ejemplo y adjuntos sintéticos. Comprueban los dos recorridos móviles, aislamiento y persistencia, adjuntos reales en el selector simulado, contenido del ZIP, importación, borrado y fallos de almacenamiento. No envían mensajes reales. El soporte nativo de compartir varía por navegador y aplicación: se verifica en tiempo de ejecución y se ofrece descarga como alternativa.
