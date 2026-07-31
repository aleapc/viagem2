import test from 'node:test';
import assert from 'node:assert/strict';
import { proximasOcasioes } from '../src/lib/ocasioes.js';

test('destaca datas comemorativas futuras em ordem', () => {
  const proximas=proximasOcasioes(new Date(2026,6,31,12));
  assert.equal(proximas[0].nome,'Dia dos Pais');
  assert.equal(proximas[0].data,'2026-08-09');
  assert.ok(proximas[0].janela[0] < proximas[0].data);
});
