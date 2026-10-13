// Fase 94, Painel de gestao: formatos usados nas abas (o app nao tem @usuario - o "@" sai do e-mail).

/** "@ana" a partir de "ana@exemplo.com". Com `hidden`, vira "aluno 01" na ordem recebida (Ocultar nomes). */
export function handleOf(email: string, hidden = false, index = 0): string {
  if (hidden) return `aluno ${String(index + 1).padStart(2, '0')}`;
  return `@${email.split('@')[0]}`;
}

/** US$ com virgula. Valor menor que 1 centavo ganha mais casas, pra nao virar "US$ 0,00" quando nao e zero. */
export function usd(value: number, digits?: number): string {
  const d = digits ?? (value !== 0 && Math.abs(value) < 0.01 ? 4 : 2);
  return `US$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function num(value: number, digits = 0): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 3.720.000 -> "3,72 M"; 402.000 -> "402 mil". */
export function compact(value: number): string {
  if (value >= 1_000_000) return `${num(value / 1_000_000, 2)} M`;
  if (value >= 1_000) return `${num(Math.round(value / 1_000))} mil`;
  return num(value);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "hoje 09:12", "ontem 21:40" ou "03/10 18:05". */
export function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(date, now)) return `hoje ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `ontem ${time}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

/** "05/10/2026". */
export function dateBr(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

/** "05/10". */
export function dayMonth(isoOrDate: string): string {
  const [y, m, d] = isoOrDate.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}` : isoOrDate;
}

/** Link da Focadu que o Claude abre ("Abrir no Claude"): sessao do Remote Control no Mac do dono. */
export const CLAUDE_URL: string = import.meta.env.VITE_CLAUDE_URL ?? 'https://claude.ai/code';

/** Link completo do convite: a Api devolve relativo ("/login?convite=CODIGO") e o painel roda no mesmo dominio do cadastro. */
export function fullLink(invite: { link: string }): string {
  return `${window.location.origin}${invite.link}`;
}
