import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const require = createRequire(import.meta.url);
const xcode = require('xcode');
const plist = require('@expo/plist').default;
const { addTargets } = require('../plugins/withLarpDeviceControl.js');

test('plugin gera e incorpora monitor/relatório iOS de forma idempotente', () => {
  mkdirSync('tmp', { recursive: true });
  const dir = mkdtempSync(resolve('tmp/ios-config-'));
  const project = xcode.project(resolve('node_modules/react-native-safe-area-context/ios/RNSafeAreaContext.xcodeproj/project.pbxproj'));
  project.parseSync();
  addTargets(project, process.cwd(), dir, 'com.diegorbastos.larpin', 'group.com.diegorbastos.larpin');
  addTargets(project, process.cwd(), dir, 'com.diegorbastos.larpin', 'group.com.diegorbastos.larpin');
  for (const name of ['LarpMonitor', 'LarpReport']) {
    const targets = Object.entries(project.pbxNativeTargetSection()).filter(([k, v]) => !k.endsWith('_comment') && v.name === `"${name}"`);
    assert.equal(targets.length, 1);
    assert.equal(targets[0][1].buildPhases.length, 3);
    const info = plist.parse(readFileSync(join(dir, name, 'Info.plist'), 'utf8'));
    assert.ok(info.NSExtension.NSExtensionPointIdentifier.includes('deviceactivity'));
    const entitlements = plist.parse(readFileSync(join(dir, name, `${name}.entitlements`), 'utf8'));
    assert.equal(entitlements['com.apple.developer.family-controls'], true);
    assert.deepEqual(entitlements['com.apple.security.application-groups'], ['group.com.diegorbastos.larpin']);
  }
  assert.ok(project.writeSync().includes('Monitor.swift in Sources'));
  assert.ok(project.writeSync().includes('Report.swift in Sources'));
  const copyPhases = Object.entries(project.hash.project.objects.PBXCopyFilesBuildPhase).filter(([k]) => !k.endsWith('_comment'));
  assert.equal(copyPhases.reduce((count, [, v]) => count + v.files.length, 0), 2);
});
test('serviço Android não solicita conteúdo de janela nem identificação irrestrita de apps', () => {
  const xml = readFileSync('modules/larp-device-control/android/src/main/res/xml/larp_accessibility.xml', 'utf8');
  const manifest = readFileSync('modules/larp-device-control/android/src/main/AndroidManifest.xml', 'utf8');
  assert.match(xml, /canRetrieveWindowContent="false"/);
  assert.match(xml, /isAccessibilityTool="false"/);
  assert.ok(!manifest.includes('QUERY_ALL_PACKAGES'));
  assert.match(manifest, /BIND_ACCESSIBILITY_SERVICE/);
});
