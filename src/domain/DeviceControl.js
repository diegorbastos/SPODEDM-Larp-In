/** Porta de acesso às capacidades nativas Android (uso, bloqueio de vídeos curtos e metas). */
export class DeviceControl {
  async getStatus() { throw new Error('Implemente getStatus.'); }
  async getUsage() { throw new Error('Implemente getUsage.'); }
  async configure(_rules) { throw new Error('Implemente configure.'); }
  async stop() { throw new Error('Implemente stop.'); }
  async requestUsageAccess() { throw new Error('Implemente requestUsageAccess.'); }
  async requestBlockingAccess() { throw new Error('Implemente requestBlockingAccess.'); }
  async getInstalledApps() { return []; }
}
