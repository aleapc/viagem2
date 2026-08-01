import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoVazio, migrarEstado, criarPerfil, escolherPessoaMigrada, desvincular, arquivarEDesvincular, registrarEvento, ultimaAvaliacao, salvarOnboarding, sugerirAjustePerfil } from '../src/lib/dados.js';

test('migra v2 preservando escolhas e pede identidade local', () => {
  const v3 = migrarEstado({ favoritos: ['x'], gosto: { p1: ['praia'] }, casal: { cidade: 'São Paulo', pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }] } });
  assert.equal(v3.versao, 4); assert.deepEqual(v3.favoritos, ['x']); assert.equal(v3.migracao.precisaEscolherPessoa, true);
  const escolhido = escolherPessoaMigrada(v3, 'p1'); assert.equal(escolhido.dupla.parceiroId, 'p2');
});
test('onboarding cria somente a pessoa deste aparelho', () => {
  const e = criarPerfil(estadoVazio(), { nome: 'Ana', cidade: 'São Paulo' });
  assert.equal(Object.keys(e.pessoas).length, 1); assert.equal(e.dupla.status, 'solo');
});
test('onboarding salva critérios escolhidos sem inventar limites', () => {
  let e = criarPerfil(estadoVazio(), { nome:'Ana', cidade:'São Paulo' });
  const id=e.aparelho.pessoaId;
  e=salvarOnboarding(e,id,{nome:'Ana',cidade:'Campinas',preferencias:{experiencias:['praia'],hospedagem:{estrelasMin:null},orcamento:{diariaMin:250,diariaMax:900}}});
  assert.equal(e.pessoas[id].preferencias.onboardingCompleto,true);
  assert.equal(e.pessoas[id].preferencias.hospedagem.estrelasMin,null);
  assert.equal(e.pessoas[id].preferencias.orcamento.diariaMax,900);
  assert.equal(e.dupla.cidade,'Campinas');
});
test('desvincular preserva perfil e histórico pessoal', () => {
  let e = criarPerfil(estadoVazio(), { nome: 'Ana', cidade: 'São Paulo' });
  e = registrarEvento(e, { itemId: 'hotel:1', itemTipo: 'escapada', acao: 'gostei' });
  e = { ...e, pessoas: { ...e.pessoas, b: { id: 'b', nome: 'Bia' } }, dupla: { ...e.dupla, id: 'd', parceiroId: 'b', status: 'pareada' } };
  const solo = desvincular(e); assert.equal(Object.keys(solo.pessoas).length, 1); assert.equal(solo.eventos.length, 1); assert.equal(solo.dupla.status, 'solo');
});
test('recupera a avaliação mais recente da pessoa neste aparelho', () => {
  let e = criarPerfil(estadoVazio(), { nome: 'Ana', cidade: 'São Paulo' });
  e = registrarEvento(e, { itemId: 'cidade-do-cabo', itemTipo: 'viagem', acao: 'gostei', motivos: ['Destino'], nota: 'Boa opção' });
  e = registrarEvento(e, { itemId: 'cidade-do-cabo', itemTipo: 'viagem', acao: 'salvei' });
  assert.equal(ultimaAvaliacao(e, 'cidade-do-cabo').acao, 'gostei');
  assert.deepEqual(ultimaAvaliacao(e, 'cidade-do-cabo').motivos, ['Destino']);
});
test('migração v4 converte companhia antiga em filtros combináveis',()=>{const e=migrarEstado({...estadoVazio(),versao:3,contextoBusca:{companhia:'dogs'}});assert.deepEqual(e.contextoBusca.companhias,['dogs'])});
test('desvinculação pode arquivar a dupla sem perder perfil',()=>{let e=criarPerfil(estadoVazio(),{nome:'Ana',cidade:'São Paulo'});e={...e,dupla:{...e.dupla,id:'d',status:'pareada',parceiroId:'b'},pessoas:{...e.pessoas,b:{id:'b',nome:'Bia'}}};const r=arquivarEDesvincular(e,true);assert.equal(r.dupla.status,'solo');assert.equal(r.duplasArquivadas[0].parceiro,'Bia')});
test('aprendizado só sugere ajuste depois de padrão repetido',()=>{let e=criarPerfil(estadoVazio(),{nome:'Ana',cidade:'São Paulo'});for(let i=0;i<3;i++)e=registrarEvento(e,{itemId:`x${i}`,itemTipo:'viagem',acao:'gostei',motivos:['vinícolas']});const id=e.aparelho.pessoaId;assert.equal(sugerirAjustePerfil(e,id).motivo,'vinícolas');e.pessoas[id].preferencias.atividades=['vinícolas'];assert.equal(sugerirAjustePerfil(e,id),null)});
