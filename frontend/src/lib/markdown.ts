/**
 * Remove a linha "### <titulo>" inicial de um Texto Cru quando ela so repete o `CuratedContent.
 * title` que o chamador ja mostra separado (h1 proprio) - convencao confirmada nos 20 dia-N.json
 * de curadoria (a 1a linha "###" sempre repete o titulo ipsis litteris). So corta quando bate
 * exatamente - nao mexe em nada se o texto nao seguir essa convencao.
 */
export function stripRedundantTitleHeading(bodyText: string, title: string): string {
  const match = bodyText.trimStart().match(/^###\s+(.+?)\s*(?:\n|$)/);
  if (!match || match[1].trim() !== title.trim()) return bodyText;
  return bodyText.trimStart().slice(match[0].length);
}
