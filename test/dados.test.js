import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoVazio, migrarEstado, criarPerfil, escolherPessoaMigrada, desvincular, registrarEvento, ultimaAvaliacao } from '../src/lib/dados.js';

test('migra v2 preservando escolhas e pede identidade local', () => {
  const v3 = migrarEstado({ favoritos: ['x'], gosto: { p1: ['praia'] }, casal: { cidade: 'São Paulo', pessoas: [{ id: 'p1', nome: 'Ana' }, { id: 'p2', nome: 'Bia' }] } });
  assert.equal(v3.versao, 3); assert.deepEqual(v3.favoritos, ['x']); assert.equal(v3.migracao.precisaEscolherPessoa, true);
  const escolhido = escolherPessoaMigrada(v3, 'p1'); assert.equal(escolhido.dupla.parceiroId, 'p2');
});
test('onboarding cria somente a pessoa deste aparelho', () => {
  const e = criarPerfil(estadoVazio(), { nome: 'Ana', cidade: 'São Paulo' });
  assert.equal(Object.keys(e.pessoas).length, 1); assert.equal(e.dupla.status, 'solo');
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
