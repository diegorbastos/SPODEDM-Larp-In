import { networks, dayKey } from '../domain/wellbeing.js';

export function createDeviceProtection(device, wellbeing) {
  let queue = Promise.resolve();
  const serial = task => {
    const work = queue.then(task);
    queue = work.catch(() => {});
    return work;
  };
  async function synchronize() {
    const status = await device.getStatus();
    let state = await wellbeing.load();
    let usageError = '';
    if (status.available && status.usageAuthorized && !status.reportOnly) {
      try {
      const usage = await device.getUsage();
      const date = new Date(usage.capturedAt);
      if (!Number.isFinite(date.getTime())) throw new Error('O aparelho retornou uma data de uso inválida.');
      const entries = networks.map(n => {
        const seconds = usage.seconds[n.id];
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) throw new Error('O aparelho retornou um tempo de uso inválido.');
        return { networkId: n.id, minutes: Math.floor(seconds / 60), day: dayKey(date), source: 'device', capturedAt: usage.capturedAt };
      });
      state = await wellbeing.importUsage(entries);
      } catch (e) {
        // Falha de leitura não impede desativar bloqueios ou cancelar o foco.
        usageError = `Uso não atualizado: ${e.message}. Os registros anteriores foram preservados.`;
      }
    }
    let active = false;
    if (state.protectionEnabled) {
      if (status.available && status.usageAuthorized && status.blockingAuthorized && status.selected.length) {
        await device.configure({ enabled: true,
          limits: Object.fromEntries(state.preferences.map(p => [p.id, p.limit])),
          focusEndsAt: state.focus?.endsAt ?? 0, focusStartedAt: state.focus?.startedAt ?? 0 });
        active = true;
      } else {
        await device.stop();
      }
    } else { await device.stop(); }
    return { state, status: { ...status, active, usageError } };
  }
  return {
    refresh: () => serial(synchronize),
    perform: (method, ...args) => serial(async () => {
      if (method === 'reset') await device.stop();
      if (method === 'startFocus') {
        const status = await device.getStatus();
        const state = await wellbeing.load();
        if (state.protectionEnabled && status.platform === 'ios' && Number(args[0]) < 15) {
          throw new Error('No iPhone, escolha pelo menos 15 minutos para foco com bloqueio.');
        }
      }
      // O domínio salva a intenção; falhas nativas nunca são apresentadas como proteção ativa.
      await wellbeing[method](...args);
      return synchronize();
    }),
    enable: () => serial(async () => {
      const status = await device.getStatus();
      if (!status.available) throw new Error('Instale o build nativo para ativar a proteção.');
      if (!status.usageAuthorized || !status.blockingAuthorized) throw new Error('Conceda as permissões de uso e bloqueio primeiro.');
      if (!status.selected.length) throw new Error('Selecione pelo menos um aplicativo.');
      await wellbeing.setProtection(true);
      return synchronize();
    }),
    disable: () => serial(async () => { await device.stop(); await wellbeing.setProtection(false); return synchronize(); }),
    selectApplications: id => serial(async () => {
      const saved = await device.selectApplications(id);
      if (saved) await wellbeing.setProtection(false);
      return synchronize();
    }),
    requestUsageAccess: () => device.requestUsageAccess(),
    requestBlockingAccess: () => device.requestBlockingAccess(),
    showReport: days => device.showReport(days),
    getInstalledApps: () => (device.getInstalledApps ? device.getInstalledApps() : Promise.resolve([])),
  };
}
