import { networks, dayKey, normalizeShortVideoBlocks } from '../domain/wellbeing.js';

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

    // Monitoramento de uso em segundo plano funciona apenas com Acesso ao Uso (sem exigir acessibilidade).
    if (status.available && status.usageAuthorized) {
      try {
        const usage = await device.getUsage();
        const date = new Date(usage.capturedAt);
        if (!Number.isFinite(date.getTime())) throw new Error('O aparelho retornou uma data de uso inválida.');
        const entries = networks.map(n => {
          const seconds = usage.seconds[n.id];
          if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) {
            throw new Error('O aparelho retornou um tempo de uso inválido.');
          }
          return {
            networkId: n.id,
            minutes: Math.floor(seconds / 60),
            day: dayKey(date),
            source: 'device',
            capturedAt: usage.capturedAt,
          };
        });
        state = await wellbeing.importUsage(entries);
      } catch (e) {
        // Falha de leitura não impede desativar bloqueios ou cancelar o foco.
        usageError = `Uso não atualizado: ${e.message}. Os registros anteriores foram preservados.`;
      }
    }

    const shortVideoBlocks = normalizeShortVideoBlocks(state.shortVideoBlocks);
    let active = false;

    // Permissões flexíveis no Android: bloqueio de Reels, Shorts, TikTok, Afins e Foco
    // funciona assim que o serviço de bloqueio em segundo plano estiver autorizado.
    if (state.protectionEnabled) {
      if (status.available && status.blockingAuthorized) {
        await device.configure({
          enabled: true,
          limits: Object.fromEntries(state.preferences.map(p => [p.id, p.limit])),
          focusEndsAt: state.focus?.endsAt ?? 0,
          focusStartedAt: state.focus?.startedAt ?? 0,
          shortVideoBlocks,
        });
        active = true;
      } else {
        await device.stop();
      }
    } else {
      await device.stop();
    }

    const monitoringActive = Boolean(status.available && status.usageAuthorized);
    const shortVideoActive = Boolean(active && Object.values(shortVideoBlocks).some(Boolean));

    return {
      state,
      status: {
        ...status,
        active,
        monitoringActive,
        shortVideoActive,
        blockedToday: Number.isFinite(status.blockedToday) ? status.blockedToday : 0,
        blockedByTarget: status.blockedByTarget || { reels: 0, shorts: 0, tiktok: 0, others: 0 },
        usageError,
      },
    };
  }

  return {
    refresh: () => serial(synchronize),
    perform: (method, ...args) => serial(async () => {
      if (method === 'reset') await device.stop();
      await wellbeing[method](...args);
      return synchronize();
    }),
    enable: () => serial(async () => {
      const status = await device.getStatus();
      if (!status.available) throw new Error('Instale o APK Android para ativar o bloqueio automático.');
      if (!status.blockingAuthorized) {
        throw new Error('Ative o serviço de bloqueio em segundo plano nas configurações do Android primeiro.');
      }
      await wellbeing.setProtection(true);
      return synchronize();
    }),
    disable: () => serial(async () => {
      await device.stop();
      await wellbeing.setProtection(false);
      return synchronize();
    }),
    requestUsageAccess: () => device.requestUsageAccess(),
    requestBlockingAccess: () => device.requestBlockingAccess(),
    getInstalledApps: () => (device.getInstalledApps ? device.getInstalledApps() : Promise.resolve([])),
  };
}
