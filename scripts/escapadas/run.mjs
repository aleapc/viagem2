import { readFile, writeFile } from 'node:fs/promises'

const ARQUIVO = new URL('../../static/data/escapadas.json', import.meta.url)
const chave = process.env.SERPAPI_KEY
if (!chave) { console.log('escapadas: SERPAPI_KEY ausente — mantendo dados atuais'); process.exit(0) }

const forcar = process.argv.includes('--force')
const agora = new Date()
const inicioAno = new Date(Date.UTC(agora.getUTCFullYear(), 0, 1))
const semana = `${agora.getUTCFullYear()}-W${String(Math.ceil((((agora - inicioAno) / 86400000) + inicioAno.getUTCDay() + 1) / 7)).padStart(2, '0')}`
const anterior = JSON.parse(await readFile(ARQUIVO, 'utf8'))
if (!forcar && anterior.semana === semana && anterior.escapadas?.length) {
  console.log(`escapadas: semana ${semana} já coletada (${anterior.escapadas.length} achados)`)
  process.exit(0)
}

function proximaSexta(base = new Date()) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()))
  let dias = (5 - d.getUTCDay() + 7) % 7
  if (dias < 2) dias += 7
  d.setUTCDate(d.getUTCDate() + dias)
  return d
}
const iso = (d) => d.toISOString().slice(0, 10)
const entrada = proximaSexta(agora)

const destinos = [
  { destino: 'São Paulo', busca: 'hotéis românticos com spa em São Paulo', noites: 1, distancia: 'na própria cidade', tipo: 'Na cidade', icone: '🌙', tags: ['descanso','gastronomico'] },
  { destino: 'São Roque', busca: 'pousadas românticas em São Roque SP', noites: 1, distancia: 'cerca de 1h15 de São Paulo', tipo: 'Perto de casa', icone: '🍷', tags: ['gastronomico','descanso'] },
  { destino: 'Cunha', busca: 'pousadas românticas em Cunha SP', noites: 2, distancia: 'cerca de 3h de São Paulo', tipo: 'Fim de semana', icone: '⛰️', tags: ['natureza','cultural'] },
  { destino: 'Santos', busca: 'hotéis para casal em Santos SP', noites: 1, distancia: 'cerca de 1h30 de São Paulo', tipo: 'Perto do mar', icone: '🌊', tags: ['praia','cultural'] },
]

async function consultar(cfg) {
  const saida = new Date(entrada); saida.setUTCDate(saida.getUTCDate() + cfg.noites)
  const p = new URLSearchParams({
    engine: 'google_hotels', q: cfg.busca, check_in_date: iso(entrada), check_out_date: iso(saida),
    adults: '2', currency: 'BRL', gl: 'br', hl: 'pt-br', sort_by: '3',
    rating: '8', hotel_class: '3,4,5', api_key: chave,
  })
  const r = await fetch(`https://serpapi.com/search.json?${p}`)
  if (!r.ok) throw new Error(`${cfg.destino}: HTTP ${r.status}`)
  const j = await r.json()
  if (j.error) throw new Error(`${cfg.destino}: ${j.error}`)
  const candidatos = (j.properties ?? []).filter((h) => h.rate_per_night?.extracted_lowest > 0)
  candidatos.sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0) || a.rate_per_night.extracted_lowest - b.rate_per_night.extracted_lowest)
  return candidatos.slice(0, 8).map((h) => ({
    id: `hotel:${cfg.destino.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-')}:${h.property_token ?? h.name.toLowerCase().replace(/\W+/g,'-')}`,
    destino: cfg.destino, nome: h.name, tipo: cfg.tipo, icone: cfg.icone, tags: cfg.tags,
    distancia: cfg.distancia, noites: cfg.noites, checkin: iso(entrada), checkout: iso(saida),
    preco_noite: h.rate_per_night.extracted_lowest, preco_total: h.rate_per_night.extracted_lowest * cfg.noites,
    avaliacao: h.overall_rating ?? null, avaliacoes: h.reviews ?? null,
    estrelas: h.extracted_hotel_class ?? (Number.parseInt(h.hotel_class, 10) || null),
    petFriendly: (h.amenities ?? []).some((a) => /pet|animal/i.test(a)),
    familyFriendly: (h.amenities ?? []).some((a) => /kid|child|family|crib/i.test(a)),
    acessivel: (h.amenities ?? []).some((a) => /accessible|wheelchair|elevator/i.test(a)),
    categoria: h.type ?? h.property_type ?? null,
    comodidades: (h.amenities ?? []).slice(0, 4), imagem: h.images?.[0]?.thumbnail ?? null,
    descricao: h.description ?? `Uma opção para ${cfg.noites === 1 ? 'uma noite' : 'o fim de semana'} a dois.`,
    fonte: 'Google Hotels', link: h.link ?? j.search_metadata?.google_hotels_url ?? `https://www.google.com/travel/hotels?q=${encodeURIComponent(cfg.busca)}`,
  }))
}

const resultados = []
const erros = []
for (const destino of destinos) {
  try { resultados.push(...await consultar(destino)) }
  catch (e) { erros.push(e.message); console.log(`::warning title=Escapada indisponível::${e.message}`) }
}
if (!resultados.length) throw new Error(`escapadas: nenhuma propriedade retornada (${erros.join('; ')})`)
await writeFile(ARQUIVO, JSON.stringify({
  gerado_em: agora.toISOString(), semana, status: erros.length ? 'parcial' : 'ok', praca: 'São Paulo',
  fonte: 'Google Hotels via SerpApi', periodo: { checkin: iso(entrada), checkout_max: iso(new Date(entrada.getTime() + 2 * 86400000)) },
  erros, escapadas: resultados,
}, null, 2) + '\n')
console.log(`escapadas: ${resultados.length} hotéis para ${iso(entrada)} (${erros.length} erro(s))`)
