import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCriterios, avaliarDupla } from '../src/lib/personalizacao.js';
import { PREFERENCIAS_PADRAO, CONTEXTO_PADRAO } from '../src/lib/dados.js';

const pessoa = (preferencias = {}) => ({ id: 'a', preferencias: { ...PREFERENCIAS_PADRAO, ...preferencias, hospedagem: { ...PREFERENCIAS_PADRAO.hospedagem, ...(preferencias.hospedagem ?? {}) }, orcamento: { ...PREFERENCIAS_PADRAO.orcamento, ...(preferencias.orcamento ?? {}) } } });
const hotel = { itemTipo:'escapada', estrelas:null, avaliacao:4.3, avaliacoes:2529, preco_noite:213, preco_total:213, tags:['descanso'] };

test('sem critérios definidos não presume que Mont Rey seja inadequado', () => {
  assert.equal(avaliarCriterios(hotel, pessoa(), CONTEXTO_PADRAO).passa, true);
});
test('critério escolhido pelo usuário barra hotel incompatível', () => {
  assert.equal(avaliarCriterios(hotel, pessoa({ hospedagem:{ estrelasMin:4, aceitarSemClassificacao:false } }), CONTEXTO_PADRAO).passa, false);
});
test('perfil flexível pode continuar recebendo hotel sem categoria', () => {
  assert.equal(avaliarCriterios(hotel, pessoa({ hospedagem:{ avaliacaoMin:4.2, aceitarSemClassificacao:true } }), CONTEXTO_PADRAO).passa, true);
});
test('contexto com dogs exige confirmação pet friendly', () => {
  const contexto={...CONTEXTO_PADRAO,companhia:'dogs'};
  assert.equal(avaliarCriterios(hotel,pessoa(),contexto).passa,false);
  assert.equal(avaliarCriterios({...hotel,petFriendly:true},pessoa(),contexto).passa,true);
});
test('mobilidade de pais exige acessibilidade confirmada', () => {
  const contexto={...CONTEXTO_PADRAO,companhia:'pais',pais:[{idade:78,mobilidadeReduzida:true}]};
  assert.equal(avaliarCriterios(hotel,pessoa(),contexto).passa,false);
});
test('qualquer inegociável da dupla é respeitado', () => {
  const flex=pessoa(); const rigor=pessoa({hospedagem:{avaliacaoMin:4.5}});
  assert.equal(avaliarDupla(hotel,[flex,rigor],CONTEXTO_PADRAO).passa,false);
});
test('régua livre respeita mínimo e máximo escolhidos', () => {
  const p=pessoa({orcamento:{diariaMin:300,diariaMax:600}});
  assert.equal(avaliarCriterios(hotel,p,CONTEXTO_PADRAO).passa,false);
  assert.equal(avaliarCriterios({...hotel,preco_noite:450},p,CONTEXTO_PADRAO).passa,true);
});
