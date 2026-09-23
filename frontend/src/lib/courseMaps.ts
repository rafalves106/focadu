import webSecurity1 from '../assets/mapa/web-security/regiao-1.png';
import webSecurity2 from '../assets/mapa/web-security/regiao-2.png';
import webSecurity3 from '../assets/mapa/web-security/regiao-3.png';
import webSecurity4 from '../assets/mapa/web-security/regiao-4.png';
import webSecurity1Json from '../assets/mapa/web-security/regiao-1.json';
import webSecurity2Json from '../assets/mapa/web-security/regiao-2.json';
import webSecurity3Json from '../assets/mapa/web-security/regiao-3.json';
import webSecurity4Json from '../assets/mapa/web-security/regiao-4.json';

/**
 * Mapa da trilha (Fase 65, ver secret/rascunhos/mapa-da-trilha-pixel-art.md): cada curso com mapa
 * tem uma arte desenhada por Monthly (regiao) + a posicao de cada ponto nela, em pixels da arte a 1x
 * (384x192). Arte e posicoes saem dos mesmos scripts do Figma (secret/curadoria/scripts/mapa/
 * exportar-frontend.js) - nunca editar os PNG/JSON a mao aqui.
 *
 * Curso sem mapa (ou Monthly sem regiao desenhada) cai na lista de semanas de antes.
 */
export const REGION_WIDTH = 384;
export const REGION_HEIGHT = 192;

type Point = [number, number];

export interface MapRegion {
  monthlyNumber: number;
  /** Titulo do mes com acento (o do seed vem sem acento, ex. "Deteccao"). */
  titulo: string;
  image: string;
  entrada: Point;
  saida: Point;
  /** `dia-N` (DayNumber) e `projeto-semana-N` (numero da Weekly) -> centro do ponto, a 1x. */
  pontos: Record<string, Point>;
  /** [x, y, largura, altura] da ilha de cada semana do mes, em ordem - a nevoa cobre a partir da 1a semana trancada. */
  ilhas: [number, number, number, number][];
}

interface RegionJson {
  monthlyNumber: number;
  titulo: string;
  ilhas: number[][];
  entrada: number[];
  saida: number[];
  pontos: Record<string, number[]>;
}

function region(json: RegionJson, image: string): MapRegion {
  const pontos: Record<string, Point> = {};
  for (const [key, [x, y]] of Object.entries(json.pontos)) pontos[key] = [x, y];
  return {
    monthlyNumber: json.monthlyNumber,
    titulo: json.titulo,
    image,
    entrada: [json.entrada[0], json.entrada[1]],
    saida: [json.saida[0], json.saida[1]],
    pontos,
    ilhas: json.ilhas.map(([x, y, w, h]) => [x, y, w, h]),
  };
}

/** Chave = nome do curso normalizado (Course nao tem slug no dominio). */
const COURSE_MAPS: Record<string, MapRegion[]> = {
  'web-security': [
    region(webSecurity1Json, webSecurity1),
    region(webSecurity2Json, webSecurity2),
    region(webSecurity3Json, webSecurity3),
    region(webSecurity4Json, webSecurity4),
  ],
};

export function courseSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Regioes do mapa deste curso, por numero do Monthly - null se o curso nao tem mapa. */
export function findCourseMap(courseName: string): Map<number, MapRegion> | null {
  const regions = COURSE_MAPS[courseSlug(courseName)];
  return regions ? new Map(regions.map((r) => [r.monthlyNumber, r])) : null;
}
