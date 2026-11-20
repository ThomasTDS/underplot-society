import { links } from "./links";
import type { InstitutionalPages } from "./types";

export const pages: InstitutionalPages = {
  about: {
    title: "Sobre",
    description: "O que é a Underplot Society, quem escreve e por quê.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      [
        "Todo jogo tem duas histórias. A que aparece na tela e a que aconteceu para ela chegar lá. A ",
        { text: "Underplot Society", lang: "en" },
        " existe para contar a segunda.",
      ],
    ],
    sections: [
      {
        heading: "O nome",
        blocks: [
          [
            { text: "Underplot", lang: "en" },
            " é a trama secundária, a que corre por baixo da história principal. É o que este site procura nos jogos: as decisões, os erros e os acertos que ninguém vê de fora. Daí o lema, ",
            { text: "Beneath the Surface", lang: "en" },
            ".",
          ],
        ],
      },
      {
        heading: "O que você encontra aqui",
        blocks: [
          "Artigos sobre como os jogos são feitos e vendidos, área por área:",
          {
            list: [
              "desenvolvimento, design e garantia de qualidade (QA);",
              "produto, marketing e vendas;",
              "gestão de times e de projetos.",
            ],
          },
          "Tudo em português, inglês e espanhol.",
        ],
      },
      {
        heading: "Quem escreve",
        blocks: [
          "T.T.Ravenstone. Este próprio site é construído em público: o código é aberto e cada decisão fica registrada.",
        ],
      },
      {
        heading: "Manifesto",
        blocks: [
          "O texto do manifesto ainda será publicado aqui.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacidade",
    description: "Quais dados este site trata, por quê e com quem, de acordo com a LGPD.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "Resumo: este site não pede, não coleta e não vende dados pessoais. Não há conta, formulário, comentário, anúncio ou rastreamento. Abaixo está, em detalhe, tudo o que acontece quando você o visita.",
    ],
    sections: [
      {
        heading: "Ao abrir uma página",
        blocks: [
          "Como em qualquer site, o seu navegador envia o seu endereço IP e a identificação do navegador. Esses dados são usados só para entregar a página e proteger o site contra abusos:",
          {
            list: [
              [
                "a ",
                { text: "Cloudflare", href: links.cloudflarePrivacy },
                " recebe a visita primeiro, para entregar o site com segurança (certificado HTTPS e proteção contra ataques), e segue a política de privacidade dela;",
              ],
              [
                "o servidor fica na ",
                { text: "Oracle Cloud", href: links.oraclePrivacy },
                ";",
              ],
              "quem lê o site não tem o endereço IP usado pelo próprio site, que não mantém registros de acesso;",
              "quem acessa diretamente a API pública do site, com um programa, tem o endereço IP usado só para limitar pedidos em excesso. Ele é guardado só como um código gerado com uma chave secreta, que não permite recuperar o endereço, e apagado poucos minutos depois.",
            ],
          },
          "Base legal: legítimo interesse (art. 7º, IX, da LGPD), para manter o site no ar e seguro. Como esses serviços têm servidores em outros países, os dados podem ser tratados fora do Brasil.",
        ],
      },
      {
        heading: "Cookies e armazenamento no navegador",
        blocks: [
          {
            list: [
              "Cookie locale: só é gravado se você escolher um idioma no seletor. Guarda apenas o idioma (por exemplo, pt-br), por um ano, para abrir o site nele na próxima vez.",
              "Tema claro ou escuro: a sua escolha fica guardada só no seu navegador e nunca é enviada ao site.",
            ],
          },
          "Não há nenhum outro cookie: nem de métricas, nem de publicidade, nem de redes sociais.",
        ],
      },
      {
        heading: "O que o site não carrega",
        blocks: [
          "Nenhum recurso de outro endereço: as fontes, imagens e scripts vêm do próprio site. Um teste automático confere isso a cada mudança no código.",
          "Hoje não há métricas de audiência. Se elas forem adotadas, serão sem cookies e sem dados pessoais, e esta página será atualizada antes.",
        ],
      },
      {
        heading: "Newsletter",
        blocks: [
          [
            "A newsletter é feita pelo Substack. O link leva ao site deles, e a inscrição acontece lá: este site nunca vê nem guarda o seu e-mail. O que o Substack faz com ele segue a ",
            { text: "política de privacidade do Substack", href: links.substackPrivacy },
            ".",
          ],
        ],
      },
      {
        heading: "Seus direitos",
        blocks: [
          "Pela LGPD, você pode pedir confirmação de que dados seus são tratados, acesso, correção ou eliminação deles, entre outros direitos (art. 18). Como o site não guarda dados pessoais dos leitores, na prática não há o que consultar ou apagar aqui. Para apagar o cookie de idioma, basta limpar os cookies do site no navegador.",
          "O canal de contato será publicado aqui antes do lançamento do site.",
        ],
      },
    ],
  },

  accessibility: {
    title: "Acessibilidade",
    description: "O compromisso de acessibilidade do site, o que é verificado e o que ainda falta.",
    draft: true,
    updated: "2026-11-20",
    intro: [
      "Este site quer ser usável por todo mundo, com qualquer navegador, teclado, leitor de tela ou ampliação. A meta é o nível AA das Diretrizes de Acessibilidade para Conteúdo Web (WCAG) 2.2.",
    ],
    sections: [
      {
        heading: "O que é verificado",
        blocks: [
          "A cada mudança no código, testes automáticos conferem, nos três idiomas e nos dois temas:",
          {
            list: [
              "contraste de cores suficiente;",
              "uso completo pelo teclado, com o foco sempre visível e um link para pular direto ao conteúdo;",
              "títulos em ordem e regiões da página identificadas;",
              "leitura sem rolagem lateral com zoom de até 400% e com espaçamento de texto aumentado;",
              "idioma certo em cada trecho, para o leitor de tela pronunciar corretamente;",
              "nenhuma animação quando o sistema pede movimento reduzido.",
            ],
          },
          [
            "O relatório completo está no ",
            { text: "repositório público do site", href: links.accessibilityReport },
            " (em inglês).",
          ],
        ],
      },
      {
        heading: "Limitações conhecidas",
        blocks: [
          {
            list: [
              "Palavras em outro idioma dentro de um artigo ainda não podem ser marcadas como tal, e o leitor de tela pode pronunciá-las com o sotaque errado.",
              "O teste manual com leitores de tela está em andamento.",
            ],
          },
        ],
      },
      {
        heading: "Encontrou uma barreira?",
        blocks: [
          "Toda barreira relatada é tratada como um defeito a corrigir. O canal de contato será publicado aqui antes do lançamento do site.",
        ],
      },
    ],
  },
};
