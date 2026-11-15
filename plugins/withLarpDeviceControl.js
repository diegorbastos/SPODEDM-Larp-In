const { withInfoPlist, withEntitlementsPlist, withXcodeProject } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist');

const extensions = [
  { name: 'LarpMonitor', source: 'Monitor.swift', point: 'com.apple.deviceactivity.monitor-extension', principal: '$(PRODUCT_MODULE_NAME).Monitor' },
  { name: 'LarpReport', source: 'Report.swift', point: 'com.apple.deviceactivityui.report-extension' },
];

function addTargets(project, root, iosRoot, bundle, group, team, version = '1.1.0', buildNumber = '2') {
  for (const extension of extensions) {
    const name = extension.name;
    const destination = path.join(iosRoot, name);
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(path.join(root, 'native', 'ios', name, extension.source), path.join(destination, extension.source));
    const sources = [`${name}/${extension.source}`];
    if (name === 'LarpMonitor') {
      fs.copyFileSync(path.join(root, 'modules/larp-device-control/ios/ControlStore.swift'), path.join(destination, 'ControlStore.swift'));
      sources.push(`${name}/ControlStore.swift`);
    }
    fs.writeFileSync(path.join(destination, 'Info.plist'), plist.default.build({
      CFBundleDisplayName: name, CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleExecutable: '$(EXECUTABLE_NAME)', CFBundleName: '$(PRODUCT_NAME)', CFBundlePackageType: 'XPC!',
      CFBundleShortVersionString: '$(MARKETING_VERSION)', CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
      LarpAppGroup: group,
      NSExtension: { NSExtensionPointIdentifier: extension.point, ...(extension.principal ? { NSExtensionPrincipalClass: extension.principal } : {}) },
    }));
    fs.writeFileSync(path.join(destination, `${name}.entitlements`), plist.default.build({
      'com.apple.developer.family-controls': true, 'com.apple.security.application-groups': [group],
    }));
    const existing = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) =>
      !key.endsWith('_comment') && String(value.name).replaceAll('"', '') === name);
    if (existing) continue;
    const target = project.addTarget(name, 'app_extension', name, `${bundle}.${name}`);
    project.addBuildPhase(sources, 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
    for (const [key, ref] of Object.entries(project.pbxFileReferenceSection())) {
      if (!key.endsWith('_comment') && sources.includes(String(ref.path).replaceAll('"', ''))) ref.sourceTree = 'SOURCE_ROOT';
    }
    const list = project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
    for (const item of list.buildConfigurations) {
      const settings = project.pbxXCBuildConfigurationSection()[item.value].buildSettings;
      Object.assign(settings, {
        INFOPLIST_FILE: `"${name}/Info.plist"`, CODE_SIGN_ENTITLEMENTS: `"${name}/${name}.entitlements"`,
        IPHONEOS_DEPLOYMENT_TARGET: '17.4', SWIFT_VERSION: '5.0', TARGETED_DEVICE_FAMILY: '"1,2"',
        GENERATE_INFOPLIST_FILE: 'NO', APPLICATION_EXTENSION_API_ONLY: 'YES',
        MARKETING_VERSION: version, CURRENT_PROJECT_VERSION: buildNumber, CODE_SIGN_STYLE: 'Automatic',
        ...(team ? { DEVELOPMENT_TEAM: team } : {}),
      });
    }
  }
  return project;
}

module.exports = function withLarpDeviceControl(config) {
  const bundle = config.ios.bundleIdentifier;
  const group = `group.${bundle}`;
  config = withInfoPlist(config, mod => { mod.modResults.LarpAppGroup = group; return mod; });
  config = withEntitlementsPlist(config, mod => {
    mod.modResults['com.apple.developer.family-controls'] = true;
    mod.modResults['com.apple.security.application-groups'] = [...new Set([...(mod.modResults['com.apple.security.application-groups'] || []), group])];
    return mod;
  });
  config.extra = { ...config.extra, eas: { ...config.extra?.eas, build: { ...config.extra?.eas?.build,
    experimental: { ...config.extra?.eas?.build?.experimental, ios: {
      ...config.extra?.eas?.build?.experimental?.ios,
      appExtensions: extensions.map(e => ({ targetName: e.name, bundleIdentifier: `${bundle}.${e.name}`,
        entitlements: { 'com.apple.developer.family-controls': true, 'com.apple.security.application-groups': [group] } })),
    } },
  } } };
  return withXcodeProject(config, mod => {
    mod.modResults = addTargets(mod.modResults, mod.modRequest.projectRoot, mod.modRequest.platformProjectRoot, bundle, group, config.ios.appleTeamId, config.version, config.ios.buildNumber);
    return mod;
  });
};
module.exports.addTargets = addTargets;
