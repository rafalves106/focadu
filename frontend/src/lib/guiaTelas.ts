import { ActivityType } from '../api/types';

/**
 * Guia das telas (Fase 75, Figma "Guia das telas — v2", decisoes do dono em 26-27/09/2026): o botao
 * "?" abre uma janela com o que a tela atual faz, as perguntas frequentes e o report de problema, e
 * chama o tour da tela. No 1o acesso roda o tour do app inteiro (APP_TOUR), passando pelas telas.
 *
 * Os itens de cada tela sao tambem os passos do tour dela: `anchor` aponta pro elemento com o mesmo
 * `data-guia` na tela - passo sem elemento na tela (celular, estado vazio) e pulado. Textos na voz de
 * secret/curadoria/GUIA-DE-VOZ-FOCADA.md, revisados pelo dono (secret/rascunhos/guia-das-telas-textos.md).
 * Mudou uma tela? Atualize o guia dela aqui.
 */

export type GuideScreenKey =
  | 'login'
  | 'senha'
  | 'onboarding'
  | 'start'
  | 'trilha'
  | 'semana'
  | 'sessao'
  | 'projeto'
  | 'perfil'
  | 'squad'
  | 'loja'
  | 'ranking'
  | 'certificacoes'
  | 'caderninho';

export interface GuideItem {
  title: string;
  text: string;
  /** `data-guia` do elemento destacado no tour. */
  anchor?: string;
}

export interface GuideScreen {
  title: string;
  focada: string;
  items: GuideItem[];
  /** Tela fora do app: sem as perguntas frequentes (que falam do que tem dentro). */
  outside?: boolean;
}

/** Formulario de report do teste fechado (Tally, decisao do dono em 27/09/2026). Vazio = ainda nao criado. */
export const REPORT_FORM_URL = 'https://tally.so/r/0QX9VB';

export const GUIDE_SCREENS: Record<GuideScreenKey, GuideScreen> = {
  login: {
    title: 'Entrar',
    outside: true,
    focada: 'Voltou, agente? Entra aí. Se é a primeira vez, cria a conta na aba do lado.',
    items: [
      { title: 'Esqueceu a senha?', text: 'O link manda um e-mail pra criar outra, válido por 1 hora.', anchor: 'login-esqueci' },
      { title: 'Criar conta', text: 'Se você veio por indicação, o código já vem preenchido.', anchor: 'login-abas' },
    ],
  },
  senha: {
    title: 'Senha',
    outside: true,
    focada: 'Acontece com todo agente. Digite o e-mail da conta e siga o link que chegar.',
    items: [{ title: 'O link vence', text: 'Vale por 1 hora e só pode ser usado uma vez. Venceu? Peça outro.' }],
  },
  onboarding: {
    title: 'Primeiros passos',
    outside: true,
    focada: 'Três passos e você está dentro: quem eu sou, do que você gosta e qual curso vai encarar.',
    items: [
      { title: 'Seus interesses', text: 'Viram analogias nas leituras, montadas pra você. Dá pra mudar depois no perfil.' },
      { title: 'Linguagens', text: 'As que você topa usar nos projetos. A escolha de cada projeto vem depois.' },
      { title: 'O curso', text: 'Por enquanto, Web Security: 12 semanas, 12 castelos.' },
    ],
  },
  start: {
    title: 'Início',
    focada: 'Aqui é o seu QG, agente. Daqui sai tudo: a missão de hoje, o caminho até o castelo e o que ficou pendente.',
    items: [
      { title: 'Menu: o que é seu', text: 'Hoje, Trilhas, Loja e Ranking. O logo no meio sempre volta pra cá.', anchor: 'nav-solo' },
      { title: 'Menu: o que é em grupo', text: 'Squad, o status da IA, as Configurações e o seu perfil.', anchor: 'nav-grupo' },
      { title: 'Seus cursos', text: 'Cada curso é um save. O escolhido muda o resto da tela.', anchor: 'start-cursos' },
      { title: 'Seu agente', text: 'Ofensiva, Gems e os dias da semana em que você estudou.', anchor: 'start-agente' },
      { title: 'Missão do dia', text: 'Uma Daily por dia, em etapas. É daqui que você começa.', anchor: 'start-missao' },
      { title: 'Rumo ao castelo', text: 'Os dias que faltam até o Projeto Semanal desta semana.', anchor: 'start-castelo' },
    ],
  },
  trilha: {
    title: 'Mapa da trilha',
    focada: 'O curso inteiro num mapa. Cada região é um módulo, cada castelo é um projeto. Eu fico parada na próxima Daily.',
    items: [
      { title: 'Seu progresso', text: 'Quanto do curso você já fez.', anchor: 'trilha-curso' },
      {
        title: 'Pontos, castelos e névoa',
        text: 'Ponto é dia: verde feito, piscando em andamento, cadeado trancado. Castelo é projeto. Névoa é semana que ainda não abriu.',
        anchor: 'trilha-mapa',
      },
      { title: 'Selo vermelho', text: 'Reforço pendente daquele dia. Clique pra ir direto.' },
      { title: 'Resumo e atalhos', text: 'Números do curso e os caminhos pro Ranking, Caderninho e Certificações.', anchor: 'trilha-resumo' },
    ],
  },
  semana: {
    title: 'Visão da semana',
    focada: 'Aqui é a sua semana inteira num trecho da trilha, agente: seis dias e o castelo do projeto fechando a semana.',
    items: [
      { title: 'Os dias', text: 'Aprovadas e erros de cada dia, e o dia atual em destaque. Uma Daily por dia.', anchor: 'semana-trilha' },
      { title: 'A ponte', text: 'O 6º dia é prático, na linguagem que você escolher pro projeto. É ela que abre o castelo.' },
      { title: 'O castelo', text: 'O Projeto Semanal. A semana seguinte só abre com ele avaliado.' },
      { title: 'Faixa âmbar', text: 'Quando aparece, falta publicar o módulo pra próxima semana abrir.' },
      { title: 'Resumo da semana', text: 'Dias feitos, aprovação, erros e as certificações que o módulo cobre.', anchor: 'semana-resumo' },
    ],
  },
  sessao: {
    title: 'Sessão diária',
    focada: 'Uma etapa por vez, agente. Eu apresento cada bloco e comento quando você erra. O resumo falado é você explicando, não a IA.',
    items: [
      { title: 'Cadeia de etapas', text: 'Onde você está e quanto falta. Dá pra voltar pra etapa anterior sem refazer.', anchor: 'sessao-etapas' },
      { title: 'Conta-giros', text: 'Cada erro antes de terminar o dia soma 1. No 3º, nasce um reforço só com o que você errou.', anchor: 'sessao-contagiros' },
      { title: 'Material e Pomodoro', text: 'O conteúdo de hoje pra consultar e o timer, se você usa.', anchor: 'sessao-material' },
      { title: 'Anotação e Suporte Rápido', text: 'Anote sem sair da sessão e tire dúvida curta sobre o que está na tela.', anchor: 'sessao-ferramentas' },
      { title: 'Barra de baixo', text: 'No celular: material, notas, dúvida e Pomodoro.', anchor: 'sessao-barra' },
      { title: 'Teclado', text: 'Teclas 1 a N escolhem, Enter confirma.' },
    ],
  },
  projeto: {
    title: 'Projeto Semanal',
    focada: 'O chefe de fase. Você escreve o código no seu repositório e eu corrijo quando você entregar. Tirar print não conta.',
    items: [
      { title: 'A missão', text: 'O briefing é a apresentação; o enunciado completo está no README do repositório.', anchor: 'projeto-missao' },
      {
        title: 'Repositório e referências',
        text: 'Copie o git clone. O token é a senha e aparece uma vez só: gerar outro revoga o anterior. Embaixo, a documentação da sua linguagem.',
        anchor: 'projeto-repo',
      },
      { title: 'Entregar', text: 'A IA lê o repositório e dá nota de 0 a 100. A nota é 30% do Score da semana.', anchor: 'projeto-entregar' },
      { title: 'Anotação e chat', text: 'A anotação fica presa ao projeto no Caderninho. O chat tira dúvida sobre o enunciado.', anchor: 'projeto-anotacao' },
    ],
  },
  perfil: {
    title: 'Perfil do agente',
    focada: 'Essa é a sua ficha, agente. O que você veste, o que conquistou e como anda a constância.',
    items: [
      { title: 'Seu agente', text: 'O que ele está vestindo. O guarda-roupa troca as peças que você já tem.', anchor: 'perfil-agente' },
      { title: 'Números', text: 'Ofensiva, Score, posição no ranking e Gems.', anchor: 'perfil-numeros' },
      { title: 'Troféus', text: 'Ofensiva de 7 e de 30, semana perfeita, embaixador e fundador.', anchor: 'perfil-trofeus' },
      { title: 'Últimos 14 dias', text: 'Cada quadrado é um dia. Verde é dia com Daily feita.', anchor: 'perfil-dias' },
    ],
  },
  squad: {
    title: 'QG do Squad',
    focada: 'Seu esquadrão. Ninguém estuda por você, mas dá vergonha ser o único sem check hoje.',
    items: [
      {
        title: 'Escalação e meta',
        text: 'Quem já estudou hoje tem o check. A meta da semana soma as Dailies de todos, 5 por agente. O código do squad e o convite ficam aqui.',
        anchor: 'squad-hero',
      },
      { title: 'Feed', text: 'O que os colegas fizeram. A única reação é o GG. Dá pra esconder suas notas nas Configurações.', anchor: 'squad-feed' },
      {
        title: 'Notificações (líder e colíder)',
        text: 'Quem pediu pra entrar e os avisos das decisões. Recusar impede a pessoa de pedir de novo pra este squad; dá pra desfazer.',
      },
      { title: 'Ranking do squad', text: 'Mesmo Score do ranking do curso, só entre vocês.', anchor: 'squad-ranking' },
    ],
  },
  loja: {
    title: 'Loja',
    focada: 'Gems viram roupa, agente. Só visual: nada aqui compra nota nem posição no ranking.',
    items: [
      { title: 'Provador', text: 'Clique numa peça da vitrine pra ver no seu agente antes de comprar.', anchor: 'loja-agente' },
      {
        title: 'Vitrine',
        text: '6 itens sorteados só pra você, renovados toda segunda. Sem rerolar, e todo item volta um dia. Raridade: Comum, Raro, Épico e Lendário.',
        anchor: 'loja-vitrine',
      },
      { title: 'Suas Gems', text: 'Nunca expiram.' },
    ],
  },
  ranking: {
    title: 'Ranking',
    focada: 'Aqui conta a qualidade, não o tempo online. Gems medem constância; o Score mede se você entendeu.',
    items: [
      { title: 'Pódio e recortes', text: 'Semana, mês ou o curso inteiro.', anchor: 'ranking-podio' },
      { title: 'Placar', text: 'O top 10. Se você estiver fora, aparece preso no pé.', anchor: 'ranking-placar' },
      { title: 'Próximo alvo e como subir', text: 'Quem está logo acima. O resumo falado pesa 2x, roleplay e lacuna 1,5x, e o projeto é 30% da semana.', anchor: 'ranking-dicas' },
    ],
  },
  certificacoes: {
    title: 'Certificações',
    focada: 'O que o curso cobre de cada exame do mercado. Cobre tópicos, agente: não é equivalência e a Focadu não emite certificado.',
    items: [
      { title: 'Ao seu alcance', text: 'Quanto de cada exame você já estudou.', anchor: 'cert-alcance' },
      { title: 'Módulo × certificação', text: 'Quais tópicos de cada exame cada módulo toca.', anchor: 'cert-matriz' },
    ],
  },
  caderninho: {
    title: 'Caderninho',
    focada: 'Tudo o que você anotou, por semana e dia. Anotação é sua: não vale nota nem Gems.',
    items: [
      { title: 'Filtros', text: 'Período, busca e as suas tags.', anchor: 'caderninho-filtros' },
      { title: 'Por dia', text: 'As notas de cada Daily e do projeto de cada semana. Clique numa nota pra editar; Markdown leve funciona.' },
      {
        title: 'Revisar com a IA',
        text: 'Cada dia com nota tem o botão: a IA compara o que você anotou com o material do dia e aponta o que falta. Não vale nota. Até 10 por dia.',
      },
    ],
  },
};

/** Na sessao diaria, o 1o item da aba "Esta tela" troca conforme a etapa em tela. */
export const SESSION_STEP_ITEMS: Record<ActivityType, GuideItem> = {
  [ActivityType.Reading]: { title: 'Leitura', text: 'Leia com calma. Os trechos "Pra você" são analogias montadas com os seus interesses.' },
  [ActivityType.Video]: { title: 'Vídeo', text: 'Assista até o fim. Não tem nota: concluir já conta.' },
  [ActivityType.VoiceSummary]: {
    title: 'Resumo falado',
    text: 'Explique em voz alta o que entendeu, até 10 minutos. Dá pra reler suas anotações antes de gravar, não durante. Aprova com 80.',
  },
  [ActivityType.Quiz]: { title: 'Quiz', text: 'Uma opção certa. Errou? Eu explico o porquê.' },
  [ActivityType.Cloze]: { title: 'Lacuna', text: 'Complete a frase. No texto livre vale a palavra exata, sem diferença de maiúscula.' },
  [ActivityType.WordMatch]: { title: 'Ligar palavras', text: 'Toque num termo e depois na definição. Aprova com 80% dos pares.' },
  [ActivityType.Roleplay]: { title: 'Roleplay', text: 'Você decide o caminho. O melhor final vale 100, o mediano 60, o ruim 20.' },
  [ActivityType.CodeStep]: {
    title: 'Passo de código',
    text: 'Escreva o que o passo pede, rode na sua máquina contra o arquivo do dia e mande o código com a saída. Ajustar não conta como erro; na 3ª tentativa a solução aparece. Sintaxe? Pergunte no "Tire sua dúvida".',
  },
};

export const REINFORCEMENT_ITEM: GuideItem = {
  title: 'Sessão de reforço',
  text: 'Só as atividades que você errou, fora da cota do dia. Tudo aprovado vale +2 Gems no lugar do +1.',
};

export const BRIDGE_ITEM: GuideItem = {
  title: 'Ponte',
  text: 'O 6º dia leva a teoria da semana pro código do projeto: um exemplo explicado e passos de código com a Focada conferindo, até entregar um script parecido com o projeto. A linguagem escolhida vale pra ponte e pro projeto, sem troca depois.',
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Como funciona a ofensiva?',
    a: 'Conta os dias seguidos com Daily feita. A cada 7 dias você tem 1 folga, gasta sozinha quando você falta. Com o projeto da semana aberto, a ofensiva pausa até a semana fechar (no máximo 14 dias).',
  },
  { q: 'O que são Gems e como eu ganho?', a: '+1 por Daily nova, +5 por semana perfeita, +30 por mês perfeito e +2 por reforço todo aprovado. Até 70 por mês. Não expiram e servem pra Loja.' },
  { q: 'Por que caí numa sessão de reforço?', a: 'Porque errou 3 vezes no mesmo dia antes de terminar. O reforço tem só o que você errou e não gasta a Daily do dia.' },
  { q: 'Posso fazer mais de uma Daily por dia?', a: 'Não. Uma Daily nova por dia, por curso. Rever um dia já feito é livre e não mexe em nota.' },
  { q: 'O que é a ponte do 6º dia?', a: 'Um dia prático que leva a teoria da semana pro código do projeto, na linguagem que você escolher.' },
  { q: 'Como o Projeto Semanal é avaliado?', a: 'Você entrega e a IA lê o seu repositório contra o enunciado. A nota vai de 0 a 100 e vale 30% do Score da semana.' },
  { q: 'Por que preciso publicar o módulo?', a: 'É a prova pública do que você fez. Sem ela, a semana seguinte não abre.' },
  { q: 'Como o ranking pontua?', a: 'Pelo Score de Estudo: a média das suas respostas (o resumo falado pesa mais) e a nota do projeto. Gems não contam.' },
  { q: 'O que a vitrine da Loja sorteia?', a: '6 itens por semana, só pra você, renovados toda segunda. Não dá pra rerolar e todo item volta um dia.' },
  { q: 'Pra que serve o Squad?', a: 'Estudar junto: meta da semana em grupo, feed de atividades com GG e ranking próprio.' },
  {
    q: 'Como eu entro num squad?',
    a: 'Pede o código pra quem já está nele e usa em "Entrar com código". Vira um pedido: o líder ou o colíder aceita. O pedido vence em 7 dias e dá pra cancelar.',
  },
  { q: 'Qual a nota pra passar numa atividade?', a: '80 de 100.' },
  {
    q: 'A IA revisa minhas anotações?',
    a: 'Sim, se você pedir: no Caderninho, cada dia com nota tem "Revisar com a IA". Ela diz o que está bom, o que falta e se confere com o material. Não vale nota nem Gems.',
  },
  { q: 'Perdi a ofensiva. E agora?', a: 'Recomeça do 1, e os troféus que você já ganhou ficam. A folga existe justamente pra um dia ruim.' },
];

/** Qual tela do guia esta aberta, pela URL (as sub-telas de /start vivem na query string). */
export function guideScreenFor(pathname: string, search: string): GuideScreenKey | null {
  if (pathname === '/login') return 'login';
  if (pathname === '/esqueci-senha' || pathname === '/redefinir-senha') return 'senha';
  if (pathname.startsWith('/onboarding') || pathname === '/selecionar-curso') return 'onboarding';
  if (pathname === '/hoje') return 'sessao';
  if (pathname === '/loja') return 'loja';
  if (pathname === '/perfil') return 'perfil';
  if (pathname === '/squad') return 'squad';
  if (pathname !== '/start') return null;
  const q = new URLSearchParams(search);
  if (!q.get('course')) return 'start';
  if (q.get('weekly')) return q.has('project') ? 'projeto' : 'semana';
  if (q.has('ranking')) return 'ranking';
  if (q.has('certifications') || q.get('tab') === 'certificacoes') return 'certificacoes';
  if (q.has('caderninho') || q.get('tab') === 'caderninho') return 'caderninho';
  return 'trilha';
}

export interface TourStep {
  /** Tela onde o passo acontece; o tour navega ate ela. */
  screen: GuideScreenKey;
  anchor?: string;
  title: string;
  text: string;
}

/**
 * Tour do app inteiro (1o acesso, decisao do dono em 27/09/2026): passa pelas telas principais e
 * termina no botao "?", de onde o aluno chama o tour de cada tela quando quiser.
 */
export const APP_TOUR: TourStep[] = [
  { screen: 'start', title: 'Bem-vindo ao QG, agente', text: 'Vou te mostrar o app rapidinho. Dá pra pular quando quiser e rever depois pelo botão "?".' },
  { screen: 'start', anchor: 'nav-solo', title: 'O menu', text: 'Hoje, Trilhas, Loja e Ranking. Do outro lado, o Squad e o seu perfil. O logo no meio volta pra cá.' },
  { screen: 'start', anchor: 'start-missao', title: 'Sua missão do dia', text: 'Uma Daily por dia, em etapas: leitura, vídeo, atividades e o resumo falado. É daqui que você começa todo dia.' },
  { screen: 'start', anchor: 'start-agente', title: 'Seu agente', text: 'Ofensiva e Gems. A ofensiva conta dias seguidos de estudo; as Gems viram roupa na Loja.' },
  { screen: 'trilha', anchor: 'trilha-mapa', title: 'A trilha', text: 'O curso inteiro num mapa. Cada semana termina num castelo: o Projeto Semanal.' },
  { screen: 'perfil', anchor: 'perfil-agente', title: 'Seu perfil', text: 'Sua ficha: o agente, os troféus e os últimos 14 dias.' },
  { screen: 'squad', title: 'O Squad', text: 'Estudar junto: meta da semana em grupo, feed dos colegas e ranking próprio.' },
  { screen: 'loja', anchor: 'loja-vitrine', title: 'A Loja', text: 'Gems compram roupa pro agente. Só visual, nada compra nota.' },
  { screen: 'ranking', anchor: 'ranking-placar', title: 'O Ranking', text: 'Conta a qualidade das respostas, não o tempo online.' },
  { screen: 'start', anchor: 'ajuda', title: 'Se perder, me chama aqui', text: 'Esse botão (ou a tecla ?) explica a tela em que você está, responde as dúvidas comuns e chama o tour da tela.' },
];

/** Chaves guardadas em User.SeenGuides (backend valida o formato). */
export const APP_TOUR_KEY = 'tour:app';
export const screenSeenKey = (screen: GuideScreenKey) => `tela:${screen}`;
