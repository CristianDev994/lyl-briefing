# L&L · Cuestionario de preparación web

Sitio estático para que el responsable de L&L entregue a su programador la información necesaria para definir su web y su estrategia de captación. Incluye el estudio de Sevilla como material de consulta.

## Publicación

GitHub Pages publica exclusivamente `docs/`, desde la rama `main`. La web no necesita instalar dependencias ni un servidor de formularios.

- `docs/index.html`: cuestionario móvil.
- `docs/questionnaire.js`: preguntas, opciones y textos.
- `docs/app.js`: validación, borrador, revisión y entrega.
- `docs/estudio.html`: estudio de mercado.

## Entrega por WhatsApp

La URL pública no lleva destinatario. El programador puede facilitar al cliente un enlace con `#contacto=NUMERO_INTERNACIONAL`, usando solo dígitos e incluyendo el prefijo del país. Ese número no debe escribirse en el código, ejemplos reales, capturas ni commits.

El fragmento se procesa en el navegador y no forma parte de la petición HTTP a Pages. No es cifrado ni un secreto: quien tenga el enlace podrá leerlo. No se guarda en el borrador ni se incluye en las copias exportadas. El estudio se abre en otra pestaña para conservar el enlace del cuestionario.

Sin destinatario, WhatsApp permite elegir un contacto. Las respuestas largas se dividen en partes sin truncarlas. También pueden compartirse o descargarse completas como texto. Abrir WhatsApp o el selector de compartir **no confirma el envío ni la recepción**; el usuario termina el envío en la aplicación.

## Datos y privacidad

- No hay base de datos, analítica, rastreadores ni envíos automáticos.
- Las respuestas se guardan en `localStorage` en este origen. Ese borrador no está cifrado: no se deben introducir contraseñas, documentos de identidad, datos bancarios ni datos privados de terceros.
- Se pueden descargar copias JSON para continuar en otro dispositivo. Esos archivos contienen las respuestas y deben compartirse solo con el programador.
- El código usa `textContent` para mostrar respuestas y limita los campos importados a la estructura conocida.
- La web y el repositorio son públicos. `noindex` solicita que no se indexe; no proporciona autenticación.
- GitHub procesa metadatos de conexión de acuerdo con su política. WhatsApp procesa los datos que el usuario decide llevar a esa aplicación.
- Las credenciales de GitHub o DNS nunca son necesarias en el navegador ni deben ponerse en `docs/`.

## Desarrollo y comprobación

Servir `docs/` con cualquier servidor estático local. Las pruebas en `tests/briefing.cjs` usan Playwright y un navegador local, con datos sintéticos; sus salidas se guardan en `test-results/`, excluido de Git.

Para editar: modificar archivos, comprobar el flujo móvil, revisar `git diff --cached` y publicar en `main`. No añadir respuestas reales, copias de credenciales, `.env` ni archivos de otros proyectos. El correo de autor de Git debe ser la dirección `noreply` de GitHub para evitar publicar un correo personal en commits.
