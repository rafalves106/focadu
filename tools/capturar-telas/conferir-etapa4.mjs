// Fase 109 etapa 4: prints da sessao do dia com as contas aluno.f109.* (so local, nunca producao).
// Uso: node conferir-etapa4.mjs <pastaSaida> <conta> [passos]
//   passos: lista separada por virgula, executada em ordem em cada tamanho:
//     foto:<nome>     tira o print (e lista o que rola)
//     clique:<texto>  clica no 1o botao com esse nome (regex)
//     tecla:<tecla>   aperta a tecla
//     url:<caminho>   abre o endereco
//     espera:<ms>     espera
// Sem passos: so a 1a tela do /hoje e a gaveta de Notas.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:5174'
const SAIDA = path.resolve(process.argv[2] ?? 'saida-etapa4')
const CONTA = process.argv[3] ?? '4'
const PASSOS = (process.argv[4] ?? 'foto:inicio,clique:Notas,foto:gaveta-notas,tecla:Escape').split(',')
const SO = process.env.TAMANHOS ? process.env.TAMANHOS.split(',') : null
const SENHA = 'Senha-forte-123'
const WS = '7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476'
const TAM = { desktop: { width: 1440, height: 900 }, notebook: { width: 1366, height: 768 }, celular: { width: 390, height: 844 } }
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
// Um login so (o login tem limite de tentativas desde a Fase 99); os outros tamanhos reaproveitam a sessao.
const loginCtx = await browser.newContext()
const lp = await loginCtx.newPage()
await lp.goto(`${BASE}/login`)
await lp.locator('input[type=email]').fill(`aluno.f109.${CONTA}@local.test`)
await lp.locator('input[type=password]').first().fill(SENHA)
await lp.locator('button[type=submit]').click()
await lp.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
const estado = await loginCtx.storageState()
await loginCtx.close()
for (const [t, vp] of Object.entries(TAM)) {
  if (SO && !SO.includes(t)) continue
  fs.mkdirSync(path.join(SAIDA, t), { recursive: true })
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', isMobile: t === 'celular', hasTouch: t === 'celular', storageState: estado })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERRO NA PAGINA', e.message))
  await p.goto(`${BASE}/hoje?curso=${WS}`)
  await pausa(1500)
  for (const passo of PASSOS) {
    const [acao, ...resto] = passo.split(':')
    const arg = resto.join(':')
    if (acao === 'foto') {
      await pausa(700)
      await p.screenshot({ path: path.join(SAIDA, t, `${arg}.png`) })
      const rola = await p.evaluate(() =>
        [...document.querySelectorAll('*')]
          .filter((e) => e.scrollHeight > e.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && e.checkVisibility())
          .map((e) => `${e.tagName}.${String(e.className).slice(0, 50)} ${e.scrollHeight}/${e.clientHeight}`),
      )
      const janela = await p.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)
      console.log(t, arg, janela ? 'JANELA ROLA' : 'janela ok', rola.length ? `| por dentro: ${rola.join(' | ')}` : '')
    } else if (acao === 'clique') {
      const b = p.getByRole('button', { name: new RegExp(arg) }).filter({ visible: true }).first()
      await b.click({ timeout: 5000 }).catch((e) => console.log(t, 'sem botao', arg, e.message.split('\n')[0]))
      await pausa(600)
    } else if (acao === 'tecla') {
      await p.keyboard.press(arg)
      await pausa(400)
    } else if (acao === 'url') {
      await p.goto(BASE + arg)
      await pausa(1500)
    } else if (acao === 'espera') {
      await pausa(Number(arg))
    }
  }
  await ctx.close()
}
await browser.close()
