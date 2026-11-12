#!/usr/bin/env node
// Captura as telas do aluno da Focadu (so ambiente local). Uso:
//   node capturar.mjs <urlBase> <pastaSaida> [--tamanhos desktop,notebook,celular] [--conta N] [--so entrada,hoje,...]
// Ex.: node capturar.mjs http://localhost:5174 ../../docs/design/prints/atual
// Pre-requisitos: Api em :5282 com Cors__AllowedOrigins = a urlBase e CoursePreview__Emails com as contas
// aluno.print.<n>@local.test (o curso Web Security e Draft no banco local), Postgres no ar.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : padrao }
const BASE = args[0] && !args[0].startsWith('--') ? args[0].replace(/\/$/, '') : 'http://localhost:5174'
const SAIDA = path.resolve(args[1] && !args[1].startsWith('--') ? args[1] : path.join(aqui, '../../docs/design/prints/atual'))
const TAMANHOS = flag('--tamanhos', 'desktop,notebook,celular').split(',')
const CONTA = Number(flag('--conta', '3'))
const SO = flag('--so', '').split(',').filter(Boolean)
const ETAPAS = flag('--etapas', '').split(',').filter(Boolean)
let ativas = null
const etapa = (n) => (ETAPAS.length === 0 || ETAPAS.includes(n)) && (ativas === null || ativas.includes(n))
const SENHA = 'Senha-forte-123'
const DIAS = Number(flag('--dias', '5'))

const TAM = {
  desktop: { width: 1440, height: 900 },
  notebook: { width: 1366, height: 768 },
  celular: { width: 390, height: 844 },
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))
const quer = (nome) => SO.length === 0 || SO.includes(nome)

class Sessao {
  constructor(tamanho, indiceConta) {
    this.tamanho = tamanho
    this.email = `aluno.print.${indiceConta}@local.test`
    this.pasta = path.join(SAIDA, tamanho)
    this.manifesto = []
    this.n = 0
    this.mudo = false
    this.fase = 'novo'
    this.naoCapturado = []
  }

  async abrir(storage) {
    fs.mkdirSync(this.pasta, { recursive: true })
    this.browser = await chromium.launch({
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${path.join(aqui, 'fala.wav')}`,
      ],
    })
    const t = TAM[this.tamanho]
    this.ctx = await this.browser.newContext({
      viewport: t,
      reducedMotion: 'reduce',
      isMobile: this.tamanho === 'celular',
      hasTouch: this.tamanho === 'celular',
      deviceScaleFactor: 1,
      permissions: ['microphone'],
      storageState: storage,
    })
    this.p = await this.ctx.newPage()
    this.erros = []
    this.p.on('pageerror', (e) => this.erros.push(`pageerror: ${String(e.message).slice(0, 140)}`))
    this.p.on('response', (r) => {
      if (r.status() >= 500) this.erros.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`)
    })
  }

  async fechar() {
    await this.ctx.storageState({ path: path.join(this.pasta, '.estado.json') })
    fs.writeFileSync(path.join(this.pasta, '..', `manifesto-${this.tamanho}-${this.fase}.json`), JSON.stringify({ manifesto: this.manifesto, naoCapturado: this.naoCapturado }, null, 2))
    await this.browser.close()
  }

  async assentar(extra = 500) {
    await this.p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await this.p.evaluate(() => document.fonts.ready).catch(() => {})
    await pausa(extra)
  }

  /** Print da viewport; se a pagina rolar tira tambem um fullPage; anota estouro horizontal. */
  async foto(id, slug, { estado = '', nota = '' } = {}) {
    if (this.mudo) return null
    await this.assentar()
    const medidas = await this.p.evaluate(() => {
      const scrollers = [...document.querySelectorAll('*')].filter((e) => {
        const s = getComputedStyle(e)
        return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.clientHeight > 80
      })
      return {
        docH: document.documentElement.scrollHeight,
        winH: innerHeight,
        docW: document.documentElement.scrollWidth,
        winW: innerWidth,
        internos: scrollers.length,
      }
    })
    const arquivo = `${id}-${slug}.png`
    await this.p.screenshot({ path: path.join(this.pasta, arquivo) })
    const notas = [nota]
    if (medidas.docH > medidas.winH + 4) {
      await this.p.screenshot({ path: path.join(this.pasta, `${id}-${slug}-full.png`), fullPage: true })
      notas.push(`A pagina rola (${medidas.docH}px de ${medidas.winH}px); fullPage em ${id}-${slug}-full.png.`)
    }
    if (medidas.docW > medidas.winW + 4) notas.push(`Estouro horizontal (${medidas.docW}px de ${medidas.winW}px).`)
    if (medidas.internos > 0) notas.push(`${medidas.internos} area(s) com rolagem interna.`)
    if (this.erros.length) { notas.push(`Erros na pagina: ${this.erros.join('; ')}`); this.erros = [] }
    const rota = new URL(this.p.url()).pathname + new URL(this.p.url()).search
    this.manifesto.push({ arquivo, rota, estado, nota: notas.filter(Boolean).join(' ') })
    console.log(`  [${this.tamanho}] ${arquivo}`)
    return arquivo
  }

  prox() { if (this.mudo) return '00'; this.n += 1; return String(this.n).padStart(2, '0') }

  async ir(rota) {
    await this.p.goto(BASE + rota)
    await this.assentar(900)
  }

  async botao(nome) { return this.p.getByRole('button', { name: nome }) }
  async clicar(nome, opcoes = {}) {
    const b = this.p.getByRole('button', { name: nome }).first()
    await b.click({ timeout: 8000, ...opcoes })
    await pausa(700)
  }
  async tem(nome) { return (await this.p.getByRole('button', { name: nome }).count()) > 0 }
}

// ---------------------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------------------
async function entradaSemConta(s) {
  const p = s.p
  await s.ir('/login')
  await s.foto(s.prox(), 'login-entrar', { estado: 'aba Entrar, vazia' })
  await p.locator('input[type=email]').fill('ninguem@local.test')
  await p.locator('input[type=password]').fill('senha-errada-1')
  await p.locator('button[type=submit]').click()
  await pausa(1500)
  await s.foto(s.prox(), 'login-entrar-erro', { estado: 'credenciais invalidas' })
  await s.ir('/login')
  await p.getByText('Criar conta').first().click()
  await pausa(500)
  await s.foto(s.prox(), 'login-criar-conta', { estado: 'aba Criar conta, vazia' })
  await p.locator('button[type=submit]').click().catch(() => {})
  await pausa(700)
  await s.foto(s.prox(), 'login-criar-conta-erro', { estado: 'envio vazio, validacao' })
  const ins = p.locator('input')
  await ins.nth(0).fill('A')
  await ins.nth(1).fill('email-invalido')
  await ins.nth(2).fill('123')
  await ins.nth(3).fill('456')
  await p.locator('button[type=submit]').click().catch(() => {})
  await pausa(700)
  await s.foto(s.prox(), 'login-criar-conta-erro-valores', { estado: 'valores invalidos (nome curto, e-mail ruim, senha fraca, confirmacao diferente)' })
  await s.ir('/esqueci-senha')
  await s.foto(s.prox(), 'esqueci-senha', { estado: 'formulario' })
  await p.locator('input').first().fill('ninguem@local.test')
  await p.locator('button[type=submit]').click().catch(() => {})
  await pausa(1500)
  await s.foto(s.prox(), 'esqueci-senha-enviado', { estado: 'depois de enviar' })
  await s.ir('/confirmar-email')
  await s.foto(s.prox(), 'confirmar-email-sem-sessao', { estado: 'aberta sem sessao (a confirmacao so e exigida com Signup:* ligado)' })
  await s.ir('/aceite')
  await s.foto(s.prox(), 'aceite-sem-sessao', { estado: 'aberta sem sessao (o aceite so e exigido com Signup:* ligado)' })
  await s.ir('/termos')
  await s.foto(s.prox(), 'termos', { estado: 'Termos de Uso' })
  await s.ir('/privacidade')
  await s.foto(s.prox(), 'privacidade', { estado: 'Politica de Privacidade' })
}

async function criarConta(s) {
  const p = s.p
  await s.ir('/login')
  await p.getByText('Criar conta').first().click()
  await pausa(400)
  const ins = p.locator('input')
  await ins.nth(0).fill('Aluna Print')
  await ins.nth(1).fill(s.email)
  await ins.nth(2).fill(SENHA)
  await ins.nth(3).fill(SENHA)
  await p.locator('input[type=checkbox]').check({ force: true })
  await s.foto(s.prox(), 'login-criar-conta-preenchida', { estado: 'formulario preenchido, antes de enviar' })
  await p.locator('button[type=submit]').click()
  await p.waitForURL(/onboarding/, { timeout: 20000 })
  await s.assentar(1200)
}

async function onboarding(s) {
  const p = s.p
  await s.foto(s.prox(), 'onboarding-1-boas-vindas', { estado: 'passo 1 de 3' })
  await s.clicar(/Próximo passo/)
  await s.assentar(800)
  await s.foto(s.prox(), 'onboarding-2-perfil', { estado: 'passo 2 de 3, nenhum interesse marcado' })
  await p.getByRole('button', { name: 'Games' }).click()
  await p.getByRole('button', { name: 'Tecnologia' }).click()
  await p.locator('textarea').fill('Gosto de jogos de estrategia e de montar PCs.')
  await s.foto(s.prox(), 'onboarding-2-perfil-preenchido', { estado: 'passo 2 de 3, interesses marcados e texto livre' })
  await s.clicar(/Próximo passo/)
  await s.assentar(1200)
  await s.foto(s.prox(), 'selecionar-curso-linguagem', { estado: 'passo 3 de 3, janela da linguagem dos projetos' })
  await p.getByRole('button', { name: 'JavaScript' }).click()
  await s.clicar(/Salvar e continuar/)
  await s.assentar(1000)
  await s.foto(s.prox(), 'selecionar-curso', { estado: 'catalogo de cursos (Web Security aparece por CoursePreview__Emails)' })
  const cartao = p.locator('div,article,section')
    .filter({ has: p.getByText('Web Security', { exact: true }) })
    .filter({ has: p.getByText('Ver curso') }).last()
  await cartao.scrollIntoViewIfNeeded().catch(() => {})
  await cartao.getByText('Ver curso').click()
  await s.assentar(800)
  await s.foto(s.prox(), 'selecionar-curso-ver-curso', { estado: '"Ver curso" aberto no Web Security' })
  await s.clicar(/Iniciar Web Security/)
  await p.waitForURL(/\/start/, { timeout: 20000 })
  await s.assentar(1500)
}

// ---------------------------------------------------------------------------------------------
// Inicio e trilha
// ---------------------------------------------------------------------------------------------
async function inicioETrilha(s) {
  const p = s.p
  await s.foto(s.prox(), 'inicio-tour-passo-1', { estado: 'Inicio de aluno novo com o tour do guia "?" no passo 1 de 10' })
  const pular = p.getByText('Pular tour')
  if (await pular.count()) await pular.click()
  await pausa(600)
  await s.foto(s.prox(), 'inicio-aluno-novo', { estado: 'Inicio de aluno novo, sem progresso, tour fechado' })
  // guia "?" aberto
  const guia = p.getByRole('button', { name: /Guia da tela/ })
  if (await guia.count()) {
    await guia.first().click()
    await pausa(700)
    await s.foto(s.prox(), 'inicio-guia-aberto', { estado: 'guia da tela "?" aberto' })
    await p.keyboard.press('Escape')
    await pausa(400)
  }
  const href = await p.locator('a', { hasText: 'Ver trilha' }).first().getAttribute('href')
  s.cursoRota = href
  const semana = await p.locator('a[href*="weekly="]').first().getAttribute('href').catch(() => null)
  await s.ir(href)
  await s.foto(s.prox(), 'trilha-mapa-sem-progresso', { estado: 'trilha do curso sem progresso' })
  if (semana) {
    await s.ir(semana)
    await s.foto(s.prox(), 'semana-sem-progresso', { estado: 'visao da semana 1 sem progresso' })
  }
  await s.ir(href + '&ranking=1')
  await s.foto(s.prox(), 'ranking', { estado: 'ranking do curso, aluno novo' })
}

// ---------------------------------------------------------------------------------------------
// Sessao diaria (/hoje)
// ---------------------------------------------------------------------------------------------
async function cabecalho(p) {
  const t = await p.locator('text=/ETAPA \\d+ DE \\d+/i').first().textContent({ timeout: 1500 }).catch(() => null)
  if (!t) return null
  const m = t.match(/Etapa (\d+) de (\d+)\s*[—-]\s*(.+)/i)
  return m ? { n: Number(m[1]), total: Number(m[2]), tipo: m[3].trim().toLowerCase() } : null
}

async function ligarPares(p) {
  const larg = await p.evaluate(() => innerWidth)
  const caixas = await p.locator('button').evaluateAll((es) => es.map((e, i) => {
    const r = e.getBoundingClientRect()
    return { i, x: r.x, y: r.y + scrollY, w: r.width, h: r.height, t: e.textContent.trim() }
  }).filter((b) => b.h > 30 && b.w > 120 && !/^(Confirmar|Salvar|Pular|Enviar|Iniciar|Continuar)/i.test(b.t)))
  const area = await p.locator('text=/Ligue cada termo/i').first().boundingBox()
  if (!area) return false
  const ay = area.y + (await p.evaluate(() => scrollY))
  const lim = larg >= 1000 ? larg * 0.75 : larg
  const itens = caixas.filter((b) => b.x >= 20 && b.x < lim && b.y > ay + 20 && b.y < ay + 1600 && !/^(Uma página|Quem pede|O servidor só)/.test(b.t) || false)
    .filter((b) => b.x > 100 || larg < 1000)
  const xs = [...new Set(itens.map((b) => Math.round(b.x / 20)))]
  let termos, defs
  if (xs.length >= 2) {
    const min = Math.min(...xs), max = Math.max(...xs)
    termos = itens.filter((b) => Math.round(b.x / 20) === min).sort((a, b) => a.y - b.y)
    defs = itens.filter((b) => Math.round(b.x / 20) === max).sort((a, b) => a.y - b.y)
  } else {
    const ord = itens.sort((a, b) => a.y - b.y)
    termos = ord.slice(0, ord.length / 2)
    defs = ord.slice(ord.length / 2)
  }
  const todos = p.locator('button')
  for (let k = 0; k < Math.min(termos.length, defs.length); k++) {
    await todos.nth(termos[k].i).scrollIntoViewIfNeeded()
    await todos.nth(termos[k].i).click()
    await todos.nth(defs[k].i).scrollIntoViewIfNeeded()
    await todos.nth(defs[k].i).click()
  }
  return true
}

async function gravarVoz(s, id, primeira) {
  const p = s.p
  if (primeira) await s.foto(id(), 'hoje-voz-pronta', { estado: 'conversa por voz, antes de gravar' })
  await s.clicar(/● Gravar|Gravar/)
  await pausa(s.mudo ? 5500 : 3500)
  if (primeira) await s.foto(id(), 'hoje-voz-gravando', { estado: 'conversa por voz gravando (microfone falso com fala sintetica)' })
  await pausa(s.mudo ? 500 : 3000)
  await p.getByRole('button', { name: /Parar e enviar/ }).last().click()
  await pausa(700)
  if (primeira) await s.foto(id(), 'hoje-voz-processando', { estado: 'logo depois de enviar, transcricao e nota em andamento' })
  await p.getByRole('button', { name: /Continuar/ }).first().waitFor({ timeout: 90000 })
  await pausa(500)
  if (primeira) await s.foto(id(), 'hoje-voz-devolutiva', { estado: 'devolutiva da conversa por voz (nota e comentario da Focada)' })
  await s.clicar(/Continuar/)
}

async function dirigirDia(s, base, rotulo) {
  const p = s.p
  const id = () => s.prox()
  const vistos = new Set()
  const primeiraDoTipo = (tipo, fase) => {
    const k = `${tipo}|${fase}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  }
  let preso = 0
  for (let it = 0; it < 60; it++) {
    if (await s.tem(/Pular aquecimento/)) { await s.clicar(/Pular aquecimento/); continue }
    if (await s.tem(/Começar reforço/)) {
      await s.foto(id(), `${rotulo}-reforco-abertura`, { estado: 'abertura da sessao de reforco' })
      await s.clicar(/Começar reforço/)
      continue
    }
    const h = await cabecalho(p)
    if (!h) break
    const tipo = h.tipo
    // aberturas de bloco
    if (await s.tem(/^Bora/)) {
      if (primeiraDoTipo(tipo, 'intro')) await s.foto(id(), `${rotulo}-${slug(tipo)}-abertura`, { estado: `abertura do bloco "${tipo}" (etapa ${h.n} de ${h.total})` })
      await s.clicar(/^Bora/)
      continue
    }
    if (tipo.startsWith('leitura') && (await s.tem(/Concluí a leitura/))) {
      if (primeiraDoTipo(tipo, 'ativa')) await s.foto(id(), `${rotulo}-leitura`, { estado: `leitura (etapa ${h.n} de ${h.total})` })
      await s.clicar(/Concluí a leitura/)
      continue
    }
    if (tipo.startsWith('conversa por voz')) {
      if (await s.tem(/Gravar/)) { await gravarVoz(s, id, primeiraDoTipo(tipo, 'ativa')); continue }
    }
    if (tipo === 'quiz' && (await p.locator('text=/Confirmar/i').count())) {
      const primeira = primeiraDoTipo(tipo, 'ativa')
      if (primeira) await s.foto(id(), `${rotulo}-quiz`, { estado: `quiz, questao aberta (etapa ${h.n} de ${h.total})` })
      await p.keyboard.press('1')
      await s.clicar(/Confirmar/)
      if (primeira) await s.foto(id(), `${rotulo}-quiz-erro-focada`, { estado: 'quiz respondido, feedback da Focada (a opcao 1 e escolhida sempre)' })
      await s.clicar(/Continuar/)
      continue
    }
    if (tipo.includes('lacuna') && (await p.getByPlaceholder('a palavra que falta').count())) {
      const primeira = primeiraDoTipo(tipo, 'ativa')
      if (primeira) await s.foto(id(), `${rotulo}-lacuna`, { estado: 'lacuna aberta' })
      await p.getByPlaceholder('a palavra que falta').fill('http')
      await s.clicar(/Confirmar/)
      if (primeira) await s.foto(id(), `${rotulo}-lacuna-resposta`, { estado: 'lacuna respondida' })
      await s.clicar(/Continuar/)
      continue
    }
    if (tipo.includes('ligar') && (await s.tem(/Confirmar/))) {
      const primeira = primeiraDoTipo(tipo, 'ativa')
      if (primeira) await s.foto(id(), `${rotulo}-ligar-palavras`, { estado: 'ligar palavras, nenhum par' })
      await ligarPares(p)
      if (primeira) await s.foto(id(), `${rotulo}-ligar-palavras-pares`, { estado: 'ligar palavras, pares feitos antes de confirmar' })
      await s.clicar(/Confirmar/)
      if (primeira) await s.foto(id(), `${rotulo}-ligar-palavras-resposta`, { estado: 'ligar palavras corrigido' })
      await s.clicar(/Continuar/)
      continue
    }
    if (tipo.startsWith('roleplay')) {
      const primeira = primeiraDoTipo(tipo, 'ativa')
      if (!(await s.tem(/Continuar/))) {
        if (primeira) await s.foto(id(), `${rotulo}-roleplay`, { estado: 'roleplay, decisao aberta' })
        await p.keyboard.press('1')
        await pausa(1200)
        if (primeira) await s.foto(id(), `${rotulo}-roleplay-resposta`, { estado: 'roleplay, depois da escolha 1' })
      }
      if (await s.tem(/Continuar/)) await s.clicar(/Continuar/)
      continue
    }
    // tipos sem roteiro (video, passo de codigo, missao no terminal): foto e tenta avancar
    if (primeiraDoTipo(tipo, 'outro')) await s.foto(id(), `${rotulo}-${slug(tipo)}`, { estado: `etapa "${tipo}" (${h.n} de ${h.total})` })
    if (await s.tem(/Continuar|Concluí|Marcar como|Assisti|Próxim/)) { await s.clicar(/Continuar|Concluí|Marcar como|Assisti|Próxim/) ; continue }
    preso += 1
    if (preso > 2) {
      await s.foto(id(), `${rotulo}-preso`, { estado: `nao consegui avancar na etapa "${tipo}"`, nota: 'O script nao sabe responder esta etapa.' })
      return false
    }
    await pausa(1000)
  }
  return true
}

const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function psql(sql) {
  return execFileSync('docker', ['exec', 'focadu-postgres', 'psql', '-U', 'focadu', 'focadu', '-tA', '-c', sql], { encoding: 'utf8' })
}

/** Banco local: faz de conta que passou um dia (a cota e de 1 Daily por dia). Devolve o que foi mexido. */
function recuarUmDia(email) {
  const d = psql(`update "Dailies" d set "CompletedAt" = d."CompletedAt" - interval '1 day', "Date" = d."Date" - 1
    from "Weeklies" w join "Enrollments" e on e."Id" = w."EnrollmentId" join "Users" u on u."Id" = e."UserId"
    where d."WeeklyId" = w."Id" and u."Email" = '${email}' and d."CompletedAt" is not null returning d."Id"`).trim().split('\n').filter(Boolean).length
  psql(`update "ActivityResponses" r set "CreatedAt" = r."CreatedAt" - interval '1 day' from "Dailies" d
    join "Weeklies" w on w."Id" = d."WeeklyId" join "Enrollments" e on e."Id" = w."EnrollmentId" join "Users" u on u."Id" = e."UserId"
    where r."DailyId" = d."Id" and u."Email" = '${email}'`)
  psql(`update "UserStreaks" s set "LastCompletedDate" = s."LastCompletedDate" - 1 from "Users" u where s."UserId" = u."Id" and u."Email" = '${email}'`)
  return d
}

async function extrasHoje(s) {
  const p = s.p
  const nota = 'Nota de teste: o navegador pede, o servidor responde.'
  if (s.tamanho === 'desktop') {
    await p.getByPlaceholder(/Anote um insight/).fill(nota)
    await p.getByPlaceholder(/Tags/).fill('http, servidor')
    await s.foto(s.prox(), 'hoje-anotacao-preenchida', { estado: 'anotacao rapida preenchida (trilho direito)' })
    await s.clicar(/^Salvar$/)
    await s.foto(s.prox(), 'hoje-anotacao-salva', { estado: 'anotacao salva' })
    await p.getByPlaceholder(/Sua dúvida/).fill('O que e um servidor?')
    await p.getByRole('button', { name: /Enviar pergunta/ }).click()
    await pausa(1500)
    await s.foto(s.prox(), 'hoje-suporte-rapido-pensando', { estado: 'Suporte Rapido logo depois de enviar a duvida' })
    await pausa(6000)
    await s.foto(s.prox(), 'hoje-suporte-rapido-resposta', { estado: 'Suporte Rapido com a resposta da IA' })
    return
  }
  // notebook e celular: trilhos fechados / barra inferior; cada gaveta abre por botao
  const gavetas = [
    ['Material', 'hoje-gaveta-material', 'gaveta Material aberta'],
    ['Notas', 'hoje-gaveta-notas', 'gaveta Notas aberta (anotacao rapida)'],
    ['Dúvida', 'hoje-gaveta-duvida', 'gaveta Duvida aberta (Suporte Rapido)'],
    ['Pomodoro', 'hoje-gaveta-pomodoro', 'gaveta Pomodoro aberta'],
  ]
  for (const [nome, slugG, estado] of gavetas) {
    const b = p.getByRole('button', { name: nome, exact: false }).filter({ hasText: new RegExp(`^${nome}|${nome}$`, 'i') }).first()
    if (!(await b.count())) continue
    await b.click().catch(() => {})
    await pausa(800)
    if (nome === 'Notas') await p.getByPlaceholder(/Anote um insight/).fill(nota).catch(() => {})
    if (nome === 'Dúvida') {
      await p.getByPlaceholder(/Sua dúvida/).fill('O que e um servidor?').catch(() => {})
      await p.getByRole('button', { name: /Enviar pergunta/ }).click().catch(() => {})
      await pausa(7000)
    }
    await s.foto(s.prox(), slugG, { estado })
    await p.keyboard.press('Escape')
    await pausa(500)
    const fechar = p.locator('button:visible', { hasText: /Fechar/ })
    if (s.tamanho === 'celular') await s.ir('/hoje')
    else if (await fechar.count()) await fechar.first().click({ timeout: 3000 }).catch(() => {})
    await pausa(600)
  }
}

async function concluirSessao(s) {
  const p = s.p
  await s.clicar(/Concluir sessão/)
  await pausa(2500)
  await s.foto(s.prox(), 'hoje-feedback-do-dia', { estado: 'tela "Como foi o dia" antes da recompensa, nada marcado' })
  if (s.mudo) { await s.clicar(/^Pular$/); await pausa(2500); return }
  await p.locator('button', { hasText: /^4/ }).first().click()
  await p.locator('textarea').first().fill('Gostei da explicacao, mas a parte de requisicao foi rapida.')
  await s.foto(s.prox(), 'hoje-feedback-do-dia-preenchido', { estado: 'nota 4 e comentario preenchidos' })
  await s.clicar(/^Enviar$/)
  await pausa(3000)
  await s.foto(s.prox(), 'hoje-sessao-concluida', { estado: 'depois de enviar o feedback do dia' })
}

async function sessaoDia1(s) {
  await s.ir('/hoje')
  await s.foto(s.prox(), 'hoje-etapa-1-leitura', { estado: 'Dia 1, primeira etapa, primeira visita (balao "Primeira vez aqui?" visivel)' })
  await extrasHoje(s)
  await dirigirDia(s, 0, 'hoje')
  await s.foto(s.prox(), 'hoje-fim-da-sessao', { estado: 'tudo respondido, antes de concluir a sessao' })
  await concluirSessao(s)
  return true
}

async function criarAgente(s) {
  const p = s.p
  await s.ir('/loja')
  await s.foto(s.prox(), 'loja-criar-agente', { estado: 'loja de quem ainda nao criou o agente (tom de pele e cabelo)' })
  await p.getByRole('button', { name: /Pele 2/ }).click()
  await p.getByRole('button', { name: /Black power/ }).click()
  await pausa(400)
  await s.foto(s.prox(), 'loja-criar-agente-escolhas', { estado: 'pele 2 e cabelo Black power escolhidos' })
  await s.clicar(/Criar agente/)
  await pausa(2500)
  await s.foto(s.prox(), 'loja-vitrine', { estado: 'loja depois de criar o agente: vitrine e saldo' })
}

async function menusGlobais(s) {
  const p = s.p
  if (s.tamanho === 'celular') {
    const m = p.getByRole('button', { name: /Abrir menu/ })
    if (await m.count()) {
      await m.first().click()
      await pausa(800)
      await s.foto(s.prox(), 'menu-celular', { estado: 'menu hamburguer aberto (celular)' })
      await p.keyboard.press('Escape')
      await pausa(400)
      if (await m.count()) await m.first().click().catch(() => {})
    }
  }
  const cfg = p.getByRole('button', { name: 'Configurações' })
  if (await cfg.count()) {
    await cfg.first().click().catch(() => {})
    await pausa(900)
    await s.foto(s.prox(), 'configuracoes', { estado: 'menu de Configuracoes aberto' })
    await p.keyboard.press('Escape')
    await pausa(500)
  }
  const ia = p.getByRole('button', { name: /IA operacional|IA /i })
  if (await ia.count()) {
    await ia.first().click().catch(() => {})
    await pausa(1500)
    await s.foto(s.prox(), 'status-da-ia', { estado: 'menu de status da IA aberto' })
    await p.keyboard.press('Escape')
    await pausa(300)
  }
}

async function tentar(s, nome, fn) {
  if (!etapa(nome)) return
  try { await fn() } catch (e) {
    console.log(`  [${s.tamanho}] ${nome} falhou: ${e.message.split('\n')[0]}`)
    s.naoCapturado.push(`${nome}: ${e.message.split('\n')[0]}`)
  }
}

async function restoDoApp(s, { veteran }) {
  const p = s.p
  const curso = s.cursoRota ?? (await p.locator('a', { hasText: 'Ver trilha' }).first().getAttribute('href').catch(() => null))
  await tentar(s, 'perfil', async () => {
    await s.ir('/perfil')
    await s.foto(s.prox(), 'perfil', { estado: veteran ? 'perfil do aluno com progresso e agente' : 'perfil do aluno novo, ainda sem agente' })
    await s.ir('/perfil?abrir=guarda-roupa')
    await s.foto(s.prox(), 'perfil-guarda-roupa', { estado: 'guarda-roupa aberto em modal' })
    await s.ir('/perfil?abrir=conquistas')
    await s.foto(s.prox(), 'perfil-conquistas', { estado: 'lista de conquistas em modal' })
  })
  await tentar(s, 'squad', async () => {
    await s.ir('/squad')
    if (!veteran) {
      await s.foto(s.prox(), 'squad-sem-squad', { estado: 'QG sem squad: criar squad ou entrar por codigo' })
      return
    }
    if (await p.getByPlaceholder('Ex.: Byte Force').count()) {
      await s.foto(s.prox(), 'squad-sem-squad', { estado: 'QG sem squad: criar squad ou entrar por codigo' })
      await p.getByPlaceholder('Ex.: Byte Force').fill('Byte Print')
      await s.clicar(/Criar squad/)
      await pausa(2500)
    }
    await s.foto(s.prox(), 'squad-criado', { estado: 'QG com squad criado (so o aluno, sem outros membros)' })
  })
  if (veteran) {
    await tentar(s, 'loja', async () => {
      await s.ir('/loja')
      await s.foto(s.prox(), 'loja-vitrine', { estado: 'vitrine da semana e agente, saldo baixo' })
      await p.getByRole('button', { name: /Provar/ }).first().click()
      await pausa(900)
      await s.foto(s.prox(), 'loja-provador', { estado: 'peca da vitrine no provador (frente)' })
      const lado = p.getByRole('button', { name: /^Costas$/ })
      if (await lado.count()) { await lado.click(); await pausa(500); await s.foto(s.prox(), 'loja-provador-costas', { estado: 'provador de costas' }) }
    })
  }
  if (curso) {
    await tentar(s, 'ranking', async () => {
      await s.ir(curso + '&ranking=1')
      await s.foto(s.prox(), 'ranking', { estado: veteran ? 'ranking do curso com o aluno veterano' : 'ranking do curso' })
    })
    await tentar(s, 'certificacoes', async () => {
      await s.ir(curso + '&certifications=1')
      await s.foto(s.prox(), 'certificacoes', { estado: 'Certificacoes do curso' })
    })
    await tentar(s, 'caderninho', async () => {
      await s.ir(curso + '&caderninho=1')
      await s.foto(s.prox(), veteran ? 'caderninho-vazio' : 'caderninho-com-nota', { estado: veteran ? 'Caderninho sem nenhuma nota' : 'Caderninho com a nota feita na sessao do Dia 1' })
    })
  }
  await tentar(s, 'menus', async () => { await s.ir('/start'); await menusGlobais(s) })
}

function semanaId(email, numero) {
  return psql(`select w."Id" from "Weeklies" w join "WeeklyTemplates" t on t."Id" = w."WeeklyTemplateId" join "Enrollments" e on e."Id" = w."EnrollmentId"
    join "Users" u on u."Id" = e."UserId" join "Courses" c on c."Id" = e."CourseId" where u."Email" = '${email}' and c."Name" = 'Web Security' and t."Number" = ${numero}`).trim()
}

/** Banco local: marca a ponte (Dia 6) do aluno como concluida, pra abrir o Projeto Semanal. */
function concluirPonte(email) {
  return psql(`update "Dailies" d set "Status" = 'Completed', "CompletedAt" = now() - interval '1 day'
    from "Weeklies" w join "WeeklyTemplates" t on t."Id" = w."WeeklyTemplateId" join "Enrollments" e on e."Id" = w."EnrollmentId" join "Users" u on u."Id" = e."UserId"
    where d."WeeklyId" = w."Id" and u."Email" = '${email}' and t."Number" = 1 and d."DayNumber" = 6 returning d."Id"`).trim()
}

async function progresso(s, email, indiceTamanho) {
  const p = s.p
  const curso = '/start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476'
  s.cursoRota = await (async () => { await s.ir('/start'); return p.locator('a', { hasText: 'Ver trilha' }).first().getAttribute('href') })()
  await tentar(s, 'inicio-progresso', async () => {
    await s.ir('/start')
    await s.foto(s.prox(), 'inicio-com-progresso', { estado: 'Inicio com 5 dias feitos, ofensiva de 5 dias, selos de reforco e Ponte do Dia 6 em destaque' })
  })
  const semana = semanaId(email, 1)
  await tentar(s, 'trilha-progresso', async () => {
    await s.ir(s.cursoRota)
    await s.foto(s.prox(), 'trilha-com-progresso', { estado: 'trilha do curso com 5 dias feitos (a trilha agora lista as 12 semanas do curso apos importar o curso inteiro no banco local)' })
  })
  await tentar(s, 'semana-progresso', async () => {
    await s.ir(`${s.cursoRota}&weekly=${semana}`)
    await s.foto(s.prox(), 'semana-com-dias-feitos', { estado: 'visao da semana 1: 5 dias feitos, selos de reforco pendente, ponte em andamento, castelo bloqueado' })
  })
  await tentar(s, 'reforco', async () => {
    await s.ir(`${s.cursoRota}&weekly=${semana}`)
    const links = await p.locator('a', { hasText: /Reforço pendente/ }).evaluateAll((es) => es.map((e) => e.getAttribute('href')))
    const href = links[indiceTamanho] ?? links[0]
    if (!href) throw new Error('nenhum link de reforco na semana')
    await s.ir(href)
    await s.foto(s.prox(), 'reforco-abertura', { estado: 'sessao de reforco de um dia anterior (abertura)' })
    await s.clicar(/Começar reforço/)
    await s.foto(s.prox(), 'reforco-etapa-1', { estado: 'primeira etapa do reforco' })
    await dirigirDia(s, 0, 'reforco')
    await s.foto(s.prox(), 'reforco-fim', { estado: 'reforco todo respondido, antes de concluir' })
    if (await s.tem(/Concluir sessão/)) {
      await s.clicar(/Concluir sessão/)
      await pausa(2500)
      await s.foto(s.prox(), 'reforco-concluido', { estado: 'depois de concluir o reforco' })
      if (await s.tem(/^Pular$/)) await s.clicar(/^Pular$/)
      await pausa(1500)
    }
  })
  await tentar(s, 'aquecimento', async () => {
    await s.ir('/hoje')
    if (await s.tem(/Pular aquecimento/)) {
      await s.foto(s.prox(), 'aquecimento-pergunta', { estado: 'aquecimento no comeco do Dia 6 (pergunta de um dia anterior, sem nota)' })
      if (s.tamanho === 'desktop') {
        const campo = p.getByPlaceholder(/Escreva a lacuna/)
        if (await campo.count()) await campo.fill('http')
        else await p.keyboard.press('1')
        await s.clicar(/Confirmar/)
        await s.foto(s.prox(), 'aquecimento-resposta', { estado: 'aquecimento respondido' })
      }
      await s.clicar(/Pular aquecimento/)
    }
  })
  await tentar(s, 'ponte', async () => {
    await s.foto(s.prox(), 'ponte-leitura', { estado: 'Dia 6 (ponte "code comigo"): leitura com o arquivo do dia para baixar' })
    if (await s.tem(/Concluí a leitura/)) {
      await s.clicar(/Concluí a leitura/)
      await s.foto(s.prox(), 'ponte-abertura-passos', { estado: 'abertura dos passos de codigo' })
    }
    if (await s.tem(/^Bora/)) await s.clicar(/^Bora/)
    await s.foto(s.prox(), 'ponte-passo-1-preparando', { estado: 'passo de codigo 1: editor e o laboratorio ainda preparando os arquivos' })
    await pausa(25000)
    await s.foto(s.prox(), 'ponte-passo-1-pronto', { estado: 'passo de codigo 1: laboratorio pronto (terminal bash no navegador)' })
    await p.locator('textarea:visible').first().fill("print('Inspetor de site')")
    const term = p.getByPlaceholder(/digite um comando/)
    await term.click()
    await term.fill('python3 inspetor.py')
    await p.keyboard.press('Enter')
    await pausa(9000)
    await s.foto(s.prox(), 'ponte-passo-1-rodado', { estado: 'codigo escrito e rodado no terminal do laboratorio' })
    await s.clicar(/Enviar passo/)
    await pausa(9000)
    await s.foto(s.prox(), 'ponte-passo-1-devolutiva', { estado: 'passo enviado, devolutiva da Focada' })
    if (s.tamanho !== 'celular') {
      const dica = p.getByRole('button', { name: /Dica/ })
      if (await dica.count()) { await dica.first().click().catch(() => {}); await pausa(6000); await s.foto(s.prox(), 'ponte-passo-1-dica', { estado: 'dica da Focada pedida no passo' }) }
    }
  })
  await tentar(s, 'projeto-bloqueado', async () => {
    await s.ir(`${s.cursoRota}&weekly=${semana}&project=1`)
    await s.foto(s.prox(), 'projeto-bloqueado', { estado: 'Projeto da Semana 1 antes de fechar a ponte: cadeado e aviso de repositorio nao provisionado (Forgejo local sem provisionamento)' })
  })
  await tentar(s, 'reforco-bloqueado', async () => {
    await s.ir(`${s.cursoRota}&weekly=${semana}`)
    const href = await p.locator('a', { hasText: /Reforço pendente/ }).last().getAttribute('href')
    await s.ir(href)
    await s.foto(s.prox(), 'reforco-bloqueado', { estado: 'tentar abrir um reforco com a ponte do dia em andamento: aviso de sessao em andamento' })
  })
  await restoDoApp(s, { veteran: true })
}

async function veterano(indice) {
  const s = new Sessao('desktop', indice)
  s.mudo = true
  s.pasta = path.join(SAIDA, '.veterano')
  console.log(`== preparando veterano (${s.email})`)
  await s.abrir()
  try {
    await criarConta(s)
    await onboarding(s)
    const pular = s.p.getByText('Pular tour')
    if (await pular.count()) await pular.click()
    for (let dia = 1; dia <= DIAS; dia++) {
      await s.ir('/hoje')
      await dirigirDia(s, 0, 'hoje')
      await concluirSessao(s)
      if (dia === 1) await criarAgente(s)
      console.log(`  dia ${dia} feito; recuando 1 dia no banco: ${recuarUmDia(s.email)} Dailies`)
    }
  } catch (e) {
    console.log(`  veterano falhou: ${e.message.split('\n')[0]}`)
    await s.p.screenshot({ path: path.join(SAIDA, 'veterano-ERRO.png') }).catch(() => {})
  }
  fs.mkdirSync(path.join(aqui, '.estado'), { recursive: true })
  await s.ctx.storageState({ path: path.join(aqui, '.estado', 'veterano.json') })
  fs.writeFileSync(path.join(aqui, '.estado', 'veterano.email'), s.email)
  await s.browser.close()
}


// ---------------------------------------------------------------------------------------------
async function rodar(tamanho, indice) {
  const s = new Sessao(tamanho, indice)
  console.log(`== ${tamanho} (${s.email})`)
  await s.abrir()
  try {
    if (quer('entrada')) {
      await entradaSemConta(s)
      await criarConta(s)
      await onboarding(s)
    } else {
      await criarConta(s)
      await onboarding(s)
    }
    if (quer('inicio')) await inicioETrilha(s)
    if (quer('hoje')) {
      await sessaoDia1(s)
      await restoDoApp(s, { veteran: false })
      await tentar(s, 'criar-agente', () => criarAgente(s))
    }
  } catch (e) {
    console.log(`  falhou em ${tamanho}: ${e.message.split('\n')[0]}`)
    await s.foto(s.prox(), 'ERRO-no-script', { estado: 'o script parou aqui', nota: e.message.split('\n')[0] }).catch(() => {})
  }
  await s.fechar()
}


async function rodarProgresso() {
  const estado = path.join(aqui, '.estado', 'veterano.json')
  const email = fs.readFileSync(path.join(aqui, '.estado', 'veterano.email'), 'utf8').trim()
  const passes = [
    { nome: 'progresso', n: 100, etapas: ['inicio-progresso', 'trilha-progresso', 'semana-progresso', 'reforco'] },
    { nome: 'progresso2', n: 140, etapas: ['aquecimento', 'ponte', 'projeto-bloqueado', 'reforco-bloqueado', 'perfil', 'squad', 'loja', 'ranking', 'certificacoes', 'caderninho', 'menus'] },
  ]
  for (const passe of passes) {
    ativas = passe.etapas
    let k = 0
    for (const t of TAMANHOS) {
      const s = new Sessao(t, 0)
      s.email = email
      s.fase = passe.nome
      s.n = passe.n
      console.log(`== ${passe.nome} ${t} (${email})`)
      await s.abrir(estado)
      try { await progresso(s, email, k++) } catch (e) { console.log(`  falhou: ${e.message.split('\n')[0]}`) }
      await s.fechar()
    }
  }
  ativas = null
}

async function rodarProjeto() {
  const estado = path.join(aqui, '.estado', 'veterano.json')
  const email = fs.readFileSync(path.join(aqui, '.estado', 'veterano.email'), 'utf8').trim()
  console.log(`  banco local: ponte (Dia 6) do ${email} marcada como concluida: ${concluirPonte(email)}`)
  const semana = semanaId(email, 1)
  const curso = '/start?course=7fd98b33-68bb-4ef9-8d1d-30a5ea3bd476'
  for (const t of TAMANHOS) {
    const s = new Sessao(t, 0)
    s.email = email
    s.fase = 'projeto'
    s.n = 200
    console.log(`== projeto ${t}`)
    await s.abrir(estado)
    await tentar(s, 'projeto', async () => {
      await s.ir('/start')
      await s.foto(s.prox(), 'inicio-ponte-concluida', { estado: 'Inicio com a ponte concluida (6 dias), aponta pro projeto' })
      await s.ir(`${curso}&weekly=${semana}`)
      await s.foto(s.prox(), 'semana-ponte-concluida', { estado: 'visao da semana 1 com a ponte concluida, castelo/projeto liberado' })
      await s.ir(`${curso}&weekly=${semana}&project=1`)
      await s.foto(s.prox(), 'projeto-dialogo-focada', { estado: 'Projeto Semanal: dialogo de abertura da Focada (1 de 4)' })
      if (await s.tem(/^Pular$/)) await s.clicar(/^Pular$/)
      await s.foto(s.prox(), 'projeto-briefing', { estado: 'Projeto Semanal: briefing (objetivo, entregavel)' })
      await s.p.evaluate(() => { document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)) e.scrollTop = e.scrollHeight }); window.scrollTo(0, document.body.scrollHeight) })
      await pausa(600)
      await s.foto(s.prox(), 'projeto-criterios-e-repositorio', { estado: 'Projeto Semanal: fim da pagina, criterios e aviso de repositorio nao provisionado (Forgejo local)' })
    })
    await s.fechar()
  }
}

fs.mkdirSync(SAIDA, { recursive: true })
if (SO.includes('veterano')) await veterano(CONTA)
else if (SO.includes('progresso')) await rodarProgresso()
else if (SO.includes('projeto')) await rodarProjeto()
else {
  let i = CONTA
  for (const t of TAMANHOS) await rodar(t, i++)
}
