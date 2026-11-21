import { links } from "./links";
import type { InstitutionalPages } from "./types";

export const pages: InstitutionalPages = {
  about: {
    title: "Acerca de",
    description: "Qué es Underplot Society, quién escribe y por qué.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      [
        "Todo juego tiene dos historias: la que aparece en la pantalla y la que ocurrió para que llegara allí. ",
        { text: "Underplot Society", lang: "en" },
        " existe para contar la segunda.",
      ],
    ],
    sections: [
      {
        heading: "El nombre",
        blocks: [
          [
            { text: "Underplot", lang: "en" },
            " es la trama secundaria, la que corre por debajo de la historia principal. Es lo que este sitio busca en los juegos: las decisiones, los errores y los aciertos que nadie ve desde fuera. De ahí el lema, ",
            { text: "Beneath the Surface", lang: "en" },
            ".",
          ],
        ],
      },
      {
        heading: "Qué encontrarás aquí",
        blocks: [
          "Artículos sobre cómo se hacen y se venden los juegos, área por área:",
          {
            list: [
              "desarrollo, diseño y aseguramiento de la calidad (QA);",
              "producto, marketing y ventas;",
              "gestión de equipos y proyectos.",
            ],
          },
          "Todo en español, inglés y portugués.",
        ],
      },
      {
        heading: "Quién escribe",
        blocks: [
          "T.T.Ravenstone. El propio sitio se construye en público: el código es abierto y cada decisión queda registrada.",
        ],
      },
      {
        heading: "Manifiesto",
        blocks: ["El texto del manifiesto se publicará aquí."],
      },
    ],
  },

  privacy: {
    title: "Privacidad",
    description: "Qué datos trata este sitio, por qué y con quién, según la ley brasileña de protección de datos (LGPD).",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "En resumen: este sitio no pide, no recoge y no vende datos personales. No hay cuentas, formularios, comentarios, anuncios ni rastreo. Abajo está, en detalle, todo lo que ocurre cuando lo visitas.",
    ],
    sections: [
      {
        heading: "Al abrir una página",
        blocks: [
          "Como en cualquier sitio, tu navegador envía tu dirección IP y la identificación del navegador. Se usan solo para entregar la página y proteger el sitio contra abusos:",
          {
            list: [
              [
                { text: "Cloudflare", href: links.cloudflarePrivacy },
                " recibe la visita primero, para entregar el sitio de forma segura (certificado HTTPS y protección contra ataques), y sigue su propia política de privacidad;",
              ],
              ["el servidor está en ", { text: "Oracle Cloud", href: links.oraclePrivacy }, ";"],
              "para leer el sitio, el propio sitio no usa tu dirección IP, y no guarda registros de acceso;",
              "si accedes directamente a la API pública del sitio, con un programa, tu dirección IP se usa solo para limitar peticiones en exceso. Se guarda solo como un código generado con una clave secreta, que no permite recuperar la dirección, y se borra pocos minutos después.",
            ],
          },
          "Base legal: interés legítimo (art. 7, IX, de la LGPD), para mantener el sitio en línea y seguro. Como estos servicios tienen servidores en otros países, los datos pueden tratarse fuera de Brasil.",
        ],
      },
      {
        heading: "Cookies y almacenamiento en el navegador",
        blocks: [
          {
            list: [
              "La cookie locale: solo se guarda si eliges un idioma en el selector. Guarda únicamente el idioma (por ejemplo, es), durante un año, para abrir el sitio en él la próxima vez.",
              "Tema claro u oscuro: tu elección se guarda solo en tu navegador y nunca se envía al sitio.",
            ],
          },
          "No hay ninguna otra cookie: ni de métricas, ni de publicidad, ni de redes sociales.",
        ],
      },
      {
        heading: "Lo que el sitio no carga",
        blocks: [
          "Ningún recurso de otra dirección: las fuentes, imágenes y scripts vienen del propio sitio. Una prueba automática lo comprueba en cada cambio del código.",
        ],
      },
      {
        heading: "Métricas de audiencia",
        blocks: [
          "Para saber qué textos se leen, el servidor del sitio cuenta cuántas veces se abre cada página al día. Solo se guarda ese total: ninguna dirección IP, cookie, identificador del navegador ni dato sobre quién leyó. Los robots no cuentan, y ningún script de métricas se ejecuta en tu navegador.",
        ],
      },
      {
        heading: "Boletín",
        blocks: [
          [
            "El boletín se hace con Substack. El enlace lleva a su sitio, y la suscripción ocurre allí: este sitio nunca ve ni guarda tu correo electrónico. Lo que Substack hace con él sigue la ",
            { text: "política de privacidad de Substack", href: links.substackPrivacy },
            ".",
          ],
        ],
      },
      {
        heading: "Tus derechos",
        blocks: [
          "Según la LGPD, puedes pedir la confirmación de que tus datos se tratan, y el acceso, la corrección o la eliminación de ellos, entre otros derechos (art. 18). Como el sitio no guarda datos personales de los lectores, en la práctica no hay nada que consultar o borrar aquí. Para borrar la cookie de idioma, basta con borrar las cookies del sitio en el navegador.",
          [
            "Para cualquier solicitud sobre tus datos, escribe a ",
            { text: "contato@underplotsociety.com.br", href: links.contact },
            ". El mensaje pasa por Cloudflare y llega a un buzón de Google (Gmail), y tu dirección y lo que escribas se usan solo para responder.",
          ],
        ],
      },
    ],
  },

  accessibility: {
    title: "Accesibilidad",
    description: "El compromiso de accesibilidad del sitio, qué se comprueba y qué falta todavía.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "Este sitio quiere ser usable por todo el mundo, con cualquier navegador, teclado, lector de pantalla o ampliación. La meta es el nivel AA de las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.2.",
    ],
    sections: [
      {
        heading: "Qué se comprueba",
        blocks: [
          "En cada cambio del código, pruebas automáticas comprueban, en los tres idiomas y en los dos temas:",
          {
            list: [
              "contraste de colores suficiente;",
              "uso completo con el teclado, con el foco siempre visible y un enlace para saltar directamente al contenido;",
              "títulos en orden y regiones de la página identificadas;",
              "lectura sin desplazamiento lateral con zoom de hasta el 400% y con espaciado de texto aumentado;",
              "el idioma correcto en cada fragmento, para que el lector de pantalla lo pronuncie bien;",
              "ninguna animación cuando el sistema pide movimiento reducido.",
            ],
          },
          [
            "El informe completo está en el ",
            { text: "repositorio público del sitio", href: links.accessibilityReport },
            " (en inglés).",
          ],
        ],
      },
      {
        heading: "Limitaciones conocidas",
        blocks: [
          {
            list: [
              "Las palabras en otro idioma dentro de un artículo todavía no pueden marcarse como tales, y el lector de pantalla puede pronunciarlas con el acento equivocado.",
              "La prueba manual con lectores de pantalla está en curso.",
            ],
          },
        ],
      },
      {
        heading: "¿Encontraste una barrera?",
        blocks: [
          [
            "Toda barrera comunicada se trata como un defecto que corregir. Escribe a ",
            { text: "contato@underplotsociety.com.br", href: links.contact },
            " y cuenta en qué página, con qué navegador y con qué tecnología de apoyo apareció.",
          ],
        ],
      },
    ],
  },
};
