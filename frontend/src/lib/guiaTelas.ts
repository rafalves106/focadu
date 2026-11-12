import { ActivityType } from '../api/types';

/**
 * Ajuda das telas (Fase 75; redesign v1, Fase 109). Desde a Fase 109 a ajuda é um modal aberto pelo
 * item "Ajuda desta tela" do menu do agente (Figma `33:1655`): título da tela, uma fala da Focada e os
 * itens abaixo em lista. Saíram o botão "?" flutuante, a dica da 1ª visita e os tours (decisão do dono,
 * docs/design/direcao.md §6.5).
 *
 * Vocabulário do redesign (direcao.md §6.1): Dia (não "Daily"), Hoje (não "Missão do dia"), erros do dia
 * (não "conta-giros"), sequência (não "ofensiva"), code comigo (não "ponte"), Projeto da semana.
 * Textos na voz de secret/curadoria/GUIA-DE-VOZ-FOCADA.md. Regra: mudou a tela, atualize a ajuda dela aqui.
 *
 * As telas fora do app (login, senha, confirmar, aceite, onboarding) continuam aqui, mas hoje não têm
 * por onde abrir a ajuda (não têm menu do agente); voltam quando essas telas forem refeitas (etapa 5).
 */

export type GuideScreenKey =
  | 'login'
  | 'senha'
  | 'confirmar'
  | 'aceite'
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
  | 'caderninho'
  | 'gestao';

export interface GuideItem {
  title: string;
  text: string;
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
      { title: 'Esqueceu a senha?', text: 'O link manda um e-mail pra criar outra, válido por 1 hora.' },
      { title: 'Criar conta', text: 'Se você veio por indicação, o código já vem preenchido.' },
      {
        title: 'Termos e privacidade',
        text: 'Pra criar a conta é preciso aceitar os Termos de Uso e a Política de Privacidade, inclusive o envio da sua voz à IA que avalia. Os dois abrem em outra aba, sem perder o que você digitou.',
      },
      {
        title: 'Convite de tester',
        text: 'No teste fechado, a conta só nasce com convite. Veio pelo link? O código já está lá. Senão, digite os 8 caracteres.',
      },
    ],
  },
  aceite: {
    title: 'Atualizamos nossos termos',
    outside: true,
    focada: 'Mudamos os termos, agente. Leia e me diga se está tudo certo.',
    items: [
      {
        title: 'Por que aparece?',
        text: 'Contas criadas antes dos termos, e qualquer mudança no texto, pedem um aceite novo. Seu progresso fica guardado.',
      },
      { title: 'Não quero aceitar', text: 'Use "Sair". Sem o aceite, o app não abre.' },
    ],
  },
  confirmar: {
    title: 'Confirmar e-mail',
    outside: true,
    focada: 'Último passo: me conta os 6 números que chegaram no seu e-mail.',
    items: [
      { title: 'Cadê o código?', text: 'Chega em até um minuto e vale por 15. Olhe também o spam. Não chegou? Peça outro no "Reenviar código".' },
      { title: 'Errei o e-mail', text: 'Use "Sair e usar outra conta" e crie a conta de novo com o e-mail certo.' },
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
      { title: 'Seus interesses', text: 'Viram exemplos nas leituras, montados pra você. Dá pra mudar depois nas Configurações.' },
      { title: 'Linguagens', text: 'As que você topa usar nos projetos. A escolha de cada projeto vem depois.' },
      { title: 'O curso', text: '"Ver curso" mostra o que o curso cobre e o que ajuda saber antes.' },
      { title: 'A trilha', text: 'Cada curso tem a sua. No Web Security, cada semana fecha num Projeto da semana.' },
    ],
  },
  start: {
    title: 'Início',
    focada: 'Aqui é o seu começo de dia: o que fazer agora, quanto falta pro projeto e o que ficou pendente.',
    items: [
      { title: 'Hoje', text: 'O Dia de hoje, em etapas. É daqui que você começa.' },
      { title: 'Caminho da semana', text: 'Os dias que faltam até o Projeto da semana. O 6º é o code comigo.' },
      { title: 'Você', text: 'Sequência, gems e os dias da semana em que você estudou.' },
      { title: 'Pendências', text: 'Reforço em âmbar: só o que você errou, uns 5 minutos.' },
      { title: 'Seus cursos', text: 'Cada curso guarda o próprio progresso. O escolhido muda a tela.' },
    ],
  },
  trilha: {
    title: 'Trilha',
    focada: 'O curso inteiro numa trilha. Cada aba é um módulo, cada linha é uma semana. Eu fico parada no próximo Dia.',
    items: [
      { title: 'Seu progresso', text: 'Quanto do curso você já fez.' },
      {
        title: 'Dias, code comigo e projeto',
        text: 'Cada quadrado é um Dia: verde feito, piscando em andamento, cadeado trancado. O 6º dia, com borda âmbar, é o code comigo. O castelo no fim da linha é o Projeto da semana, e só aparece em curso que tem projeto. Clique num quadrado pra abrir o Dia.',
      },
      { title: 'Reforço pendente', text: 'O selo no canto do Dia avisa que tem reforço. Clique no Dia e escolha "Fazer reforço".' },
      { title: 'Módulos', text: 'Em curso com mais de um módulo, as abas em cima trocam de módulo. Em curso de um módulo só, elas não aparecem.' },
      { title: 'Resumo e atalhos', text: 'Números do curso e os caminhos pro Ranking, Caderninho e Certificações.' },
      { title: 'Mais de um curso?', text: 'O "Trocar de trilha", embaixo do seu progresso, abre a trilha do outro curso.' },
    ],
  },
  semana: {
    title: 'Visão da semana',
    focada: 'Aqui é a sua semana inteira, agente: seis dias e o Projeto da semana fechando a linha.',
    items: [
      { title: 'Os dias', text: 'Atividades aprovadas de cada Dia, e o Dia atual em destaque. Um Dia novo por dia.' },
      { title: 'Code comigo', text: 'O 6º dia é prático, na linguagem do projeto (ou do curso, quando ele não tem projeto). É ele que abre o Projeto da semana.' },
      { title: 'Projeto da semana', text: 'A semana seguinte só abre com ele avaliado. No curso sem projeto, a semana fecha junto com o code comigo.' },
      { title: 'Faixa âmbar', text: 'Quando aparece, falta publicar o módulo pra próxima semana abrir.' },
      { title: 'Resumo da semana', text: 'Dias feitos, aprovação e as certificações que o módulo cobre.' },
    ],
  },
  sessao: {
    title: 'Dia',
    focada: 'Uma etapa por vez, agente. Eu apresento cada bloco e comento quando você erra. Na conversa por voz é você explicando, não a IA.',
    items: [
      { title: 'Etapas', text: 'Onde você está e quanto falta. Dá pra voltar pra etapa anterior sem refazer.' },
      { title: 'Erros do dia', text: 'Cada erro antes de terminar o Dia soma 1. No 3º, nasce um reforço só com o que você errou.' },
      { title: 'Material e Pomodoro', text: 'O conteúdo de hoje pra consultar e o timer, se você usa. Em tela de notebook ficam num trilho: clique e abre a gaveta.' },
      {
        title: 'Anotação e dúvida rápida',
        text: 'Anote sem sair do Dia e tire dúvida curta sobre o que está na tela. No notebook ficam no trilho da direita; o ponto âmbar é rascunho não salvo ou resposta nova. Esc fecha a gaveta.',
      },
      { title: 'Barra de baixo', text: 'No celular: material, notas, dúvida e Pomodoro.' },
      { title: 'Aquecimento', text: 'No começo do Dia, 2 perguntas de dias anteriores pra recuperar o que você já viu. Não conta erro nem nota, e dá pra pular. No primeiro Dia não tem.' },
      {
        title: 'Conversa por voz',
        text: 'Cada bloco tem uma pergunta da Focada: você responde falando. A devolutiva vem em duas partes, a resposta certa e depois os pontos a melhorar. No fim, a pergunta final pede o Dia inteiro com suas palavras, com 3 tópicos pra organizar a fala.',
      },
      { title: 'Feedback do dia', text: 'Depois de fechar o Dia, você dá uma nota de clareza de 1 a 5 e diz onde travou. Só a nota é obrigatória, e dá pra pular. Isso ajuda a melhorar o curso.' },
      { title: 'Teclado', text: 'Teclas 1 a N escolhem, Enter confirma.' },
      { title: 'Mais de um curso?', text: 'O Hoje pergunta qual curso estudar antes de abrir. Cada curso tem o seu Dia.' },
      { title: 'Tudo em dia', text: 'Se você fez todos os dias que o curso tem até agora, o Hoje mostra o resumo do que conquistou. Os próximos dias aparecem no Início quando saírem.' },
    ],
  },
  projeto: {
    title: 'Projeto da semana',
    focada: 'Você escreve o código no seu repositório e eu corrijo quando você entregar. Tirar print não conta.',
    items: [
      { title: 'O enunciado', text: 'O resumo está aqui; o enunciado completo está no README do repositório: "Abrir README.md" abre aqui mesmo, sem sair do app.' },
      { title: 'Repositório e referências', text: 'Copie o git clone. O token é a senha e aparece uma vez só: gerar outro revoga o anterior. Embaixo, a documentação da sua linguagem.' },
      { title: 'Entregar', text: 'A IA lê o repositório e dá nota de 0 a 100. A nota é 30% do Score da semana.' },
      { title: 'Anotação e chat', text: 'A anotação fica presa ao projeto no Caderninho. O chat tira dúvida sobre o enunciado. No notebook, repositório e chat ficam nos trilhos laterais e abrem como gaveta.' },
    ],
  },
  perfil: {
    title: 'Perfil',
    focada: 'Essa é a sua ficha, agente. O que você veste, o que conquistou e como anda a sequência.',
    items: [
      { title: 'Seu agente', text: 'O que ele está vestindo. O guarda-roupa troca as peças que você já tem.' },
      { title: 'Números', text: 'Sequência, Score, posição no ranking e gems.' },
      { title: 'Troféus', text: 'Sequência de 7 e de 30 dias, semana perfeita, embaixador e fundador.' },
      { title: 'Últimos 14 dias', text: 'Cada quadrado é um dia. Verde é dia com o Dia feito.' },
      { title: 'Mais de um curso?', text: 'O seletor no topo troca o curso do progresso, do Score e da posição.' },
    ],
  },
  squad: {
    title: 'Squad',
    focada: 'Seu squad. Ninguém estuda por você, mas dá vergonha ser o único sem check hoje.',
    items: [
      { title: 'Escalação e meta', text: 'Quem já estudou hoje tem o check. A meta da semana soma os Dias de todos, 5 por agente. O código do squad e o convite ficam aqui.' },
      { title: 'Feed', text: 'O que os colegas fizeram. A única reação é o GG. Dá pra esconder suas notas nas Configurações.' },
      { title: 'Pedidos (líder e colíder)', text: 'Quem pediu pra entrar e os avisos das decisões. Recusar impede a pessoa de pedir de novo pra este squad; dá pra desfazer.' },
      { title: 'Ranking do squad', text: 'Mesmo Score do ranking do curso, só entre vocês. Com mais de um curso, escolha qual ou "Todos".' },
    ],
  },
  loja: {
    title: 'Loja',
    focada: 'Gems viram roupa, agente. Só visual: nada aqui compra nota nem posição no ranking.',
    items: [
      { title: 'Provador', text: 'Clique numa peça da vitrine pra ver no seu agente antes de comprar.' },
      { title: 'Vitrine', text: '6 itens sorteados só pra você, renovados toda segunda. Sem rerolar, e todo item volta um dia. Raridade: Comum, Raro, Épico e Lendário.' },
      { title: 'Suas gems', text: 'Nunca expiram.' },
    ],
  },
  ranking: {
    title: 'Ranking',
    focada: 'Aqui conta a qualidade, não o tempo online. Gems medem constância; o Score mede se você entendeu.',
    items: [
      { title: 'Pódio e recortes', text: 'Semana, mês ou o curso inteiro.' },
      { title: 'Placar', text: 'O top 10. Se você estiver fora, aparece preso no pé.' },
      { title: 'Mais de um curso?', text: 'Cada curso tem o seu ranking: troque no seletor do topo.' },
      { title: 'Próximo alvo e como subir', text: 'Quem está logo acima. A conversa por voz pesa 2x, roleplay e lacuna 1,5x, e o projeto é 30% da semana.' },
    ],
  },
  certificacoes: {
    title: 'Certificações',
    focada: 'O que o curso cobre de cada exame do mercado. Cobre tópicos, agente: não é equivalência e a Focadu não emite certificado.',
    items: [
      { title: 'Ao seu alcance', text: 'Quanto de cada exame você já estudou.' },
      { title: 'Módulo × certificação', text: 'Quais tópicos de cada exame cada módulo toca.' },
    ],
  },
  caderninho: {
    title: 'Caderninho',
    focada: 'Tudo o que você anotou, por semana e dia. Anotação é sua: não vale nota nem gems.',
    items: [
      { title: 'Filtros', text: 'Período, busca e as suas tags.' },
      { title: 'Por dia', text: 'As notas de cada Dia e do projeto de cada semana. Clique numa nota pra editar; Markdown leve funciona.' },
      { title: 'Revisar com a IA', text: 'Cada dia com nota tem o botão: a IA compara o que você anotou com o material do Dia e aponta o que falta. Não vale nota. Até 10 por dia.' },
    ],
  },
  // Fase 94: Painel de gestao (so admin - o aluno nunca chega aqui).
  gestao: {
    title: 'Painel de gestão',
    focada: 'Bastidor da Focadu: só quem é admin vê. Nada daqui aparece pro aluno.',
    items: [
      { title: 'Visão geral', text: 'Alunos ativos, cadastros por convite, dias concluídos, custo de IA do mês e quantos dias cada curso tem curados.' },
      {
        title: 'Alunos',
        text: 'Clique num aluno pra ver o progresso por curso e a turma dele. No bloco Conta: editar nome e e-mail (trocar o e-mail pede nova confirmação), enviar a redefinição de senha (você nunca vê a senha), tornar ou tirar admin e desativar. Desativar bloqueia o acesso na hora e tira o aluno do ranking e do squad, sem apagar nada; o filtro Desativados mostra quem foi e deixa reativar. "Resetar progresso" zera um curso só e pede o e-mail do aluno pra confirmar.',
      },
      {
        title: 'Turmas',
        text: 'Uma turma junta alunos e os cursos deles. Quem entra por convite da turma é matriculado nos cursos dela e só vê esses cursos. Curso que entra matricula a turma na hora; arquivar mantém os alunos e para os convites.',
      },
      { title: 'Convites', text: 'Criar convite (1 a 20 usos, 1 a 30 dias, sempre vence), com ou sem turma, copiar o link e revogar.' },
      {
        title: 'Cursos',
        text: 'O texto de cada curso no catálogo. Crie um curso vazio, edite descrição, "antes de começar" e recomendados, publique ou arquive. Publicar exige ao menos um dia importado. Arquivar não apaga nada e quem já está matriculado continua com acesso. Editado no Painel, o texto deixa de ser reescrito pelo curso.json; "Voltar ao curso.json" desfaz.',
      },
      {
        title: 'Curadoria',
        text: 'Arquivo em secret/conteudo x banco, dia a dia. Marque dias novos ou diferentes, veja a prévia do linter e importe: é tudo ou nada. Dia só no banco sai pelo "Apagar dias antigos". Em cima, quem vê o curso: todos ou só as turmas.',
      },
      { title: 'Uso de IA', text: 'Quanto a IA custa, por tipo de chamada e por aluno, e os limites: gasto por aluno por dia (passou, a IA espera o dia seguinte) e teto do mês (passou, o texto troca para o modelo reserva). Preços e limites são editáveis.' },
      {
        title: 'Retenção',
        text: 'Quem volta depois do cadastro (D1, D7 e D30 por semana de cadastro, contando quem abriu o app ou quem fez um Dia), quem fez um Dia e entregou o Projeto da semana, onde os alunos param e de qual aparelho abrem cada tela. Tudo é calculado ao abrir a aba; admins e contas desativadas ficam fora.',
      },
      { title: 'Abrir no Claude', text: 'Leva pra sessão do Claude Code. Não é um chat dentro do app.' },
    ],
  },
};

/** No Dia, o 1o item da ajuda troca conforme a etapa em tela. */
export const SESSION_STEP_ITEMS: Record<ActivityType, GuideItem> = {
  [ActivityType.Reading]: { title: 'Leitura', text: 'Leia com calma. Os trechos "Pra você" são exemplos montados com os seus interesses.' },
  [ActivityType.Video]: { title: 'Vídeo', text: 'Assista até o fim. Não tem nota: concluir já conta.' },
  [ActivityType.VoiceSummary]: {
    title: 'Conversa por voz',
    text: 'Responda em voz alta à pergunta da Focada, com o limite de gravação das Configurações. Dá pra reler suas anotações antes de gravar, não durante. Depois vêm a resposta certa e os pontos a melhorar. Aprova com 80.',
  },
  [ActivityType.Quiz]: { title: 'Quiz', text: 'Uma opção certa. Errou? Eu explico o porquê.' },
  [ActivityType.Cloze]: { title: 'Lacuna', text: 'Complete a frase. No texto livre vale a palavra exata, sem diferença de maiúscula.' },
  [ActivityType.WordMatch]: { title: 'Ligar palavras', text: 'Toque num termo e depois na definição. Aprova com 80% dos pares.' },
  [ActivityType.Roleplay]: { title: 'Roleplay', text: 'Você decide o caminho. O melhor final vale 100, o mediano 60, o ruim 20.' },
  [ActivityType.CodeStep]: {
    title: 'Passo de código',
    text: 'Escreva o que o passo pede. Com laboratório, você roda o código aqui mesmo e só envia depois de rodar; sem ele, rode na sua máquina e cole a saída. A dica da Focada (3 por passo) não gasta tentativa. Ajustar não conta como erro; na 3ª tentativa a solução aparece.',
  },
  [ActivityType.TerminalMission]: {
    title: 'Missão no terminal',
    text: 'Um Linux de verdade roda aqui no navegador, já com você logado. Cada missão diz a situação, o que você vai ver quando der certo e os passos; ao lado, os comandos do Dia (clique copia pro terminal). O laboratório confere sozinho, sem nota nem tentativa. clear ou Ctrl+L limpa a tela. Só no computador.',
  },
};

export const REINFORCEMENT_ITEM: GuideItem = {
  title: 'Reforço',
  text: 'Só as atividades que você errou, fora do Dia novo de hoje. Tudo aprovado vale +2 gems no lugar do +1.',
};

export const BRIDGE_ITEM: GuideItem = {
  title: 'Code comigo',
  text: 'O 6º dia leva a teoria da semana pro código do projeto: um exemplo explicado e passos de código com a Focada conferindo, até entregar um script parecido com o projeto. A linguagem escolhida vale pro code comigo e pro projeto, sem troca depois.',
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Como funciona a sequência?',
    a: 'Conta os dias seguidos com o Dia feito. A cada 7 dias você tem 1 folga, gasta sozinha quando você falta. Com o Projeto da semana aberto, a sequência pausa até a semana fechar (no máximo 14 dias).',
  },
  { q: 'O que são gems e como eu ganho?', a: '+1 por Dia novo, +5 por semana perfeita, +30 por mês perfeito e +2 por reforço todo aprovado. Até 70 por mês. Não expiram e servem pra Loja.' },
  { q: 'Por que caí num reforço?', a: 'Porque errou 3 vezes no mesmo Dia antes de terminar. O reforço tem só o que você errou e não gasta o Dia novo de hoje.' },
  { q: 'Posso fazer mais de um Dia por dia?', a: 'Não. Um Dia novo por dia, por curso. Rever um Dia já feito é livre e não mexe em nota.' },
  {
    q: 'O laboratório de código roda no servidor?',
    a: 'Não: roda no seu navegador, só no computador (no celular você lê o enunciado). Na primeira vez baixa de 10 a 25 MB, conforme o curso, e depois fica guardado. Só o código e a saída que você envia vão pra Focada conferir.',
  },
  { q: 'O que é o code comigo?', a: 'O 6º dia da semana: um dia prático que leva a teoria da semana pro código do projeto, na linguagem que você escolher.' },
  { q: 'Como o Projeto da semana é avaliado?', a: 'Você entrega e a IA lê o seu repositório contra o enunciado. A nota vai de 0 a 100 e vale 30% do Score da semana.' },
  {
    q: 'Por que preciso publicar o módulo?',
    a: 'É a prova pública do que você fez. A Focada escreve um rascunho com o que você estudou e o projeto entregue e monta a imagem da semana; você publica no LinkedIn com a imagem e cola o link. Sem ela, a semana seguinte não abre.',
  },
  { q: 'Como o ranking pontua?', a: 'Pelo Score de Estudo: a média das suas respostas (a conversa por voz pesa mais) e a nota do projeto. Gems não contam.' },
  { q: 'O que a vitrine da Loja sorteia?', a: '6 itens por semana, só pra você, renovados toda segunda. Não dá pra rerolar e todo item volta um dia.' },
  { q: 'Pra que serve o Squad?', a: 'Estudar junto: meta da semana em grupo, feed de atividades com GG e ranking próprio.' },
  {
    q: 'Como eu entro num squad?',
    a: 'Pede o código pra quem já está nele e usa em "Entrar com código". Vira um pedido: o líder ou o colíder aceita. O pedido vence em 7 dias e dá pra cancelar.',
  },
  { q: 'Qual a nota pra passar numa atividade?', a: '80 de 100.' },
  {
    q: 'A IA revisa minhas anotações?',
    a: 'Sim, se você pedir: no Caderninho, cada dia com nota tem "Revisar com a IA". Ela diz o que está bom, o que falta e se confere com o material. Não vale nota nem gems.',
  },
  { q: 'Perdi a sequência. E agora?', a: 'Recomeça do 1, e os troféus que você já ganhou ficam. A folga existe justamente pra um dia ruim.' },
];

/** Qual tela esta aberta, pela URL (as sub-telas de /start vivem na query string). */
export function guideScreenFor(pathname: string, search: string): GuideScreenKey | null {
  if (pathname === '/login') return 'login';
  if (pathname === '/esqueci-senha' || pathname === '/redefinir-senha') return 'senha';
  if (pathname === '/confirmar-email') return 'confirmar';
  if (pathname === '/aceite') return 'aceite';
  if (pathname.startsWith('/onboarding') || pathname === '/selecionar-curso') return 'onboarding';
  if (pathname === '/hoje') return 'sessao';
  if (pathname === '/loja') return 'loja';
  if (pathname === '/perfil') return 'perfil';
  if (pathname === '/squad') return 'squad';
  if (pathname.startsWith('/gestao')) return 'gestao';
  if (pathname !== '/start') return null;
  const q = new URLSearchParams(search);
  if (!q.get('course')) return 'start';
  if (q.get('weekly')) return q.has('project') ? 'projeto' : 'semana';
  if (q.has('ranking')) return 'ranking';
  if (q.has('certifications') || q.get('tab') === 'certificacoes') return 'certificacoes';
  if (q.has('caderninho') || q.get('tab') === 'caderninho') return 'caderninho';
  return 'trilha';
}
