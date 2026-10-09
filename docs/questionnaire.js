/* Cuestionario de L&L para preparar la web con su desarrollador. */
window.LYL_QUESTIONS = {
  version: '1',
  steps: [
    {
      id: 'negocio',
      title: 'Conocemos vuestro negocio',
      intro: 'Estas respuestas ayudarán a quien prepara vuestra web. No es un formulario para pedir una reparación. Podéis responder «No lo sé todavía» cuando falte una decisión.',
      fields: [
        {
          id: 'nombre_publico',
          label: '¿Qué nombre queréis mostrar en la web?',
          type: 'text',
          required: true,
          placeholder: 'Por ejemplo: L&L Multiservicios',
          help: 'Escribe el nombre comercial tal como debería verlo un cliente.'
        },
        {
          id: 'persona_contacto',
          label: '¿Quién coordinará la web con el desarrollador?',
          type: 'text',
          required: true,
          placeholder: 'Nombre y, si hace falta, cómo prefieres que te llamemos',
          help: 'Este contacto es para preparar el proyecto; no se publicará por defecto.'
        },
        {
          id: 'telefono_coordinacion',
          label: 'Teléfono para coordinar la web',
          type: 'tel',
          required: false,
          placeholder: 'Tu número de contacto',
          help: 'Opcional. Puedes dejarlo vacío si el desarrollador ya tiene tu contacto. El teléfono público se pregunta al final.'
        },
        {
          id: 'email_coordinacion',
          label: 'Correo para coordinar la web',
          type: 'email',
          required: false,
          placeholder: 'nombre@ejemplo.es',
          help: 'Opcional. No se mostrará en la web por defecto.'
        },
        {
          id: 'municipio_base',
          label: '¿Desde qué municipio soléis salir a trabajar?',
          type: 'text',
          required: true,
          placeholder: 'Municipio o zona de Sevilla',
          help: 'Solo municipio o barrio de referencia. No necesitamos vuestra dirección particular.'
        }
      ]
    },
    {
      id: 'cobertura',
      title: 'Dónde queréis trabajar',
      intro: 'Atender toda Sevilla no obliga a aceptar todos los desplazamientos. Estas respuestas nos ayudarán a elegir las zonas y los encargos que más os convienen.',
      fields: [
        {
          id: 'zonas_prioritarias',
          label: '¿En qué barrios o municipios preferís conseguir trabajos?',
          type: 'textarea',
          required: true,
          placeholder: 'Indica primero vuestras zonas preferidas y después otras que atendéis.',
          help: 'Si todavía no lo tenéis claro, escribe «Por decidir». No hace falta enumerar toda la provincia.'
        },
        {
          id: 'desplazamiento_maximo',
          label: '¿Cuánto tiempo de viaje os encaja por trayecto?',
          type: 'select',
          required: true,
          options: [
            'Hasta 20 minutos desde nuestra base',
            'Hasta 40 minutos desde nuestra base',
            'Hasta 60 minutos desde nuestra base',
            'Depende del tamaño del trabajo',
            'No lo sé todavía'
          ],
          help: 'Es una orientación para planificar la captación, no una promesa que vayamos a publicar.'
        },
        {
          id: 'politica_desplazamiento',
          label: '¿Cómo tratáis las visitas y los desplazamientos?',
          type: 'select',
          required: true,
          options: [
            'Los incluimos en el presupuesto acordado',
            'Cobramos desplazamiento según la zona',
            'Pedimos un importe mínimo de trabajo',
            'Lo valoramos caso por caso antes de ir',
            'No lo hemos decidido todavía'
          ],
          help: 'Después podremos concretar importes. Evitaremos anunciar visitas gratis si no lo habéis decidido.'
        },
        {
          id: 'clientes_preferidos',
          label: '¿Para quién os gustaría trabajar?',
          type: 'checkboxes',
          required: true,
          options: [
            'Particulares que necesitan arreglos en casa',
            'Personas que acaban de comprar o alquilar una vivienda',
            'Propietarios que preparan una vivienda para alquilar',
            'Inmobiliarias',
            'Administradores de fincas y comunidades',
            'Comercios y pequeños negocios',
            'Tiendas que necesitan un servicio de montaje',
            'No lo sé todavía'
          ],
          help: 'Marca los tipos de cliente que os interesan de verdad. Podemos empezar por uno o dos.'
        }
      ]
    },
    {
      id: 'servicios',
      title: 'Qué hacéis bien',
      intro: 'Queremos presentar servicios concretos que podáis cumplir entre los dos. La web no prometerá trabajos ni acreditaciones que no hayáis confirmado.',
      fields: [
        {
          id: 'servicios_dominados',
          label: '¿Qué trabajos podéis ofrecer con confianza?',
          type: 'checkboxes',
          required: true,
          options: [
            'Montaje y desmontaje de muebles',
            'Instalación de estanterías, barras y accesorios',
            'Ajustes de puertas, persianas y herrajes',
            'Pintura y repasos',
            'Pequeños trabajos de albañilería',
            'Suelos, revestimientos y alicatados',
            'Sellados y juntas',
            'Reparaciones de fontanería',
            'Trabajos de electricidad',
            'Puesta a punto de viviendas',
            'Otros: los explico en la siguiente respuesta',
            'Aún debemos definirlo'
          ],
          help: 'Marca solo tareas que dominéis y que podáis realizar con las habilitaciones que correspondan.'
        },
        {
          id: 'servicios_prioritarios',
          label: '¿Qué tres trabajos os gustaría recibir primero?',
          type: 'textarea',
          required: true,
          placeholder: '1. ...  2. ...  3. ...',
          help: 'Piensa en trabajos que hagáis bien, os compensen y podáis terminar con vuestro equipo. También vale «Necesitamos decidirlo».'
        },
        {
          id: 'servicios_excluidos',
          label: '¿Qué trabajos no queréis o no podéis aceptar?',
          type: 'textarea',
          required: true,
          placeholder: 'Tareas, tamaños de obra o situaciones que preferís evitar.',
          help: 'Incluye servicios para los que necesitaríais a otro profesional. Si falta revisarlo, escribe «Por confirmar».'
        },
        {
          id: 'experiencia',
          label: '¿Qué experiencia real tenéis?',
          type: 'textarea',
          required: true,
          placeholder: 'Años aproximados, qué sabe hacer cada uno y uno o dos ejemplos de trabajos.',
          help: 'Podéis estar empezando como empresa y tener experiencia previa. Contadlo con vuestras palabras.'
        },
        {
          id: 'acreditaciones',
          label: '¿Tenéis formación, habilitaciones o seguro que podamos mencionar?',
          type: 'textarea',
          required: false,
          placeholder: 'Indica cuáles, «No tenemos» o «Tenemos que comprobarlo».',
          help: 'Opcional. Solo se publicará lo que se pueda verificar. No adjuntes documentos ni escribas números de póliza o identificación.'
        },
        {
          id: 'equipo_medios',
          label: '¿Con qué medios contáis para trabajar?',
          type: 'textarea',
          required: false,
          placeholder: 'Vehículo, herramientas, transporte de materiales o colaboradores habituales.',
          help: 'Opcional. Indica si algún servicio depende de alquilar equipo o de otra persona.'
        }
      ]
    },
    {
      id: 'confianza',
      title: 'Material para generar confianza',
      intro: 'Las fotos y los trabajos reales nos ayudarán a explicar lo que hacéis. Aquí solo indicamos qué existe; no se suben imágenes ni documentos.',
      fields: [
        {
          id: 'fotos_disponibles',
          label: '¿Tenéis fotos propias de trabajos realizados?',
          type: 'radio',
          required: true,
          options: [
            'Sí, tenemos fotos del antes y del después',
            'Sí, tenemos algunas fotos de trabajos terminados',
            'Todavía no, pero podemos empezar a hacerlas',
            'Tenemos que revisarlo'
          ],
          help: 'No pasa nada si aún hay pocas. Es mejor empezar con material propio y claro.'
        },
        {
          id: 'material_disponible',
          label: '¿Qué otro material podéis entregar al desarrollador?',
          type: 'checkboxes',
          required: false,
          options: [
            'Logo en buena calidad',
            'Una foto de los dos',
            'Fotos trabajando',
            'Fotos de herramientas o vehículo',
            'Vídeos breves de trabajos',
            'No tenemos más material todavía'
          ],
          help: 'Opcional. El desarrollador acordará con vosotros cómo recibir los archivos de forma privada.'
        },
        {
          id: 'resenas_casos',
          label: '¿Tenéis reseñas o trabajos que merezca la pena mostrar?',
          type: 'textarea',
          required: false,
          placeholder: 'Enlace público a reseñas o una breve descripción de uno o dos trabajos.',
          help: 'Opcional. No copies conversaciones privadas ni datos de clientes. No inventaremos testimonios.'
        },
        {
          id: 'permisos_material',
          label: '¿Habéis confirmado que podéis publicar ese material?',
          type: 'radio',
          required: true,
          options: [
            'Sí, tenemos permiso y sabemos qué material se puede usar',
            'Solo para parte del material; lo concretaremos',
            'Necesitamos pedir permiso o revisarlo',
            'Todavía no tenemos material para publicar'
          ],
          help: 'El permiso debe cubrir lo que se vea: trabajos, viviendas, personas y testimonios. Esta respuesta no sustituye la revisión de cada archivo.'
        }
      ]
    },
    {
      id: 'organizacion',
      title: 'Cuánto trabajo podéis asumir',
      intro: 'Buscamos consultas que podáis atender y trabajos que os compensen. Partimos de que sois dos y de que ahora no hay presupuesto para anuncios.',
      fields: [
        {
          id: 'capacidad_semanal',
          label: '¿Qué hueco tenéis para nuevos trabajos cada semana?',
          type: 'select',
          required: true,
          options: [
            'Algún trabajo pequeño, además de lo que ya hacemos',
            'Uno o dos días de trabajo entre los dos',
            'Tres o cuatro días de trabajo entre los dos',
            'La semana completa de los dos',
            'Varía mucho; lo acordaremos según el encargo',
            'No lo sé todavía'
          ],
          help: 'Pensad también en las horas de desplazamiento, compra de materiales y preparación de presupuestos.'
        },
        {
          id: 'horarios',
          label: '¿Qué días y horarios queréis atender?',
          type: 'text',
          required: true,
          placeholder: 'Por ejemplo: laborables de mañana; llamadas por la tarde.',
          help: 'Distingue horario de trabajo y de respuesta si son distintos. Indica si no atendéis fines de semana o urgencias.'
        },
        {
          id: 'gestion_consultas',
          label: '¿Quién responderá las consultas y cuándo podrá hacerlo?',
          type: 'text',
          required: true,
          placeholder: 'Nombre o rol y plazo habitual: durante el día, al terminar la jornada…',
          help: 'Si no está decidido, escribe «Por organizar». No anunciaremos atención inmediata sin confirmarlo.'
        },
        {
          id: 'objetivo_90_dias',
          label: '¿Qué os gustaría conseguir durante los primeros tres meses?',
          type: 'text',
          required: true,
          placeholder: 'Por ejemplo: dos trabajos pequeños por semana o un colaborador habitual.',
          help: 'Es vuestro objetivo de partida, no una garantía de resultados. También vale «Necesitamos definirlo».'
        },
        {
          id: 'precios_costes',
          label: '¿Qué importes o costes debemos tener en cuenta?',
          type: 'textarea',
          required: false,
          placeholder: 'Mínimo por visita, ejemplo de un trabajo habitual, materiales o desplazamiento.',
          help: 'Opcional y para planificar. Indica qué incluye cada importe y si lleva IVA. No publicaremos tarifas sin revisarlas con vosotros.'
        }
      ]
    },
    {
      id: 'presencia',
      title: 'Cómo os encuentran ahora',
      intro: 'Aprovecharemos lo que ya tenéis. Los enlaces públicos son suficientes; no necesitamos contraseñas ni acceso a vuestras cuentas en este cuestionario.',
      fields: [
        {
          id: 'canales_actuales',
          label: '¿Por dónde llegan hoy los trabajos o las consultas?',
          type: 'checkboxes',
          required: true,
          options: [
            'Familiares, conocidos y recomendaciones',
            'Google o Google Maps',
            'WhatsApp',
            'Instagram o Facebook',
            'Grupos locales o asociaciones',
            'Inmobiliarias, tiendas u otros colaboradores',
            'Plataformas de servicios o anuncios clasificados',
            'Otra vía',
            'Todavía no recibimos consultas',
            'No lo sé'
          ],
          help: 'Marca las vías que ya funcionan, aunque todavía lleguen pocos encargos.'
        },
        {
          id: 'enlaces_publicos',
          label: 'Enlaces públicos de vuestro negocio',
          type: 'textarea',
          required: false,
          placeholder: 'Instagram, Facebook, Google Maps, web actual u otros perfiles.',
          help: 'Opcional. Puedes poner un enlace por línea. No incluyas enlaces privados, claves ni códigos de acceso.'
        },
        {
          id: 'perfil_google',
          label: '¿Tenéis una ficha de empresa en Google Maps?',
          type: 'select',
          required: true,
          options: [
            'Sí, aparece y podemos gestionarla',
            'Aparece, pero no sabemos quién la gestiona',
            'La hemos creado y está pendiente de verificación',
            'No tenemos ficha',
            'No lo sé'
          ],
          help: 'Esto nos ayudará a decidir el siguiente paso sin crear fichas duplicadas.'
        },
        {
          id: 'dominio_estado',
          label: '¿Tenéis una dirección web o dominio comprado?',
          type: 'select',
          required: true,
          options: [
            'Sí, tenemos un dominio propio',
            'Tenemos una web, pero no sabemos si el dominio es nuestro',
            'No tenemos dominio todavía',
            'No lo sé'
          ],
          help: 'No hace falta comprar nada para completar este cuestionario.'
        },
        {
          id: 'dominio_detalle',
          label: '¿Cuál es el dominio o qué nombre os gustaría usar?',
          type: 'text',
          required: false,
          placeholder: 'Dominio actual o idea de nombre, si la tenéis.',
          help: 'Opcional. Si ya existe, indica quién se ocupa de él. Sin usuarios, contraseñas ni datos de pago.'
        }
      ]
    },
    {
      id: 'web',
      title: 'Cómo queréis presentar L&L',
      intro: 'Estas decisiones nos permitirán preparar una propuesta de web clara, con vuestro logo y una forma sencilla de contactar desde el móvil.',
      fields: [
        {
          id: 'estilo_web',
          label: '¿Qué imagen os gustaría transmitir?',
          type: 'select',
          required: true,
          options: [
            'Cercana y sencilla, con nosotros y nuestros trabajos',
            'Sobria y profesional, con servicios muy claros',
            'Visual, dando protagonismo a las fotos de trabajos',
            'Preferimos que el desarrollador nos proponga una dirección',
            'No lo sé todavía'
          ],
          help: 'Usaremos vuestro logo como punto de partida. Todas las opciones pueden transmitir seriedad.'
        },
        {
          id: 'referencias_web',
          label: '¿Hay alguna web que os guste o algo que queráis evitar?',
          type: 'textarea',
          required: false,
          placeholder: 'Enlace y qué te gusta: fotos, colores, textos, facilidad para contactar…',
          help: 'Opcional. También puedes indicar expresiones, estilos o promesas que no representen vuestro negocio.'
        },
        {
          id: 'diferencia_real',
          label: '¿Por qué os recomendaría alguien que ya ha trabajado con vosotros?',
          type: 'textarea',
          required: true,
          placeholder: 'Una o dos razones concretas y, si podéis, un ejemplo.',
          help: 'Contad algo que podáis demostrar. Si aún está por definir, indicadlo; no necesitamos frases publicitarias.'
        },
        {
          id: 'contacto_preferido',
          label: '¿Qué queréis que haga alguien interesado al entrar en la web?',
          type: 'radio',
          required: true,
          options: [
            'Escribir por WhatsApp con fotos y su municipio',
            'Llamarnos por teléfono',
            'Rellenar un formulario breve de solicitud',
            'Escribirnos por correo',
            'Necesitamos elegirlo con el desarrollador'
          ],
          help: 'Elige la vía que os resulte más fácil atender. Después podremos ofrecer una alternativa.'
        },
        {
          id: 'contacto_publico',
          label: '¿Qué teléfono o correo autorizáis a mostrar a los futuros clientes?',
          type: 'textarea',
          required: true,
          placeholder: 'Teléfono público, si tiene WhatsApp y/o correo del negocio. También vale «Pendiente de decidir».',
          help: 'Escribe solo los datos que queréis hacer públicos. No daremos por hecho que el contacto de coordinación se puede publicar.'
        }
      ]
    }
  ]
};
