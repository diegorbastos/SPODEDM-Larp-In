import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

enum ControlStore {
  static let ids = ["instagram", "youtube", "tiktok"]
  static var defaults: UserDefaults {
    let group = Bundle.main.object(forInfoDictionaryKey: "LarpAppGroup") as? String ?? "group.com.diegorbastos.larpin"
    return UserDefaults(suiteName: group)!
  }
  static func selection(_ id: String) -> FamilyActivitySelection {
    guard let data = defaults.data(forKey: "selection.\(id)"),
      let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { return FamilyActivitySelection() }
    return value
  }
  static var tokens: Set<ApplicationToken> {
    ids.reduce(into: Set<ApplicationToken>()) { $0.formUnion(selection($1).applicationTokens) }
  }
  static func clear() {
    DeviceActivityCenter().stopMonitoring()
    ids.forEach { ManagedSettingsStore(named: .init("limit.\($0)")).clearAllSettings() }
    ManagedSettingsStore(named: .init("focus")).clearAllSettings()
    defaults.set(false, forKey: "enabled")
    defaults.removeObject(forKey: "dailySignature")
    defaults.removeObject(forKey: "focusEnd")
  }
  static func expireFocus() {
    if defaults.double(forKey: "focusEnd") <= Date().timeIntervalSince1970 {
      ManagedSettingsStore(named: .init("focus")).clearAllSettings()
    }
  }
}
