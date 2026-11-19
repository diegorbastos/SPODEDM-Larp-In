import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceProtection } from '../src/application/createDeviceProtection.js';
import { createWellbeing } from '../src/application/createWellbeing.js';
import { LocalWellbeingRepository } from '../src/data/LocalWellbeingRepository.js';

function fixture(overrides = {}) {
  let raw = null;
  const date = new Date(2026, 10, 15, 12);
  const well = createWellbeing(
    new LocalWellbeingRepository({ getItem: async () => raw, setItem: async (_, v) => { raw = v; } }),
    () => date
  );
  const calls = [];
  const status = {
    available: true,
    platform: 'android',
    usageAuthorized: true,
    blockingAuthorized: true,
    selected: ['instagram', 'youtube', 'tiktok'],
    blockedToday: 0,
    blockedByTarget: { reels: 0, shorts: 0, tiktok: 0, others: 0 },
    ...overrides,
  };
  const device = {
    getStatus: async () => ({ ...status }),
    getUsage: async () => ({ capturedAt: date.getTime(), seconds: { instagram: 125, youtube: 60, tiktok: 0 } }),
    configure: async rules => { calls.push(rules); },
    stop: async () => { calls.push('stop'); },
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

test('não coleta uso sem permissão de uso, mas permite bloqueio flexível de Reels/Shorts/TikTok com acessibilidade', async () => {
  const f = fixture({ usageAuthorized: false, blockingAuthorized: true });
  f.device.getUsage = () => { throw new Error('não deveria consultar'); };
  assert.equal((await f.app.refresh()).state.usage.length, 0);
  const enabled = await f.app.enable();
  assert.equal(enabled.status.active, true);
  assert.equal(enabled.status.shortVideoActive, true);
  assert.equal(enabled.status.monitoringActive, false);
  assert.deepEqual(f.calls.at(-1).shortVideoBlocks, { reels: true, shorts: true, tiktok: true, others: true });
});

test('não ativa escudo sem serviço de bloqueio autorizado', async () => {
  const f = fixture({ usageAuthorized: true, blockingAuthorized: false });
  await assert.rejects(f.app.enable(), /bloqueio/);
  assert.equal((await f.well.load()).protectionEnabled, false);
});

test('Expo Go continua em modo manual e não promete bloqueio', async () => {
  const f = fixture({ available: false, usageAuthorized: false, blockingAuthorized: false });
  await f.app.perform('recordUsage', 'instagram', 8);
  assert.equal((await f.app.refresh()).status.active, false);
  await assert.rejects(f.app.enable(), /APK Android/);
});

test('foco, metas e filtros de vídeos curtos chegam ao adaptador; cancelamento remove o prazo', async () => {
  const f = fixture();
  await f.app.enable();
  await f.app.perform('startFocus', 25);
  assert.ok(f.calls.at(-1).focusEndsAt > f.calls.at(-1).focusStartedAt);
  await f.app.perform('updatePreference', 'instagram', 45, 'Conversar');
  assert.equal(f.calls.at(-1).limits.instagram, 45);
  await f.app.perform('setShortVideoBlock', 'reels', false);
  assert.equal(f.calls.at(-1).shortVideoBlocks.reels, false);
  assert.equal(f.calls.at(-1).shortVideoBlocks.shorts, true);
  await f.app.perform('cancelFocus');
  assert.equal(f.calls.at(-1).focusEndsAt, 0);
});

test('revogação da acessibilidade para proteção nativa sem apresentar estado ativo', async () => {
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
  f.device.configure = async () => { throw new Error('falha nativa'); };
  await assert.rejects(f.app.enable(), /falha nativa/);
});

test('desativar e restaurar sempre removem as restrições nativas', async () => {
  const f = fixture();
  await f.app.enable();
  assert.equal((await f.app.disable()).state.protectionEnabled, false);
  await f.app.enable();
  assert.equal((await f.app.perform('reset')).state.protectionEnabled, false);
  assert.equal(f.calls.at(-1), 'stop');
});

test('monitoramento em segundo plano funciona apenas com permissão de uso, sem exigir acessibilidade', async () => {
  const f = fixture({ usageAuthorized: true, blockingAuthorized: false });
  const result = await f.app.refresh();
  assert.equal(result.status.monitoringActive, true);
  assert.equal(result.status.active, false);
  assert.equal(result.state.usage.find(e => e.networkId === 'instagram').minutes, 2);
});
