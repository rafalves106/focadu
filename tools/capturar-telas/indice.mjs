#!/usr/bin/env node
// Monta o INDICE.md a partir dos manifesto-<tamanho>.json que o capturar.mjs grava na pasta de saida.
// Uso: node indice.mjs <pastaSaida> [arquivoComTextoExtra.md]
// O texto extra (cabecalho, observacoes, "nao capturado", "o que foi feito no banco") entra antes/depois das tabelas.
import fs from 'node:fs'
import path from 'node:path'

const saida = path.resolve(process.argv[2] ?? '../../docs/design/prints/atual')
const extra = process.argv[3] ? fs.readFileSync(path.resolve(process.argv[3]), 'utf8') : ''
const [antes, depois = ''] = extra.split('<!--TABELAS-->')
let md = antes
for (const t of ['desktop', 'notebook', 'celular']) {
  let itens = []
  for (const fase of ['novo', 'progresso', 'progresso2', 'projeto']) {
    const f = path.join(saida, `manifesto-${t}-${fase}.json`)
    if (fs.existsSync(f)) itens = itens.concat(JSON.parse(fs.readFileSync(f, 'utf8')).manifesto)
  }
  if (itens.length === 0) continue
  const dim = { desktop: '1440x900', notebook: '1366x768', celular: '390x844' }[t]
  md += `\n## ${t} (${dim}) - ${itens.length} prints\n\n| Arquivo | Rota | Estado | Observacao |\n|---|---|---|---|\n`
  for (const i of itens) {
    const c = (x) => String(x ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')
    md += `| ${c(i.arquivo)} | ${c(i.rota)} | ${c(i.estado)} | ${c(i.nota)} |\n`
  }
}
md += depois
fs.writeFileSync(path.join(saida, 'INDICE.md'), md)
console.log(`INDICE.md gravado em ${saida}`)
