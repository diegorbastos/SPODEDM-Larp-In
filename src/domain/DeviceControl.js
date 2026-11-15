/** Porta de acesso às capacidades nativas. Não pressupõe paridade Android/iOS. */
export class DeviceControl {
  async getStatus() { throw new Error('Implemente getStatus.'); }
  async getUsage() { throw new Error('Implemente getUsage.'); }
  async configure(_rules) { throw new Error('Implemente configure.'); }
  async stop() { throw new Error('Implemente stop.'); }
  async requestUsageAccess() { throw new Error('Implemente requestUsageAccess.'); }
  async requestBlockingAccess() { throw new Error('Implemente requestBlockingAccess.'); }
  async selectApplications(_id) { throw new Error('Implemente selectApplications no iOS.'); }
  async showReport(_days) { throw new Error('Implemente showReport no iOS.'); }
}
