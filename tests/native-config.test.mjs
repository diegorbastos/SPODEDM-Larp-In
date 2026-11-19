import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('serviço Android bloqueia Reels/Shorts/TikTok/Afins sem botão flutuante nem QUERY_ALL_PACKAGES', () => {
  const xml = readFileSync('modules/larp-device-control/android/src/main/res/xml/larp_accessibility.xml', 'utf8');
  const manifest = readFileSync('modules/larp-device-control/android/src/main/AndroidManifest.xml', 'utf8');
  const service = readFileSync('modules/larp-device-control/android/src/main/java/com/larpin/devicecontrol/LarpAccessibilityService.kt', 'utf8');
  const moduleConfig = JSON.parse(readFileSync('modules/larp-device-control/expo-module.config.json', 'utf8'));

  assert.match(xml, /isAccessibilityTool="false"/);
  assert.match(xml, /flagReportViewIds/);
  assert.ok(!xml.includes('flagRequestAccessibilityButton'), 'Não deve solicitar botão flutuante de acessibilidade');
  assert.ok(!manifest.includes('QUERY_ALL_PACKAGES'));
  assert.match(manifest, /BIND_ACCESSIBILITY_SERVICE/);
  assert.deepEqual(moduleConfig.platforms, ['android']);

  // Confirma detecção de Reels, Shorts, TikTok, Kwai, Facebook Reels e Spotlight + saída em O(1) fora dos apps monitorados.
  assert.match(service, /clips_viewer_view_pager/);
  assert.match(service, /reel_watch_fragment_root/);
  assert.match(service, /tiktokPackages/);
  assert.match(service, /kwaiPackages/);
  assert.match(service, /MONITORED_PACKAGES/);
});

test('app.json está focado em Android e React Native Expo sem extensões iOS', () => {
  const appJson = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.equal(appJson.expo.android.package, 'com.diegorbastos.larpin');
  assert.equal(appJson.expo.ios, undefined);
  assert.ok(!appJson.expo.plugins.includes('./plugins/withLarpDeviceControl'));
});
