// Fase 109b: prints rapidos das telas corrigidas, com as contas aluno.f109.* ja montadas (so local).
// Uso: node conferir-109b.mjs <pastaSaida>
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:5174'
const SAIDA = path.resolve(process.argv[2] ?? 'saida-109b')
const SENHA = 'Senha-forte-123'
const WS = '7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476'
const TAM = { desktop: { width: 1440, height: 900 }, notebook: { width: 1366, height: 768 }, celular: { width: 390, height: 844 } }
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
for (const [t, vp] of Object.entries(TAM)) {
  fs.mkdirSync(path.join(SAIDA, t), { recursive: true })
  for (const conta of [1, 4]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', isMobile: t === 'celular', hasTouch: t === 'celular' })
    const p = await ctx.newPage()
    const foto = async (nome) => {
      await pausa(900)
      await p.screenshot({ path: path.join(SAIDA, t, `c${conta}-${nome}.png`) })
      const rola = await p.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)} ${e.scrollHeight}/${e.clientHeight}`))
      console.log(t, conta, nome, rola.length ? `ROLA: ${rola.join(' | ')}` : 'sem rolagem')
    }
    await p.goto(`${BASE}/login`)
    await p.locator('input[type=email]').fill(`aluno.f109.${conta}@local.test`)
    await p.locator('input[type=password]').first().fill(SENHA)
    await p.locator('button[type=submit]').click()
    await p.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    await p.goto(`${BASE}/start?curso=${WS}`)
    await foto('inicio')
    await p.goto(`${BASE}/start?course=${WS}`)
    await foto('trilha')
    const semana = await p.locator(`a[href*="weekly="]`).first().getAttribute('href')
    await p.goto(BASE + semana.replace(/&project=1/, ''))
    await foto('semana')
    if (conta === 4) {
      await p.goto(`${BASE}/start?curso=${WS}`)
      await pausa(800)
      const abrir = t === 'celular' ? p.getByRole('button', { name: /Você/ }) : p.getByRole('button', { name: /Abrir o menu do agente/ })
      await abrir.first().click()
      await pausa(500)
      await p.getByRole('button', { name: /^Sair da conta/ }).first().click()
      await foto('sair')
      await p.keyboard.press('Escape')
      await pausa(400)
      const menuAberto = await p.getByRole('button', { name: /^Configurações/ }).count()
      console.log(t, 'ESC fechou so a confirmacao:', menuAberto > 0)
      if (!menuAberto) await abrir.first().click()
      await p.getByRole('button', { name: /^Configurações/ }).first().click()
      await foto('config')
    }
    await ctx.close()
  }
}
await browser.close()
