import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceProtection } from '../src/application/createDeviceProtection.js';
import { createWellbeing } from '../src/application/createWellbeing.js';
import { LocalWellbeingRepository } from '../src/data/LocalWellbeingRepository.js';

function fixture(overrides = {}) {
  let raw = null;
  const date = new Date(2026, 10, 15, 12);
  const well = createWellbeing(new LocalWellbeingRepository({ getItem: async () => raw, setItem: async (_, v) => { raw = v; } }), () => date);
  const calls = [];
  const status = { available: true, platform: 'android', usageAuthorized: true, blockingAuthorized: true, reportOnly: false, selected: ['instagram', 'youtube', 'tiktok'], ...overrides };
  const device = {
    getStatus: async () => ({ ...status }),
    getUsage: async () => ({ capturedAt: date.getTime(), seconds: { instagram: 125, youtube: 60, tiktok: 0 } }),
    configure: async rules => { calls.push(rules); }, stop: async () => { calls.push('stop'); },
    selectApplications: async () => true, showReport: async () => { calls.push('report'); },
  };
  return { app: createDeviceProtection(device, well), well, device, status, calls };
}
test('uso automático substitui o manual sem duplicar, com origem e timestamp', async () => {
  const f = fixture();
  await f.well.recordUsage('instagram', 30);
  const result = await f.app.refresh();
  assert.equal(result.state.usage.find(e => e.networkId === 'instagram').minutes, 2);
  assert.equal(result.state.usage[0].source, 'device');
  assert.equal((await f.app.refresh()).state.usage.length, 3);
});
test('não coleta nem ativa sem autorização', async () => {
  const f = fixture({ usageAuthorized: false });
  f.device.getUsage = () => { throw new Error('não deveria consultar'); };
  assert.equal((await f.app.refresh()).state.usage.length, 0);
  await assert.rejects(f.app.enable(), /permissões/);
  assert.equal((await f.well.load()).protectionEnabled, false);
});
test('Expo Go continua em modo manual e não promete bloqueio', async () => {
  const f = fixture({ available: false, usageAuthorized: false });
  await f.app.perform('recordUsage', 'instagram', 8);
  assert.equal((await f.app.refresh()).status.active, false);
  await assert.rejects(f.app.enable(), /build nativo/);
});
test('iOS não tenta extrair dados do relatório protegido', async () => {
  const f = fixture({ platform: 'ios', reportOnly: true });
  f.device.getUsage = () => { throw new Error('não exportar dados privados'); };
  const result = await f.app.enable();
  assert.equal(result.status.active, true);
  assert.equal(result.state.usage.length, 0);
  await f.app.showReport(7);
  assert.ok(f.calls.includes('report'));
});
test('iOS exige seleção antes de ativar e rejeita foco curto antes de salvar', async () => {
  const f = fixture({ platform: 'ios', reportOnly: true, selected: [] });
  await assert.rejects(f.app.enable(), /Selecione/);
  f.status.selected = ['instagram'];
  await f.app.enable();
  await assert.rejects(f.app.perform('startFocus', 1), /15 minutos/);
  assert.equal((await f.well.load()).focus, null);
});
test('foco e metas chegam ao adaptador; cancelamento remove o prazo', async () => {
  const f = fixture();
  await f.app.enable();
  await f.app.perform('startFocus', 25);
  assert.ok(f.calls.at(-1).focusEndsAt > f.calls.at(-1).focusStartedAt);
  await f.app.perform('updatePreference', 'instagram', 45, 'Conversar');
  assert.equal(f.calls.at(-1).limits.instagram, 45);
  await f.app.perform('cancelFocus');
  assert.equal(f.calls.at(-1).focusEndsAt, 0);
});
test('revogação para proteção nativa sem apresentar estado ativo', async () => {
  const f = fixture();
  await f.app.enable();
  f.status.blockingAuthorized = false;
  assert.equal((await f.app.refresh()).status.active, false);
  assert.equal(f.calls.at(-1), 'stop');
});
test('falha de leitura conserva os dados e não impede cancelar foco', async () => {
  const f = fixture();
  await f.app.enable();
  await f.app.perform('startFocus', 25);
  f.device.getUsage = async () => { throw new Error('aparelho bloqueado'); };
  const result = await f.app.perform('cancelFocus');
  assert.equal(result.state.focus, null);
  assert.equal(f.calls.at(-1).focusEndsAt, 0);
  assert.match(result.status.usageError, /preservados/);
  assert.equal(result.state.usage.length, 3);
});
test('falha ao configurar não retorna sucesso de ativação', async () => {
  const f = fixture();
  f.device.configure = async () => { throw new Error('capacidade ausente'); };
  await assert.rejects(f.app.enable(), /capacidade/);
});
test('seleção nova desativa proteção e seleção cancelada preserva preferência', async () => {
  const f = fixture({ platform: 'ios', reportOnly: true });
  await f.app.enable();
  f.device.selectApplications = async () => false;
  assert.equal((await f.app.selectApplications('instagram')).state.protectionEnabled, true);
  f.device.selectApplications = async () => true;
  assert.equal((await f.app.selectApplications('instagram')).state.protectionEnabled, false);
});
test('desativar e restaurar sempre removem as restrições nativas', async () => {
  const f = fixture();
  await f.app.enable();
  assert.equal((await f.app.disable()).state.protectionEnabled, false);
  await f.app.enable();
  assert.equal((await f.app.perform('reset')).state.protectionEnabled, false);
  assert.equal(f.calls.at(-1), 'stop');
});
