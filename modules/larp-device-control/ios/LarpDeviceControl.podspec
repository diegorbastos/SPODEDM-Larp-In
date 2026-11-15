Pod::Spec.new do |s|
  s.name = 'LarpDeviceControl'
  s.version = '1.0.0'
  s.summary = 'Controle local de uso e limites do Larp-In'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Larp-In'
  s.homepage = 'https://github.com/diegorbastos/SPODEDM-Larp-In'
  s.platforms = { :ios => '17.4' }
  s.source = { :git => 'https://github.com/diegorbastos/SPODEDM-Larp-In.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.{h,m,mm,swift}'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'DeviceActivity', 'SwiftUI'
  s.swift_version = '5.0'
end
