// Utilitários compartilhados pelos coletores e pelo pipeline.

import { createHash } from 'node:crypto'

// User-Agent honesto: identifica o app e o dono. Não nos passamos por navegador.
export const UA =
  'viagem2/0.2 (+https://github.com/aleapc/viagem2; leitor pessoal, 1 req/h)'

export async function buscar(url, { tipo = 'text' } = {}) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: tipo === 'xml' ? 'application/xml, text/xml' : 'text/html',
    },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`)
  return r.text()
}

export const locs = (xml) =>
  [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => ({
    loc: (u.match(/<loc>(.*?)<\/loc>/) || [])[1],
    lastmod: (u.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1],
  }))

export const sitemapsDoIndice = (xml) =>
  [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])

// O corpo da matéria é HTML de WordPress cheio de widget, form de busca e
// rodapé de afiliado. O LLM só precisa do texto editorial — cortar o resto
// aqui economiza uns 70% de token por matéria.
export function textoLimpo(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#8230;/g, '...')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

export const idDe = (...partes) =>
  createHash('sha1').update(partes.join('|')).digest('hex').slice(0, 12)

export const hoje = () => new Date().toISOString().slice(0, 10)

// GRU/CGH/VCP são a mesma decisão de viagem para quem mora em São Paulo.
// A tabela de área metropolitana da IATA é fechada e pequena — normalizar
// aqui evita que o LLM decida sozinho que "SP" é "GRU" e erre nos 5% que
// justamente viram duplicata.
const METRO = {
  GRU: 'SAO', CGH: 'SAO', VCP: 'SAO',
  GIG: 'RIO', SDU: 'RIO',
  EZE: 'BUE', AEP: 'BUE',
  JFK: 'NYC', EWR: 'NYC', LGA: 'NYC',
  LHR: 'LON', LGW: 'LON', STN: 'LON',
  CDG: 'PAR', ORY: 'PAR',
  NRT: 'TYO', HND: 'TYO',
  MXP: 'MIL', LIN: 'MIL',
}
export const metro = (iata) => METRO[(iata || '').toUpperCase()] || (iata || '').toUpperCase()
