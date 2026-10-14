/**
 * Termos de Uso e Politica de Privacidade (Fase 102). Texto de docs/fase-102/rascunho-termos-e-privacidade.md,
 * revisado pelo dono. Mudou o texto de qualquer um dos dois? Suba LEGAL_VERSION aqui E LegalDocuments.CurrentVersion
 * no backend (mesma data): quem aceitou outra versao ve a tela "Atualizamos nossos termos" no proximo login.
 */
export const LEGAL_VERSION = '2026-10-15';
export const LEGAL_CONTACT_EMAIL = 'rafalves106@icloud.com';

export type LegalBlock = { p: string } | { ul: string[] } | { table: string[][] };

export interface LegalSection {
  n: number;
  /** Rotulo curto do indice. */
  short: string;
  title: string;
  items: LegalBlock[];
}

export type LegalDocKey = 'termos' | 'privacidade';

export interface LegalDoc {
  key: LegalDocKey;
  path: string;
  title: string;
  /** Rotulo do link cruzado "Leia tambem". */
  label: string;
  sections: LegalSection[];
}

const TERMOS: LegalSection[] = [
  {
    "n": 1,
    "short": "Quem somos",
    "title": "Quem somos",
    "items": [
      {
        "p": "O Focadu é uma plataforma pessoal de estudo, operada por Rafael Martins Alves (pessoa física). Contato: rafalves106@icloud.com."
      }
    ]
  },
  {
    "n": 2,
    "short": "O serviço",
    "title": "O que é o serviço",
    "items": [
      {
        "p": "Sessões diárias de estudo com leitura, quiz, exercícios, laboratório de código e avaliação por voz, mais projetos semanais. O serviço está em **teste fechado**: pode mudar, sair do ar ou perder funções sem aviso. Não prometemos disponibilidade contínua."
      }
    ]
  },
  {
    "n": 3,
    "short": "Conta",
    "title": "Conta",
    "items": [
      {
        "p": "Você precisa de convite e de um e-mail seu. Você é responsável por manter a senha em segredo e pelo que acontece na sua conta. Uma conta é de uma pessoa; não a compartilhe."
      }
    ]
  },
  {
    "n": 4,
    "short": "Conduta",
    "title": "Regras de conduta",
    "items": [
      {
        "p": "Você concorda em:"
      },
      {
        "ul": [
          "usar o Focadu para estudar e fazer o que as atividades pedem, não para burlar o curso (por exemplo, mandar respostas prontas de IA como se fossem suas na avaliação por voz);",
          "não tentar acessar a conta, os dados ou os repositórios de outras pessoas;",
          "não sobrecarregar o serviço (automação, ataques de negação de serviço, varredura em massa);",
          "não enviar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros;",
          "tratar colegas de squad e turma com respeito."
        ]
      },
      {
        "p": "Contas que violarem estas regras podem ser suspensas ou desativadas."
      }
    ]
  },
  {
    "n": 5,
    "short": "Hacking ético",
    "title": "Hacking ético: só dentro do que é nosso e do que o curso pede",
    "items": [
      {
        "p": "O curso de Web Security ensina técnicas de ataque para você entender defesa. Por isso:"
      },
      {
        "ul": [
          "Pratique **somente** nos laboratórios, nos ambientes e nos alvos que o próprio curso fornece ou que você criou e controla.",
          "**Nunca** use o que aprendeu contra sistemas, sites ou pessoas sem autorização por escrito do dono do sistema. Isso pode ser crime (Lei 12.737/2012 e o Código Penal) e a responsabilidade é só sua.",
          "Se achar uma falha no próprio Focadu, avise pelo e-mail de contato em vez de explorá-la ou divulgá-la; não buscaremos medidas contra quem agir de boa-fé, sem acessar dados de terceiros e sem degradar o serviço."
        ]
      }
    ]
  },
  {
    "n": 6,
    "short": "Seu conteúdo",
    "title": "Seu conteúdo",
    "items": [
      {
        "p": "Suas respostas, anotações, áudios e códigos continuam sendo seus. Você nos dá permissão para armazená-los e processá-los apenas para operar o serviço para você (inclusive enviá-los aos provedores descritos na Política de Privacidade). O conteúdo dos cursos (textos, atividades, diagramas) é do Focadu e não pode ser copiado ou revendido."
      }
    ]
  },
  {
    "n": 7,
    "short": "Certificado",
    "title": "Certificado de conclusão",
    "items": [
      {
        "p": "Ao concluir um módulo ou curso você pode receber um **certificado de conclusão** do Focadu. Ele atesta que você fez as atividades na plataforma. **Não é diploma, não é curso reconhecido pelo MEC, não é certificação profissional e não equivale a nenhuma certificação de mercado** (como Security+, CEH ou OSCP). Não o apresente como tal."
      }
    ]
  },
  {
    "n": 8,
    "short": "Inteligência artificial",
    "title": "Inteligência artificial",
    "items": [
      {
        "p": "Notas e feedbacks de voz e de texto são gerados por modelos de IA e podem errar. Eles orientam o estudo; não são avaliação oficial nem garantia de aprendizado."
      }
    ]
  },
  {
    "n": 9,
    "short": "Sem garantias",
    "title": "Sem garantias; limite de responsabilidade",
    "items": [
      {
        "p": "O serviço é oferecido \"como está\", sem garantia de resultado profissional (emprego, aprovação, nota). Na extensão permitida em lei, não respondemos por danos indiretos nem por perda de dados em período de teste. Mantemos backups, mas você deve guardar cópia do que for importante para você."
      }
    ]
  },
  {
    "n": 10,
    "short": "Encerramento",
    "title": "Encerramento",
    "items": [
      {
        "p": "Você pode parar de usar e pedir a exclusão da conta a qualquer momento (ver Política de Privacidade). Podemos suspender ou encerrar contas que violem estes Termos ou encerrar o serviço, avisando por e-mail quando possível."
      }
    ]
  },
  {
    "n": 11,
    "short": "Mudanças",
    "title": "Mudanças",
    "items": [
      {
        "p": "Podemos atualizar estes Termos. Quando a mudança for relevante, a versão sobe e você precisa aceitar de novo no próximo login para continuar usando."
      }
    ]
  },
  {
    "n": 12,
    "short": "Lei e foro",
    "title": "Lei e foro",
    "items": [
      {
        "p": "Lei brasileira. Foro da comarca de Belo Horizonte (MG), ressalvado o foro do consumidor quando a lei o assegurar."
      }
    ]
  }
];

const PRIVACIDADE: LegalSection[] = [
  {
    "n": 1,
    "short": "Controlador",
    "title": "Controlador",
    "items": [
      {
        "p": "Rafael Martins Alves (pessoa física). Contato e encarregado para pedidos sobre dados: rafalves106@icloud.com."
      }
    ]
  },
  {
    "n": 2,
    "short": "Quais dados e para quê",
    "title": "Quais dados tratamos e para quê",
    "items": [
      {
        "table": [
          [
            "Dado",
            "Para quê",
            "Base legal (art. 7º)"
          ],
          [
            "Nome, e-mail, senha (guardada só como hash)",
            "Criar e proteger a conta, recuperar senha, avisos do serviço",
            "Execução do contrato"
          ],
          [
            "Código de confirmação de e-mail, convite usado, turma",
            "Controle de acesso do teste fechado",
            "Execução do contrato / legítimo interesse"
          ],
          [
            "Progresso, respostas, pontuação, anotações do Caderninho, interesses informados",
            "Entregar o estudo, ranking, squad, reforço adaptativo",
            "Execução do contrato"
          ],
          [
            "**Áudio da sua voz** e a transcrição",
            "Avaliar o Resumo Falado e a conversa por voz",
            "Execução do contrato; consentimento no aceite (frase da voz)"
          ],
          [
            "Código que você roda no laboratório",
            "Executa **no seu navegador**; só vai ao servidor se você pedir a dica da Focada ou enviar para avaliação",
            "Execução do contrato"
          ],
          [
            "Repositório do Projeto Semanal (código, commits, README)",
            "Entregar e avaliar o projeto; prova pública de evolução",
            "Execução do contrato"
          ],
          [
            "Registros técnicos (IP, aparelho/navegador resumido, data/hora, uso de IA e custo estimado)",
            "Segurança, limite de abuso, medir o produto e o custo",
            "Legítimo interesse"
          ]
        ]
      },
      {
        "p": "Não pedimos CPF, endereço, dado de pagamento nem dado sensível (art. 5º, II). Não usamos seus dados para publicidade nem os vendemos."
      }
    ]
  },
  {
    "n": 3,
    "short": "Voz e IA",
    "title": "Voz e IA",
    "items": [
      {
        "p": "Seu áudio é enviado ao provedor **Groq** para transcrição (Whisper) e o texto, para avaliação por modelo de linguagem. Esses provedores ficam **fora do Brasil (EUA)**; a transferência é necessária para executar o serviço (art. 33, II e IX). Usamos o Groq com Zero Data Retention ativado: ele não guarda o conteúdo das requisições nem o usa para treinar modelos. O áudio **não é gravado** por nós: ele fica em memória só o tempo da transcrição e depois é descartado; guardamos apenas o texto transcrito e a nota. (Conferido em `GroqAudioTranscriptionService`, 14/10/2026.)"
      }
    ]
  },
  {
    "n": 4,
    "short": "Repositórios",
    "title": "Repositórios",
    "items": [
      {
        "p": "Os repositórios dos Projetos Semanais ficam em um servidor Forgejo próprio. Hoje eles podem ser **públicos** (a prova pública de evolução é parte do curso): não coloque nada pessoal ou secreto neles. Se você publicar no LinkedIn ou GitHub por conta própria, aquilo passa a seguir as regras dessas plataformas."
      }
    ]
  },
  {
    "n": 5,
    "short": "Com quem compartilhamos",
    "title": "Com quem compartilhamos",
    "items": [
      {
        "p": "Somente operadores necessários: hospedagem (Oracle Cloud), borda e DNS (Cloudflare), e-mail transacional (Gmail/Google), IA (Groq), e a GitHub quando você conecta/publica lá. Outros alunos veem apenas o que o produto mostra por desenho: apelido/nome no ranking e no squad. Podemos divulgar dados se a lei ou ordem judicial exigir."
      }
    ]
  },
  {
    "n": 6,
    "short": "Por quanto tempo",
    "title": "Por quanto tempo",
    "items": [
      {
        "p": "Enquanto a conta existir. Conta desativada deixa de aparecer no ranking e no squad na hora; os dados são apagados ou anonimizados em até 30 dias após o pedido de exclusão, salvo o que a lei obrigar a guardar. Os backups são rotativos: guardamos só as cópias mais recentes e as antigas são apagadas automaticamente, em geral em poucas semanas."
      }
    ]
  },
  {
    "n": 7,
    "short": "Seus direitos",
    "title": "Seus direitos (art. 18)",
    "items": [
      {
        "p": "Confirmação de tratamento, acesso, correção, anonimização/bloqueio/eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento. Peça pelo e-mail de contato; respondemos em até 15 dias. Você também pode reclamar na ANPD (gov.br/anpd)."
      }
    ]
  },
  {
    "n": 8,
    "short": "Segurança",
    "title": "Segurança",
    "items": [
      {
        "p": "Senhas com hash, HTTPS, limite de tentativas de login, acesso restrito ao servidor e backups. Nenhum sistema é 100% seguro; em caso de incidente relevante avisaremos você e a ANPD conforme a lei."
      }
    ]
  },
  {
    "n": 9,
    "short": "Menores",
    "title": "Menores",
    "items": [
      {
        "p": "O serviço é para maiores de 18 anos."
      }
    ]
  },
  {
    "n": 10,
    "short": "Cookies",
    "title": "Cookies e armazenamento local",
    "items": [
      {
        "p": "Usamos armazenamento do navegador para manter você logado e lembrar preferências. Não usamos cookies de publicidade nem rastreadores de terceiros."
      }
    ]
  },
  {
    "n": 11,
    "short": "Mudanças",
    "title": "Mudanças",
    "items": [
      {
        "p": "Mesmo mecanismo dos Termos: nova versão, novo aceite."
      }
    ]
  }
];

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  termos: { key: 'termos', path: '/termos', title: 'Termos de Uso', label: 'Termos de Uso', sections: TERMOS },
  privacidade: { key: 'privacidade', path: '/privacidade', title: 'Política de Privacidade', label: 'Política de Privacidade', sections: PRIVACIDADE },
};
