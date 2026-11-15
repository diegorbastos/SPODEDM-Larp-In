import native from '../../modules/larp-device-control';
import { DeviceControl } from '../domain/DeviceControl';

export class NativeDeviceControl extends DeviceControl {
  async getStatus() {
    if (!native) return { available: false, usageAuthorized: false, blockingAuthorized: false, reportOnly: false, selected: [] };
    return native.getStatus();
  }
  requireNative() {
    if (!native) throw new Error('Este recurso precisa do aplicativo instalado por APK ou build iOS. Não está disponível no Expo Go ou navegador.');
    return native;
  }
  async getUsage() { return this.requireNative().getUsage(); }
  async configure(rules) { return this.requireNative().configure(JSON.stringify(rules)); }
  async stop() { if (native) await native.stop(); }
  async requestUsageAccess() { return this.requireNative().requestUsageAccess(); }
  async requestBlockingAccess() { return this.requireNative().requestBlockingAccess(); }
  async selectApplications(id) { return this.requireNative().selectApplications(id); }
  async showReport(days) { return this.requireNative().showReport(days); }
}
