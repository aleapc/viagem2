export async function carregar() {
  const prefixo = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  const url = `${prefixo}/data/ofertas.json`;
  const urlEscapadas = `${prefixo}/data/escapadas.json`;
  const [r, re] = await Promise.all([
    fetch(url, { cache: 'no-cache' }),
    fetch(urlEscapadas, { cache: 'no-cache' }),
  ]);
  if (!r.ok) throw new Error(`não consegui ler ${url} (HTTP ${r.status})`);
  const dados = await r.json();
  if (!re.ok) return { ...dados, escapadas: [], escapadas_meta: { status: 'indisponivel' } };
  const escapadas = await re.json();
  return { ...dados, escapadas: escapadas.escapadas ?? [], escapadas_meta: escapadas };
}

export const brl = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export const quando = (iso) => {
  if (!iso) return '';
  const dias = Math.round((Date.now() - new Date(iso)) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
};
export const janelaCurta = (j) => {
  if (!j) return '';
  const m = j.match(/(\d{4})-(\d{2})-(\d{2}) a (\d{4})-(\d{2})-(\d{2})/);
  if (!m) return j;
  const [, , m1, d1, , m2, d2] = m;
  const mes = (x) => ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+x];
  return `${+d1}/${mes(m1)} → ${+d2}/${mes(m2)}`;
};

export const CHAVE = 'VIAGEM_PARA_DOIS_v4';
const CHAVE_V3 = 'VIAGEM_PARA_DOIS_v3';
const CHAVE_V2 = 'VIAGEM_PARA_DOIS_v2';
const CHAVE_V1 = 'CACADOR_v1';
const agora = () => new Date().toISOString();
export const novoId = (prefixo = 'id') => `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const QUALIDADE_PADRAO = {
  hotelEstrelas: 4,
  avaliacaoMinima: 4.3,
  minimoAvaliacoes: 100,
  aceitarSemClassificacao: true,
  classeVoo: 'economica',
  escalasMaximas: 1,
};

export const PREFERENCIAS_PADRAO = {
  percurso: 'rapido', experiencias: [], experienciasFavoritas: [], atividades: [], hospedagemTipos: [], aeroportos: [],
  formatos: ['bate_volta','fim_semana','ferias_7'],
  janelas: [],
  hospedagem: { estrelasMin: null, avaliacaoMin: null, avaliacoesMin: null, nivel: '', aceitarSemClassificacao: null },
  deslocamento: { carroMinutosMax: null, noitesMin: null, noitesMax: null, escalasMax: null, classes: [], evitarMadrugada: false, bagagemObrigatoria: false },
  orcamento: { diariaMin: null, diariaMax: null, escapadaMin: null, escapadaMax: null, viagemMin: null, viagemMax: null, extrapolaEspecial: false },
  inegociaveis: [], calibracao: {}, onboardingCompleto: false,
};

export const CONTEXTO_PADRAO = {
  companhias: [], dogs: { quantidade: 0, portes: [], taxaMax: null, areaExterna: false },
  filhos: [], pais: [], amigos: 0, ocasiao: '', dataInicio: '', dataFim: '',
  orcamentoMin: null, orcamentoMax: null,
};

const completarPreferencias = (p = {}) => ({
  ...PREFERENCIAS_PADRAO, ...p,
  hospedagem: { ...PREFERENCIAS_PADRAO.hospedagem, ...(p.hospedagem ?? {}) },
  deslocamento: { ...PREFERENCIAS_PADRAO.deslocamento, ...(p.deslocamento ?? {}) },
  orcamento: { ...PREFERENCIAS_PADRAO.orcamento, ...(p.orcamento ?? {}) },
});

export function estadoVazio() {
  return {
    versao: 4, qualidadeVersao: 2,
    favoritos: [], descartados: [], escapadasFavoritas: [], gosto: {},
    pessoas: {}, eventos: [], eventosVistos: [], ultimoCompartilhamento: null,
    buscasSalvas: [], metricas: [], contextoBusca: { ...CONTEXTO_PADRAO },
    aparelho: { pessoaId: null, id: novoId('aparelho') },
    dupla: { id: null, status: 'solo', cidade: '', parceiroId: null },
    migracao: { precisaEscolherPessoa: false },
  };
}

export function migrarEstado(salvo = {}) {
  if (salvo.versao >= 3) {
    const base = estadoVazio();
    const pessoas = Object.fromEntries(Object.entries(salvo.pessoas ?? {}).map(([id, p]) => [id, {
      ...p, id, preferencias: completarPreferencias(p.preferencias), qualidade: { ...QUALIDADE_PADRAO, ...(p.qualidade ?? {}),
        aceitarSemClassificacao: salvo.qualidadeVersao >= 2 ? (p.qualidade?.aceitarSemClassificacao ?? true) : true },
    }]));
    const antigo = salvo.contextoBusca ?? {};
    const companhias = antigo.companhias ?? (antigo.companhia && antigo.companhia !== 'casal' ? [antigo.companhia] : []);
    return { ...base, ...salvo, versao:4, contextoBusca: { ...CONTEXTO_PADRAO, ...antigo, companhias }, pessoas, dupla: { ...base.dupla, ...(salvo.dupla ?? {}) }, aparelho: { ...base.aparelho, ...(salvo.aparelho ?? {}) } };
  }
  const pessoasAntigas = salvo.casal?.pessoas ?? [];
  const estado = estadoVazio();
  if (!pessoasAntigas.some((p) => p?.nome)) return estado;
  const pessoas = {};
  for (const [i, p] of pessoasAntigas.entries()) {
    const id = p.id || `p${i + 1}`;
    pessoas[id] = { id, nome: p.nome ?? '', cor: p.cor ?? (i ? '#F472B6' : '#38BDF8'), preferencias: completarPreferencias(), qualidade: { ...QUALIDADE_PADRAO }, atualizadoEm: agora() };
  }
  return {
    ...estado, favoritos: salvo.favoritos ?? [], descartados: salvo.descartados ?? [],
    escapadasFavoritas: salvo.escapadasFavoritas ?? [], gosto: salvo.gosto ?? {}, pessoas,
    dupla: { id: novoId('dupla'), status: pessoasAntigas.length > 1 ? 'pareada' : 'solo', cidade: salvo.casal?.cidade ?? '', parceiroId: null },
    migracao: { precisaEscolherPessoa: pessoasAntigas.length > 1 },
  };
}

export function lerEstado() {
  try {
    const atual = JSON.parse(localStorage.getItem(CHAVE));
    if (atual) return migrarEstado(atual);
    const v3 = JSON.parse(localStorage.getItem(CHAVE_V3));
    const v2 = JSON.parse(localStorage.getItem(CHAVE_V2));
    const v1 = JSON.parse(localStorage.getItem(CHAVE_V1));
    const migrado = migrarEstado(v3 ?? v2 ?? v1 ?? {});
    if (v3 || v2 || v1) gravarEstado(migrado);
    return migrado;
  } catch { return estadoVazio(); }
}

export function gravarEstado(e) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ ...e, versao: 4 })); } catch { /* Safari privado */ }
}

export function pessoaLocal(e) { return e.pessoas?.[e.aparelho?.pessoaId] ?? null; }
export function parceiro(e) { return e.pessoas?.[e.dupla?.parceiroId] ?? null; }

export function criarPerfil(e, { nome, cidade }) {
  const id = novoId('pessoa');
  return {
    ...e,
    pessoas: { ...e.pessoas, [id]: { id, nome: nome.trim(), cor: '#38BDF8', preferencias: completarPreferencias(), qualidade: { ...QUALIDADE_PADRAO }, atualizadoEm: agora() } },
    aparelho: { ...e.aparelho, pessoaId: id },
    dupla: { ...e.dupla, cidade: cidade.trim(), status: 'solo' },
    migracao: { precisaEscolherPessoa: false },
  };
}

export function salvarOnboarding(e, pessoaId, { nome, cidade, preferencias }) {
  const pessoa = e.pessoas[pessoaId];
  if (!pessoa) return e;
  const completas = completarPreferencias({ ...preferencias, onboardingCompleto: true });
  return { ...e, pessoas: { ...e.pessoas, [pessoaId]: { ...pessoa, nome: nome.trim(), preferencias: completas, atualizadoEm: agora() } }, gosto: { ...e.gosto, [pessoaId]: completas.experiencias }, dupla: { ...e.dupla, cidade: cidade.trim() } };
}

export function escolherPessoaMigrada(e, pessoaId) {
  const outro = Object.keys(e.pessoas).find((id) => id !== pessoaId) ?? null;
  return { ...e, aparelho: { ...e.aparelho, pessoaId }, dupla: { ...e.dupla, parceiroId: outro, status: outro ? 'pareada' : 'solo' }, migracao: { precisaEscolherPessoa: false } };
}

export function desvincular(e) {
  const localId = e.aparelho.pessoaId;
  return { ...e, pessoas: localId && e.pessoas[localId] ? { [localId]: e.pessoas[localId] } : {},
    gosto: localId ? { [localId]: e.gosto[localId] ?? [] } : {}, eventosVistos: [],
    dupla: { id: null, status: 'solo', cidade: e.dupla.cidade, parceiroId: null } };
}

export function arquivarEDesvincular(e, arquivar = true) {
  const localId = e.aparelho.pessoaId;
  const arquivo = arquivar && e.dupla?.id ? { id:e.dupla.id, parceiro:e.pessoas?.[e.dupla.parceiroId]?.nome ?? '', eventos:e.eventos ?? [], encerradoEm:agora() } : null;
  const solo = desvincular(e);
  return { ...solo, duplasArquivadas: arquivo ? [...(e.duplasArquivadas ?? []), arquivo] : (e.duplasArquivadas ?? []), eventos: arquivar ? (e.eventos ?? []) : (e.eventos ?? []).filter((x)=>x.pessoaId===localId) };
}

export function sugerirAjustePerfil(e, pessoaId) {
  const recentes=(e.eventos??[]).filter((x)=>x.pessoaId===pessoaId&&x.acao==='gostei').slice(-8);
  const motivos=recentes.flatMap((x)=>x.motivos??[]);
  const contagem=motivos.reduce((a,x)=>({...a,[x]:(a[x]??0)+1}),{});
  const [motivo,vezes]=Object.entries(contagem).sort((a,b)=>b[1]-a[1])[0]??[];
  const jaAplicado=e.pessoas?.[pessoaId]?.preferencias?.atividades?.includes(motivo);
  return vezes>=3 && !jaAplicado ? { motivo, vezes, texto:`Você destacou “${motivo}” ${vezes} vezes. Usar isso como preferência?` } : null;
}

export function registrarEvento(e, { itemId, itemTipo, acao, motivos = [], nota = '' }) {
  const evento = { id: novoId('evento'), duplaId: e.dupla.id, pessoaId: e.aparelho.pessoaId, pessoaNome: pessoaLocal(e)?.nome ?? 'Alguém', itemId, itemTipo, acao, motivos, nota, criadoEm: agora() };
  return { ...e, eventos: [...e.eventos, evento] };
}

export function ultimaAvaliacao(e, itemId, pessoaId = e.aparelho?.pessoaId) {
  return [...(e.eventos ?? [])].reverse().find((evento) =>
    evento.pessoaId === pessoaId && evento.itemId === itemId &&
    ['gostei', 'nao_gostei'].includes(evento.acao)
  );
}

export function registrarMetrica(e, nome, dados = {}) {
  const evento = { nome, dados, criadoEm: agora() };
  return { ...e, metricas: [...(e.metricas ?? []).slice(-99), evento] };
}
