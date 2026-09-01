/**
 * Fase 25 - configuracao do mapa do mundo (tela de inicio). Espaco de coordenadas = pixels
 * NATURAIS da imagem `assets/world/mapa-vilarejo.png` (2304x1296) - o componente que renderiza o
 * mapa escala isso pra caber na tela via % (left/top), entao nao importa o tamanho real exibido.
 *
 * Coordenadas das 5 zonas sao uma 1a estimativa visual (foto do mapa, sem medir pixel a pixel) -
 * pensadas pra ser calibradas ao vivo: o botao "Ajustar zonas" do WorldMapPage mostra os circulos
 * + a posicao atual do personagem em tempo real, pra corrigir aqui se a porta nao bater certo.
 */
export const WORLD_WIDTH = 2304;
export const WORLD_HEIGHT = 1296;

/** Onde o personagem aparece ao entrar na tela - perto do chafariz central, na praca. */
export const START_POSITION = { x: 1152, y: 860 };

export interface WorldTriggerZone {
  id: string;
  /** Rotulo mostrado tanto no letreiro sempre visivel (HouseLabel) quanto no modo de ajuste de zonas. */
  label: string;
  x: number;
  y: number;
  /** Raio do gatilho, em pixels do mundo. */
  radius: number;
  /** Onde o letreiro flutua (perto do topo/fachada da construcao - NAO em cima da porta, que e `y`). */
  labelY: number;
  /** Pra onde navegar ao entrar na zona - recebe o id do curso ativo (pode ser null). */
  to: (courseId: string | null) => string;
}

export const WORLD_TRIGGER_ZONES: WorldTriggerZone[] = [
  // Torre (topo-esquerda) -> sessao diaria.
  { id: 'hoje', label: 'Hoje', x: 242, y: 530, radius: 46, labelY: 190, to: () => '/hoje' },
  // Castelo (topo-direita) -> trilha do curso (Ranking fica ancorado la dentro, como ja e hoje).
  {
    id: 'trilha',
    label: 'Trilha do Curso',
    x: 1958,
    y: 461,
    radius: 50,
    labelY: 130,
    to: (courseId) => (courseId ? `/start?course=${courseId}` : '/start'),
  },
  // Casinha (baixo-esquerda) -> perfil.
  { id: 'perfil', label: 'Perfil', x: 438, y: 1158, radius: 44, labelY: 1000, to: () => '/perfil' },
  // Celeiro/fazenda (baixo-direita) -> loja de cosmeticos.
  { id: 'loja', label: 'Loja', x: 1820, y: 1118, radius: 46, labelY: 780, to: () => '/loja' },
  // Campo de treino (topo-centro) -> squad.
  { id: 'squad', label: 'Squad', x: 806, y: 346, radius: 40, labelY: 160, to: () => '/perfil?tab=squad' },
];
