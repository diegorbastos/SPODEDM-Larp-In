import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

final class Monitor: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    guard ControlStore.defaults.bool(forKey: "enabled") else { return }
    if activity.rawValue == "daily" {
      ControlStore.ids.forEach { ManagedSettingsStore(named: .init("limit.\($0)")).clearAllSettings() }
    }
    if activity.rawValue == "focus", ControlStore.defaults.double(forKey: "focusEnd") > Date().timeIntervalSince1970 {
      ManagedSettingsStore(named: .init("focus")).shield.applications = ControlStore.tokens
    }
  }
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    guard activity.rawValue == "daily", ControlStore.defaults.bool(forKey: "enabled"), ControlStore.ids.contains(event.rawValue) else { return }
    let tokens = ControlStore.selection(event.rawValue).applicationTokens
    if !tokens.isEmpty { ManagedSettingsStore(named: .init("limit.\(event.rawValue)")).shield.applications = tokens }
  }
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    if activity.rawValue == "focus", Date().timeIntervalSince1970 >= ControlStore.defaults.double(forKey: "focusEnd") {
      ManagedSettingsStore(named: .init("focus")).clearAllSettings()
    }
    if activity.rawValue == "daily" {
      ControlStore.ids.forEach { ManagedSettingsStore(named: .init("limit.\($0)")).clearAllSettings() }
    }
  }
}
