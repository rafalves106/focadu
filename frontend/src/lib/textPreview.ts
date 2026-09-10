/**
 * Reduz um texto em Markdown (ex: WeeklyProjectDto.specText) a uma linha de preview plana - usado
 * em cards com line-clamp, que so tem espaco pra 1-2 linhas e nao rodam um parser de markdown de
 * verdade. Sem isso, sintaxe crua tipo "### Objetivo" ou quebras de linha aparecem literalmente
 * grudadas no texto (ver WeeklyProjectCard). O texto completo (com formatacao real) continua
 * indo pra WeeklyProjectPage via whitespace-pre-line - esta funcao e so pro resumo truncado.
 */
export function toPlainTextPreview(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '') // titulos ("### Objetivo" -> "Objetivo")
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // negrito
    .replace(/(\*|_)(.*?)\1/g, '$2') // italico
    .replace(/`([^`]*)`/g, '$1') // codigo inline
    .replace(/\s+/g, ' ') // colapsa quebras de linha/espacos em uma linha continua
    .trim();
}
