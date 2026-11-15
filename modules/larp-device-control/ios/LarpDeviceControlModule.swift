import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

public class LarpDeviceControlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LarpDeviceControl")
    AsyncFunction("getStatus") { () -> [String: Any] in
      ControlStore.expireFocus()
      let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
      return ["available": true, "platform": "ios", "usageAuthorized": authorized,
        "blockingAuthorized": authorized, "reportOnly": true,
        "selected": ControlStore.ids.filter { !ControlStore.selection($0).applicationTokens.isEmpty }]
    }
    AsyncFunction("requestUsageAccess") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("requestBlockingAccess") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
    }
    AsyncFunction("selectApplications") { (id: String, promise: Promise) in
      guard ControlStore.ids.contains(id), let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("ERR_PRESENT", "Não foi possível abrir a seleção."); return
      }
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        promise.reject("ERR_AUTH", "Autorize o Tempo de Uso primeiro."); return
      }
      let view = SelectionScreen(id: id, initial: ControlStore.selection(id), save: { selection in
        do {
          ControlStore.defaults.set(try JSONEncoder().encode(selection), forKey: "selection.\(id)")
          // Uma nova seleção exige confirmação explícita para reativar a proteção.
          ControlStore.clear()
          presenter.dismiss(animated: true)
          promise.resolve(true)
        } catch { promise.reject(error) }
      }, cancel: { presenter.dismiss(animated: true); promise.resolve(false) })
      let controller = UIHostingController(rootView: view)
      controller.isModalInPresentation = true
      presenter.present(controller, animated: true)
    }.runOnQueue(.main)
    AsyncFunction("showReport") { (days: Int) in
      guard let presenter = self.appContext?.utilities?.currentViewController() else { throw ControlError("Não foi possível abrir o relatório.") }
      guard AuthorizationCenter.shared.authorizationStatus == .approved, !ControlStore.tokens.isEmpty else {
        throw ControlError("Autorize o Tempo de Uso e selecione pelo menos um aplicativo.")
      }
      let view = UsageReportScreen(days: days == 7 ? 7 : 1, tokens: ControlStore.tokens,
        close: { presenter.dismiss(animated: true) })
      presenter.present(UIHostingController(rootView: view), animated: true)
    }.runOnQueue(.main)
    AsyncFunction("configure") { (json: String) in
      guard let data = json.data(using: .utf8), let rules = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw ControlError("Configuração inválida.") }
      if !(rules["enabled"] as? Bool ?? false) { ControlStore.clear(); return }
      guard AuthorizationCenter.shared.authorizationStatus == .approved, !ControlStore.tokens.isEmpty else {
        throw ControlError("Autorize o Tempo de Uso e selecione os aplicativos antes de ativar.")
      }
      guard let limits = rules["limits"] as? [String: Int], ControlStore.ids.allSatisfy({ (1...1440).contains(limits[$0] ?? 0) }) else { throw ControlError("Metas inválidas.") }
      let center = DeviceActivityCenter()
      let signature = ControlStore.ids.map { "\($0):\(limits[$0]!)" }.joined(separator: ";")
      do {
        if ControlStore.defaults.string(forKey: "dailySignature") != signature || !center.activities.contains(.init("daily")) {
          var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
          for id in ControlStore.ids {
            let tokens = ControlStore.selection(id).applicationTokens
            if !tokens.isEmpty {
              events[.init(id)] = DeviceActivityEvent(applications: tokens, threshold: DateComponents(minute: limits[id]!), includesPastActivity: true)
            }
          }
          center.stopMonitoring([.init("daily")])
          ControlStore.ids.forEach { ManagedSettingsStore(named: .init("limit.\($0)")).clearAllSettings() }
          ControlStore.defaults.set(true, forKey: "enabled")
          try center.startMonitoring(.init("daily"), during: DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0), intervalEnd: DateComponents(hour: 23, minute: 59, second: 59), repeats: true), events: events)
          ControlStore.defaults.set(signature, forKey: "dailySignature")
        }
        let end = (rules["focusEndsAt"] as? Double ?? 0) / 1000
        let start = (rules["focusStartedAt"] as? Double ?? 0) / 1000
        if end > Date().timeIntervalSince1970 {
          if ControlStore.defaults.double(forKey: "focusEnd") != end || !center.activities.contains(.init("focus")) {
            guard end - start >= 900 else { throw ControlError("No iPhone, o foco com bloqueio precisa durar pelo menos 15 minutos.") }
            center.stopMonitoring([.init("focus")])
            let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
            try center.startMonitoring(.init("focus"), during: DeviceActivitySchedule(
              intervalStart: Calendar.current.dateComponents(components, from: Date(timeIntervalSince1970: start)),
              intervalEnd: Calendar.current.dateComponents(components, from: Date(timeIntervalSince1970: end)), repeats: false))
            ControlStore.defaults.set(end, forKey: "focusEnd")
          }
          ManagedSettingsStore(named: .init("focus")).shield.applications = ControlStore.tokens
        } else {
          center.stopMonitoring([.init("focus")])
          ManagedSettingsStore(named: .init("focus")).clearAllSettings()
          ControlStore.defaults.removeObject(forKey: "focusEnd")
        }
        ControlStore.defaults.set(true, forKey: "enabled")
      } catch {
        ControlStore.clear()
        throw error
      }
    }
    AsyncFunction("stop") { ControlStore.clear() }
  }
}

struct ControlError: LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
}

private struct SelectionScreen: View {
  let id: String
  @State var selection: FamilyActivitySelection
  let save: (FamilyActivitySelection) -> Void
  let cancel: () -> Void
  @State private var error = ""
  init(id: String, initial: FamilyActivitySelection, save: @escaping (FamilyActivitySelection) -> Void, cancel: @escaping () -> Void) {
    self.id = id; _selection = State(initialValue: initial); self.save = save; self.cancel = cancel
  }
  var body: some View {
    NavigationStack {
      VStack {
        Text("Selecione somente o aplicativo correspondente a \(id). O iOS oculta sua identidade do Larp-In.").padding()
        FamilyActivityPicker(selection: $selection)
        if !error.isEmpty { Text(error).foregroundStyle(.red).padding() }
      }.navigationTitle("Selecionar aplicativo")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancelar", action: cancel) }
        ToolbarItem(placement: .confirmationAction) { Button("Salvar") {
          guard selection.applicationTokens.count == 1, selection.categoryTokens.isEmpty, selection.webDomainTokens.isEmpty else {
            error = "Selecione exatamente um aplicativo, sem categorias ou sites."; return
          }
          let duplicate = ControlStore.ids.filter { $0 != id }.contains { !ControlStore.selection($0).applicationTokens.isDisjoint(with: selection.applicationTokens) }
          guard !duplicate else { error = "Este aplicativo já está associado a outra rede."; return }
          save(selection)
        } }
      }
    }.preferredColorScheme(.dark)
  }
}

private struct UsageReportScreen: View {
  let days: Int
  let tokens: Set<ApplicationToken>
  let close: () -> Void
  var body: some View {
    let today = Calendar.current.startOfDay(for: Date())
    let start = Calendar.current.date(byAdding: .day, value: -(days - 1), to: today)!
    let filter = DeviceActivityFilter(segment: .daily(during: DateInterval(start: start, end: Date())),
      users: .all, devices: .init([.iPhone, .iPad]), applications: tokens)
    NavigationStack {
      VStack(alignment: .leading) {
        Text("Dados automáticos do Tempo de Uso. A atualização depende do iOS.").font(.caption).padding()
        DeviceActivityReport(.init("larp.usage"), filter: filter)
      }.navigationTitle(days == 7 ? "Últimos 7 dias" : "Uso de hoje")
      .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fechar", action: close) } }
    }.preferredColorScheme(.dark)
  }
}
