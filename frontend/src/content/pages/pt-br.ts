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
          "Videogames vão além do que vemos na tela enquanto jogamos. Cada decisão no desenvolvimento de um jogo tem um porquê, seja na direção de arte, nas mecânicas, nos limites de escopo ou no orçamento. O processo lembra o de um pintor, que reflete, projeta, administra o tempo e tenta várias formas antes de concluir a obra, com uma diferença: num jogo, essa obra é coletiva. É uma composição complexa e fascinante.",
          "Nascemos da crença de que vale a pena conhecer os bastidores desse espetáculo. Nosso propósito é aprender sobre os jogos por dentro: o que aconteceu durante a produção e quais eventos externos podem tê-la afetado.",
          "As decisões e os acontecimentos de um jogo se ligam como fios que conectam as cenas de uma mesma história, e são esses fios que resultam em experiências únicas. Por isso nenhum jogo é pequeno demais para ser investigado: mesmo um jogo tecnicamente fraco quase sempre marcou alguém pelo mundo. Há grande reverência pelos jogos antigos. Muitas histórias foram esquecidas ou perdidas ao longo dos anos e merecem voltar à superfície, como fósseis que, mesmo após tanto tempo, ainda nos ensinam como chegamos até aqui.",
          "Esse olhar vale além dos videogames. Cabem aqui a indústria e o hardware, o game design dos jogos de cartas e do RPG de mesa, e os filmes, séries, desenhos e animes que tratam de jogos. Game design e engenharia reversa de sistemas e decisões estão longe de depender só da tecnologia digital.",
          "Somos uma sociedade de pessoas curiosas e escrevemos para pessoas curiosas. Somos apaixonados por essa arte e expressamos a paixão no desejo constante de aprender mais, que celebra os bons momentos vividos com um controle nas mãos e, ao mesmo tempo, afia o olhar crítico.",
          "Traduzimos os conceitos desse universo complexo para que qualquer pessoa os entenda. Para entrar, basta ter curiosidade: o jargão fica por nossa conta.",
          "Não aceitamos plágio, informação falsa nem exibicionismo para chamar atenção. Quando não sabemos, dizemos que não sabemos, em vez de inventar uma narrativa. Cada palavra que publicamos exige responsabilidade, porque o que escrevemos pode ser repetido e tomado como verdade. Trabalhamos com seriedade e muito carinho em cada projeto, de fã para fã.",
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
        heading: "Quem é responsável",
        blocks: [
          [
            "T.T.Ravenstone, autor do site, é o responsável pelos dados tratados aqui (o controlador, na LGPD). Contato: ",
            { text: "contato@underplotsociety.com.br", href: links.contact },
            ".",
          ],
        ],
      },
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
              "para quem só lê o site, o próprio site não usa o seu endereço IP e não mantém registros de acesso;",
              "se você acessar diretamente a API pública do site, com um programa, o seu endereço IP é usado só para limitar pedidos em excesso. Ele é guardado só como um código gerado com uma chave secreta, que não permite recuperar o endereço, e apagado poucos minutos depois.",
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
        ],
      },
      {
        heading: "Métricas de audiência",
        blocks: [
          "Para saber quais textos são lidos, o servidor do site conta quantas vezes cada página é aberta por dia. Só esse total é guardado: nenhum endereço IP, cookie, identificador do navegador ou dado sobre quem leu. Robôs não entram na conta, e nenhum script de métricas roda no seu navegador.",
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
          [
            "Para qualquer pedido sobre os seus dados, escreva para ",
            { text: "contato@underplotsociety.com.br", href: links.contact },
            ". A mensagem passa pelo Cloudflare e chega a uma caixa de e-mail do Google (Gmail), e o seu endereço e o que você escrever são usados só para responder. As mensagens são apagadas 6 meses depois de recebidas.",
          ],
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
          [
            "Toda barreira relatada é tratada como um defeito a corrigir. Escreva para ",
            { text: "contato@underplotsociety.com.br", href: links.contact },
            " e conte em qual página, com qual navegador e com qual tecnologia assistiva ela apareceu.",
          ],
        ],
      },
    ],
  },
};
