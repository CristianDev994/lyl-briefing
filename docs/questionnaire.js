/* Respuestas individuales de Luis y Lino para preparar la web de L&L. */
window.LYL_QUESTIONS = {
  version: '2',
  steps: [
    {
      id: 'experiencia', title: 'Tu experiencia',
      intro: 'Responde por ti, aunque todavía no lo hayas hablado con tu socio. Queremos conocer lo que tú has hecho y lo que aportarás a L&L. Unas frases bastan; el currículum es opcional.',
      fields: [
        {
          id: 'anos_experiencia', label: '¿Cuánto tiempo llevas haciendo montajes, arreglos o reformas?',
          type: 'select', required: true,
          options: ['Estoy empezando', 'Menos de 1 año', 'Entre 1 y 3 años', 'Entre 4 y 10 años', 'Más de 10 años'],
          help: 'Cuenta tu experiencia anterior a L&L, también por cuenta ajena o en proyectos propios.'
        },
        {
          id: 'experiencia_personal', label: 'Un trabajo que hayas hecho tú y del que estés satisfecho',
          type: 'textarea', required: false,
          placeholder: 'Ej.: monté una cocina. Yo hice los muebles y ajustes; otra persona conectó las instalaciones.',
          help: 'Opcional. Cuenta qué hiciste tú, si lo resolviste solo o con ayuda y cómo quedó. Puede ser anterior a L&L; no hacen falta nombres de clientes.'
        },
        {
          id: 'experiencia_juntos', label: '¿Qué habéis hecho ya Luis y Lino juntos?',
          type: 'textarea', required: false,
          placeholder: 'Ej.: pintamos un piso. Yo preparé y pinté las paredes; mi socio reparó los desperfectos.',
          help: 'Opcional. Un ejemplo y tu parte del trabajo bastan. Si aún no habéis trabajado juntos, puedes escribirlo o dejarlo vacío.'
        },
        {
          id: 'curriculum', label: 'Tu currículum, si lo tienes a mano',
          type: 'cv', required: false,
          help: 'Opcional. Nos ayuda a conocer tu trayectoria sin volver a escribirla. Puedes continuar sin él; su contenido no se publicará en la web.'
        }
      ]
    },
    {
      id: 'habilidades', title: 'Lo que sabes hacer',
      intro: 'Marca lo que puedes resolver personalmente. No pasa nada si algunas tareas las hace tu socio o necesitas ayuda: eso también nos sirve para organizar bien la oferta.',
      fields: [
        {
          id: 'servicios_autonomos', label: '¿Qué tareas puedes hacer por tu cuenta con confianza?',
          type: 'checkboxes', required: true,
          options: [
            'Montar y desmontar muebles', 'Colocar estanterías, barras y accesorios',
            'Ajustar puertas, persianas y herrajes', 'Pintar y dar repasos',
            'Hacer pequeñas reparaciones de albañilería', 'Colocar suelos, revestimientos o azulejos',
            'Renovar sellados y juntas', 'Hacer reparaciones de fontanería',
            'Realizar trabajos de electricidad', 'Preparar una vivienda para entrar a vivir',
            'Otras tareas: las explico debajo', 'No lo sé todavía; necesito concretarlo'
          ],
          help: 'Puedes marcar varias. Esto describe tu experiencia; antes de ofrecer un servicio concretaremos su alcance y la formación o habilitación necesaria.'
        },
        {
          id: 'servicios_preferidos', label: '¿Qué tarea se te da mejor o te gustaría hacer más?',
          type: 'text', required: false,
          placeholder: 'Ej.: montar muebles, especialmente cocinas y armarios.',
          help: 'Opcional. Aquí también puedes añadir una habilidad que no aparezca en la lista.'
        },
        {
          id: 'limites_personales', label: '¿Qué prefieres dejar a tu socio, hacer con ayuda o no aceptar?',
          type: 'textarea', required: false,
          placeholder: 'Ej.: para colocar muebles altos necesito ayuda. No hago instalaciones de gas.',
          help: 'Opcional. Nos ayudará a evitar consultas para trabajos que no te encajen.'
        },
        {
          id: 'formacion', label: '¿Tienes formación, cursos o habilitaciones relacionados?',
          type: 'text', required: false,
          placeholder: 'Nombre del curso o título, «Está en mi CV» o «No tengo».',
          help: 'Opcional. No necesitamos números de identificación. Antes de mencionar una acreditación en la web, la revisaremos contigo.'
        }
      ]
    },
    {
      id: 'disponibilidad', title: 'Tu día a día',
      intro: 'Piensa en tu disponibilidad real ahora, no en la de los dos juntos. Son referencias para organizar el trabajo; no se publicarán como compromisos.',
      fields: [
        {
          id: 'disponibilidad_personal', label: '¿Cuánto tiempo puedes dedicar a L&L cada semana?',
          type: 'select', required: true,
          options: ['Algún rato o un trabajo pequeño', '1 o 2 días', '3 o 4 días', 'La semana laboral completa', 'Depende de mis otros trabajos', 'No lo sé todavía']
        },
        {
          id: 'horario_personal', label: '¿En qué momentos sueles poder trabajar?',
          type: 'checkboxes', required: true,
          options: ['Entre semana por la mañana', 'Entre semana por la tarde', 'Los sábados', 'Los domingos', 'Puedo adaptar mi horario según el encargo', 'No lo sé todavía'],
          help: 'Marca lo que te encaje habitualmente. No implica ofrecer urgencias ni estar siempre disponible.'
        },
        {
          id: 'zona_base_personal', label: '¿Desde qué municipio o zona saldrías a trabajar?',
          type: 'text', required: false,
          placeholder: 'Ej.: Sevilla Este, Dos Hermanas, Camas…',
          help: 'Opcional. Solo municipio o barrio. Añade si hay alguna zona de Sevilla a la que te resulte difícil desplazarte.'
        },
        {
          id: 'movilidad_personal', label: '¿Cómo te desplazarías a los trabajos?',
          type: 'select', required: true,
          options: ['Tengo vehículo y puedo llevar herramientas y materiales', 'Tengo vehículo, pero poco espacio para material', 'Necesitaría coordinar el transporte con mi socio', 'Puedo desplazarme por otros medios', 'No lo sé todavía']
        }
      ]
    },
    {
      id: 'aportaciones', title: 'Lo que puedes aportar',
      intro: 'Además del oficio, cuentan tus herramientas, las fotos de tus trabajos y las personas que ya confían en ti. Este paso es opcional: marca solo lo que tengas claro.',
      fields: [
        {
          id: 'medios_personales', label: '¿Qué medios tuyos puedes aportar a los trabajos?',
          type: 'checkboxes', required: false,
          options: ['Herramientas de montaje y reparación', 'Equipo y herramientas de pintura', 'Herramientas de albañilería o revestimientos', 'Herramientas para otro oficio', 'Escaleras y equipo de acceso', 'Un lugar para guardar herramientas o material', 'Contactos de profesionales que pueden colaborar', 'No lo sé todavía; tengo que revisarlo'],
          help: 'Opcional. No hace falta hacer un inventario ni comprar nada para responder.'
        },
        {
          id: 'fotos_personales', label: '¿Tienes fotos de trabajos en los que hayas participado?',
          type: 'radio', required: false,
          options: ['Sí, del antes y del después', 'Sí, de algunos trabajos terminados', 'Tengo que buscarlas', 'Todavía no tengo'],
          help: 'Opcional. Más adelante elegiremos fotos y comprobaremos los permisos. Esta respuesta no autoriza a publicarlas.'
        },
        {
          id: 'fortalezas_personales', label: '¿Qué suelen valorar de tu forma de trabajar?',
          type: 'checkboxes', required: false,
          options: ['El cuidado de los acabados', 'La limpieza y el orden', 'La puntualidad y cumplir lo acordado', 'Explicar bien las opciones y el trabajo', 'Encontrar soluciones a los imprevistos', 'El trato cercano con el cliente', 'No lo sé todavía; prefiero ver ejemplos'],
          help: 'Opcional. Elige lo que refleje tu experiencia, sin necesidad de buscar una frase publicitaria.'
        },
        {
          id: 'contactos_personales', label: '¿Por qué vías podrían llegarte trabajos a ti?',
          type: 'checkboxes', required: false,
          options: ['Personas para las que ya he trabajado', 'Familiares, amistades y conocidos', 'Otros profesionales de reformas u oficios', 'Inmobiliarias, comunidades o comercios conocidos', 'Mis redes sociales o grupos de mi zona', 'No lo sé todavía; estoy empezando de cero'],
          help: 'Opcional. Solo necesitamos saber qué vías existen; no escribas nombres ni teléfonos de otras personas.'
        }
      ]
    },
    {
      id: 'prioridades', title: 'Cómo te imaginas L&L',
      intro: 'Aquí importa tu opinión personal. Después compararemos vuestras respuestas para proponer servicios, reparto de tareas y una web que os represente a los dos.',
      fields: [
        {
          id: 'rol_personal', label: '¿Qué tareas te ves llevando además de hacer los trabajos?',
          type: 'checkboxes', required: true,
          options: ['Responder WhatsApp y llamadas', 'Visitar y valorar los trabajos', 'Preparar y explicar presupuestos', 'Organizar agenda, compras y materiales', 'Hacer fotos y pedir reseñas al terminar', 'Hablar con posibles colaboradores', 'Prefiero centrarme en ejecutar los trabajos', 'No lo sé todavía; quiero acordarlo con mi socio'],
          help: 'Marca lo que te resulte cómodo. No fija el reparto definitivo entre Luis y Lino.'
        },
        {
          id: 'encargos_preferidos', label: '¿Qué tipo de encargo te gustaría recibir primero?',
          type: 'radio', required: true,
          options: ['Montajes concretos que pueda terminar en unas horas', 'Varios arreglos pequeños en la misma vivienda', 'Pintura o puesta a punto de una vivienda', 'Pequeñas reformas de varios días', 'Trabajos habituales con un comercio o colaborador', 'No lo sé todavía; quiero comparar opciones'],
          help: 'Elige tu preferencia para empezar. No te compromete a aceptar un servicio que no domines.'
        },
        {
          id: 'prioridad_web', label: '¿Qué te gustaría que consiguiera la web?',
          type: 'select', required: false,
          options: ['Que más personas sepan que existimos y nos contacten', 'Que se entiendan bien los trabajos que hacemos', 'Dar confianza al enseñar quiénes somos y cómo trabajamos', 'Enseñar trabajos reales a quien nos pida referencias', 'Prefiero que el desarrollador nos oriente'],
          help: 'Opcional. Partimos de que ahora no hay presupuesto para anuncios.'
        },
        {
          id: 'algo_mas', label: '¿Hay algo más que deba saber para preparar vuestra propuesta?',
          type: 'textarea', required: false,
          placeholder: 'Una idea, algo que te preocupe, un enlace público que te guste o algo que quieras evitar.',
          help: 'Opcional. Escribe con tus palabras. No incluyas contraseñas ni datos privados de clientes.'
        }
      ]
    }
  ]
};
