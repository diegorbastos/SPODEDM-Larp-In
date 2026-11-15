import DeviceActivity
import SwiftUI
import Foundation

@main
struct LarpReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene { UsageScene { UsageView(rows: $0) } }
}

struct UsageRow: Identifiable {
  var id: String { name }
  let name: String
  let seconds: TimeInterval
}

struct UsageScene: DeviceActivityReportScene {
  let context = DeviceActivityReport.Context("larp.usage")
  let content: ([UsageRow]) -> UsageView
  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> [UsageRow] {
    var totals: [String: TimeInterval] = [:]
    for await device in data {
      for await segment in device.activitySegments {
        for await category in segment.categories {
          for await app in category.applications {
            let name = app.application.localizedDisplayName ?? "Aplicativo selecionado"
            totals[name, default: 0] += app.totalActivityDuration
          }
        }
      }
    }
    // Os dados nunca saem desta extensão. Não gravar em App Groups ou enviar à rede.
    return totals.map { UsageRow(name: $0.key, seconds: $0.value) }.sorted { $0.seconds > $1.seconds }
  }
}

struct UsageView: View {
  let rows: [UsageRow]
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text("\(Int(rows.reduce(0) { $0 + $1.seconds } / 60)) min").font(.system(size: 48, weight: .bold))
        Text("Uso dos aplicativos selecionados no período").foregroundStyle(.secondary)
        if rows.isEmpty { Text("Sem dados disponíveis. Use os aplicativos selecionados e abra o relatório novamente. O iOS pode levar algum tempo para atualizar.") }
        ForEach(rows) { row in
          HStack { Text(row.name); Spacer(); Text("\(Int(row.seconds / 60)) min") }.padding().background(.white.opacity(0.07)).clipShape(RoundedRectangle(cornerRadius: 16))
        }
      }.padding().foregroundStyle(.white)
    }.background(Color(red: 0.03, green: 0.035, blue: 0.035))
  }
}
