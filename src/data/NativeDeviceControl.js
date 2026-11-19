import native from '../../modules/larp-device-control';
import { DeviceControl } from '../domain/DeviceControl';

export class NativeDeviceControl extends DeviceControl {
  async getStatus() {
    if (!native) {
      return {
        available: false,
        platform: 'expo-go',
        usageAuthorized: false,
        blockingAuthorized: false,
        selected: [],
        blockedToday: 0,
        blockedByTarget: { reels: 0, shorts: 0, tiktok: 0, others: 0 },
      };
    }
    return native.getStatus();
  }
  requireNative() {
    if (!native) {
      throw new Error('Este recurso precisa do APK Android instalado. No Expo Go ou navegador o app roda em modo manual.');
    }
    return native;
  }
  async getUsage() { return this.requireNative().getUsage(); }
  async configure(rules) { return this.requireNative().configure(JSON.stringify(rules)); }
  async stop() { if (native) await native.stop(); }
  async requestUsageAccess() { return this.requireNative().requestUsageAccess(); }
  async requestBlockingAccess() { return this.requireNative().requestBlockingAccess(); }
  async getInstalledApps() {
    if (!native || typeof native.getInstalledApps !== 'function') return [];
    return native.getInstalledApps();
  }
}
