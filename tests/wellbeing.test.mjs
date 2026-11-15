import test from 'node:test';
import assert from 'node:assert/strict';
import { createWellbeing } from '../src/application/createWellbeing.js';
import { LocalWellbeingRepository } from '../src/data/LocalWellbeingRepository.js';
import { initialState, summary } from '../src/domain/wellbeing.js';

function fixture() {
  let raw = null;
  let date = new Date(2026, 10, 15, 12);
  const storage = { getItem: async () => raw, setItem: async (_, value) => { raw = value; } };
  const repository = new LocalWellbeingRepository(storage);
  return { app: createWellbeing(repository, () => date), repository, storage,
    advance: minutes => { date = new Date(date.getTime() + minutes * 60000); },
    corrupt: () => { raw = '{invalid'; } };
}

test('primeiro uso não inventa estatísticas', async () => {
  const { app } = fixture();
  const state = await app.load();
  assert.deepEqual(state, initialState());
  assert.equal(summary(state).recorded, false);
});
test('registro substitui total do dia e preserva outras redes em operações concorrentes', async () => {
  const { app } = fixture();
  await Promise.all([app.recordUsage('instagram', '20'), app.recordUsage('youtube', '10')]);
  const state = await app.recordUsage('instagram', '5');
  assert.equal(state.usage.length, 2);
  assert.equal(summary(state, new Date(2026, 10, 15)).total, 15);
});
test('valida minutos, intenções e total de 24 horas', async () => {
  const { app } = fixture();
  for (const value of ['', '-1', '2.5', 'abc', '1441']) await assert.rejects(app.recordUsage('instagram', value));
  await assert.rejects(app.updatePreference('instagram', '30', ' '));
  await assert.rejects(app.recordUsage('unknown', '5'));
  await app.recordUsage('instagram', '1440');
  await assert.rejects(app.recordUsage('youtube', '1'));
  assert.equal((await app.recordUsage('instagram', '0')).usage[0].minutes, 0);
});
test('sessão sobrevive a nova instância e conclui uma única vez após retorno', async () => {
  const f = fixture();
  await f.app.startFocus(25);
  await assert.rejects(f.app.startFocus(10));
  assert.ok((await f.repository.load()).focus);
  f.advance(30);
  const state = await f.app.load();
  assert.equal(state.focus, null);
  assert.equal(state.sessions[0].status, 'completed');
  assert.equal((await f.app.load()).sessions.length, 1);
});
test('cancelamento não conta como minutos concluídos', async () => {
  const f = fixture();
  await f.app.startFocus(25);
  f.advance(5);
  const state = await f.app.cancelFocus();
  assert.equal(state.sessions[0].status, 'cancelled');
  assert.equal(summary(state, new Date(2026, 10, 15)).focusMinutes, 0);
});
test('mudança de dia não reaproveita uso de ontem', async () => {
  const f = fixture();
  await f.app.recordUsage('instagram', '10');
  f.advance(1440);
  assert.equal(summary(await f.app.load(), new Date(2026, 10, 16)).total, 0);
});
test('falha de escrita é propagada; corrupção não é sobrescrita silenciosamente', async () => {
  const f = fixture();
  f.storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(f.app.recordUsage('instagram', '10'), /disk full/);
  f.corrupt();
  await assert.rejects(f.app.load(), /dados locais/);
});
test('restauração recupera armazenamento corrompido', async () => {
  const f = fixture();
  f.corrupt();
  assert.deepEqual(await f.app.reset(), initialState());
  assert.deepEqual(await f.repository.load(), initialState());
});
test('retenção remove registros antigos', async () => {
  const f = fixture();
  await f.app.recordUsage('instagram', '10');
  f.advance(91 * 1440);
  assert.equal((await f.app.load()).usage.length, 0);
});
