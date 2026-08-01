const numero = (v) => v === '' || v == null ? null : Number(v);

export function avaliarCriterios(item, pessoa, contexto = {}) {
  const p = pessoa?.preferencias ?? {};
  const h = p.hospedagem ?? {};
  const d = p.deslocamento ?? {};
  const o = p.orcamento ?? {};
  const vetos = new Set(p.inegociaveis ?? []);
  const falhas = [];
  const acertos = [];
  const escapada = item.itemTipo === 'escapada';
  const exigir = (condicao, mensagem) => { if (!condicao) falhas.push(mensagem); };

  if (escapada) {
    if (h.estrelasMin != null) exigir(item.estrelas != null && item.estrelas >= numero(h.estrelasMin), `categoria mínima de ${h.estrelasMin} estrelas`);
    if (h.avaliacaoMin != null) exigir(item.avaliacao != null && item.avaliacao >= numero(h.avaliacaoMin), `avaliação mínima ${h.avaliacaoMin}`);
    if (h.avaliacoesMin != null) exigir(item.avaliacoes != null && item.avaliacoes >= numero(h.avaliacoesMin), `mínimo de ${h.avaliacoesMin} avaliações`);
    if (h.aceitarSemClassificacao === false) exigir(item.estrelas != null, 'categoria oficial informada');
    if (p.hospedagemTipos?.length && item.hospedagemTipo) exigir(p.hospedagemTipos.includes(item.hospedagemTipo), 'tipo de hospedagem escolhido');
    const diaria = numero(item.preco_noite ?? item.preco_total);
    if (o.diariaMin != null) exigir(diaria >= numero(o.diariaMin), `diária a partir de R$ ${o.diariaMin}`);
    if (o.diariaMax != null && !(contexto.ocasiao && o.extrapolaEspecial)) exigir(diaria <= numero(o.diariaMax), `diária até R$ ${o.diariaMax}`);
    if (o.escapadaMin != null) exigir(numero(item.preco_total) >= numero(o.escapadaMin), `escapada a partir de R$ ${o.escapadaMin}`);
    if (o.escapadaMax != null && !(contexto.ocasiao && o.extrapolaEspecial)) exigir(numero(item.preco_total) <= numero(o.escapadaMax), `escapada até R$ ${o.escapadaMax}`);
  } else {
    const total = numero(item.preco_brl) * (item.por_pessoa ? 2 : 1);
    if (o.viagemMin != null) exigir(total >= numero(o.viagemMin), `viagem a partir de R$ ${o.viagemMin}`);
    if (o.viagemMax != null && !(contexto.ocasiao && o.extrapolaEspecial)) exigir(total <= numero(o.viagemMax), `viagem até R$ ${o.viagemMax}`);
    if (d.escalasMax != null && item.escalas != null) exigir(item.escalas <= numero(d.escalasMax), `máximo de ${d.escalasMax} escala(s)`);
  }

  if (vetos.has('sem_madrugada') && item.vooMadrugada === true) falhas.push('voo de madrugada');
  if (vetos.has('direto') && item.escalas != null && item.escalas > 0) falhas.push('voo com escala');
  if (vetos.has('nao_fumante') && item.naoFumante !== true) falhas.push('ambiente não fumante não confirmado');
  if (vetos.has('adult_only') && item.adultOnly !== true) falhas.push('propriedade adult-only não confirmada');

  const companhias=contexto.companhias?.length ? contexto.companhias : (contexto.companhia&&contexto.companhia!=='casal'?[contexto.companhia]:[]);
  if (companhias.includes('dogs')) exigir(item.petFriendly === true, 'aceitação de pets confirmada');
  if (companhias.includes('filhos')) exigir(item.familyFriendly === true, 'estrutura familiar confirmada');
  if (companhias.includes('pais') && contexto.pais?.some((x) => x.mobilidadeReduzida)) exigir(item.acessivel === true, 'acessibilidade confirmada');
  const preco = numero(item.preco_total ?? (item.preco_brl * (item.por_pessoa ? 2 : 1)));
  if (contexto.orcamentoMin != null) exigir(preco >= numero(contexto.orcamentoMin), `orçamento mínimo de R$ ${contexto.orcamentoMin}`);
  if (contexto.orcamentoMax != null) exigir(preco <= numero(contexto.orcamentoMax), `orçamento máximo de R$ ${contexto.orcamentoMax}`);
  const dataItem = item.checkin ?? item.janela_inicio ?? null;
  if (contexto.dataInicio && dataItem) exigir(dataItem >= contexto.dataInicio, `data a partir de ${contexto.dataInicio}`);
  if (contexto.dataFim && dataItem) exigir(dataItem <= contexto.dataFim, `data até ${contexto.dataFim}`);

  const tags = item.tags ?? item.tipos ?? [];
  const comuns = (p.experiencias ?? []).filter((x) => tags.includes(x));
  if (comuns.length) acertos.push(`${comuns.length} interesse${comuns.length > 1 ? 's' : ''} seu(s)`);
  if (contexto.ocasiao) acertos.push(`viagem para ${contexto.ocasiao}`);
  return { passa: falhas.length === 0, falhas, acertos };
}

export function avaliarDupla(item, pessoas, contexto) {
  const resultados = pessoas.map((p) => avaliarCriterios(item, p, contexto));
  return { passa: resultados.every((r) => r.passa), falhas: [...new Set(resultados.flatMap((r) => r.falhas))], acertos: [...new Set(resultados.flatMap((r) => r.acertos))] };
}

export const resumoContexto = (c = {}) => {
  const partes = [];
  const companhias=c.companhias?.length ? c.companhias : (c.companhia&&c.companhia!=='casal'?[c.companhia]:[]);
  if (companhias.length) partes.push(companhias.map(x=>({dogs:'dogs',filhos:'filhos',pais:'pais',amigos:'amigos',outros:'outros'}[x]??x)).join(' + '));
  if (c.ocasiao) partes.push(c.ocasiao);
  if (c.orcamentoMin != null || c.orcamentoMax != null) partes.push(`R$ ${c.orcamentoMin ?? 0}–${c.orcamentoMax ?? 'sem limite'}`);
  return partes.filter(Boolean).join(' · ') || 'Só vocês dois · sem filtros temporários';
};
