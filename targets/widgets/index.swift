import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Shared storage (App Group)

let APP_GROUP = "group.com.carlosprnt.tucan"
let DATA_KEY = "widgetData"
let PENDING_KEY = "pendingToggles"

struct WidgetHabit: Codable, Identifiable {
  let id: String
  let name: String
  let icon: String
  var due: Bool
  var done: Bool
  let total: Int
  let days: Int
  let percent: Int
  let states: [Int] // 0 missed · 1 done · 2 today · 3 future/empty
}

struct WidgetData: Codable {
  let date: String
  var habits: [WidgetHabit]
  var doneCount: Int
  var dueCount: Int

  static let empty = WidgetData(date: "", habits: [], doneCount: 0, dueCount: 0)
}

func loadWidgetData() -> WidgetData {
  guard
    let defaults = UserDefaults(suiteName: APP_GROUP),
    let raw = defaults.string(forKey: DATA_KEY),
    let data = raw.data(using: .utf8),
    let decoded = try? JSONDecoder().decode(WidgetData.self, from: data)
  else { return .empty }
  return decoded
}

func habit(byId id: String?) -> WidgetHabit? {
  let data = loadWidgetData()
  if let id, let match = data.habits.first(where: { $0.id == id }) { return match }
  return data.habits.first
}

// MARK: - Mark a habit from the widget

struct ToggleHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Mark habit"

  @Parameter(title: "Habit ID") var habitId: String

  init() {}
  init(habitId: String) { self.habitId = habitId }

  func perform() async throws -> some IntentResult {
    guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return .result() }
    var data = loadWidgetData()
    if let idx = data.habits.firstIndex(where: { $0.id == habitId }) {
      let newDone = !data.habits[idx].done
      data.habits[idx].done = newDone
      if data.habits[idx].due { data.doneCount += newDone ? 1 : -1 }
      if let encoded = try? JSONEncoder().encode(data),
         let str = String(data: encoded, encoding: .utf8) {
        defaults.set(str, forKey: DATA_KEY)
      }
      var pending: [String: Bool] = [:]
      if let raw = defaults.string(forKey: PENDING_KEY),
         let d = raw.data(using: .utf8),
         let dict = try? JSONDecoder().decode([String: Bool].self, from: d) {
        pending = dict
      }
      pending[habitId] = newDone
      if let encoded = try? JSONEncoder().encode(pending),
         let str = String(data: encoded, encoding: .utf8) {
        defaults.set(str, forKey: PENDING_KEY)
      }
    }
    // Refresh every widget so the grid, the count and the progress all update.
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}

// MARK: - Habit picker (configurable widgets)

struct HabitEntity: AppEntity {
  let id: String
  let name: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
  static var defaultQuery = HabitQuery()

  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct HabitQuery: EntityQuery {
  func entities(for identifiers: [String]) async throws -> [HabitEntity] {
    loadWidgetData().habits
      .filter { identifiers.contains($0.id) }
      .map { HabitEntity(id: $0.id, name: $0.name) }
  }

  func suggestedEntities() async throws -> [HabitEntity] {
    loadWidgetData().habits.map { HabitEntity(id: $0.id, name: $0.name) }
  }

  func defaultResult() async -> HabitEntity? {
    loadWidgetData().habits.first.map { HabitEntity(id: $0.id, name: $0.name) }
  }
}

struct SelectHabitIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Select habit"
  static var description = IntentDescription("Choose which habit to show.")

  @Parameter(title: "Habit") var habit: HabitEntity?

  init() {}
}

// MARK: - Shapes & helpers

struct Diamond: Shape {
  func path(in rect: CGRect) -> Path {
    var p = Path()
    p.move(to: CGPoint(x: rect.midX, y: rect.minY))
    p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
    p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
    p.addLine(to: CGPoint(x: rect.minX, y: rect.midY))
    p.closeSubpath()
    return p
  }
}

func dotColor(_ state: Int) -> Color {
  switch state {
  case 1: return .primary // done
  case 0: return .primary.opacity(0.16) // missed
  case 2: return .primary.opacity(0.38) // today, unmarked
  default: return .primary.opacity(0.08)
  }
}

struct ToggleMark: View {
  var done: Bool
  var body: some View {
    ZStack {
      Circle().strokeBorder(Color.primary.opacity(0.25), lineWidth: 2)
      if done {
        Circle().fill(Color.primary)
        Image(systemName: "checkmark")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(Color(UIColor.systemBackground))
      }
    }
    .frame(width: 26, height: 26)
  }
}

// Uniform, fixed-size diamonds across every widget. Columns are chosen per
// widget to fill the width; `states` is already today-first (index 0 = today).
let DOT: CGFloat = 13
let DOT_SPACING: CGFloat = 5

struct DotGridView: View {
  var states: [Int]
  var columns: Int

  var body: some View {
    let rows = max(1, Int(ceil(Double(states.count) / Double(columns))))
    VStack(alignment: .leading, spacing: DOT_SPACING) {
      ForEach(0 ..< rows, id: \.self) { r in
        HStack(spacing: DOT_SPACING) {
          ForEach(0 ..< columns, id: \.self) { c in
            let i = r * columns + c
            if i < states.count {
              Diamond().fill(dotColor(states[i])).frame(width: DOT, height: DOT)
            } else {
              Color.clear.frame(width: DOT, height: DOT)
            }
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .topLeading)
  }
}

struct NoHabitView: View {
  var body: some View {
    Text("Open Tucan to set up").font(.footnote).foregroundStyle(.secondary)
  }
}

// MARK: - Views

// Renders a habit's icon — SF Symbol name or emoji.
struct HabitIcon: View {
  var icon: String
  var size: CGFloat = 20
  var body: some View {
    if icon.isEmpty {
      Image(systemName: "circle.fill").font(.system(size: size)).foregroundStyle(.primary)
    } else if icon.allSatisfy(\.isASCII) {
      Image(systemName: icon).font(.system(size: size)).foregroundStyle(.primary)
    } else {
      Text(icon).font(.system(size: size))
    }
  }
}

struct HabitGridView: View {
  @Environment(\.widgetFamily) var family
  var habit: WidgetHabit?

  var body: some View {
    if let h = habit {
      if family == .systemMedium {
        DashboardCardView(habit: h)
      } else {
        let recent = Array(h.states.prefix(7))
        let recentDone = recent.filter { $0 == 1 }.count
        VStack(alignment: .leading, spacing: 6) {
          HStack(alignment: .firstTextBaseline) {
            Text(h.name).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            Spacer()
            Text("\(recentDone)/\(recent.count)").font(.caption).fontWeight(.semibold).foregroundStyle(.secondary)
          }
          Text("\(h.percent)%").font(.system(size: 28, weight: .heavy)).monospacedDigit()
          DotGridView(states: Array(h.states.prefix(28)), columns: 7)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
      }
    } else {
      NoHabitView()
    }
  }
}

// Medium widget: a copy of the dashboard's habit card.
struct DashboardCardView: View {
  var habit: WidgetHabit
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 12) {
        HabitIcon(icon: habit.icon, size: 20)
          .frame(width: 40, height: 40)
          .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
        VStack(alignment: .leading, spacing: 1) {
          Text(habit.name).font(.headline).lineLimit(1)
          HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text("\(habit.total)").font(.subheadline).fontWeight(.heavy)
            Text("/ \(habit.days) days").font(.caption).foregroundStyle(.secondary)
          }
        }
        Spacer()
        Button(intent: ToggleHabitIntent(habitId: habit.id)) {
          ToggleMark(done: habit.done)
        }
        .buttonStyle(.plain)
      }
      DotGridView(states: Array(habit.states.prefix(64)), columns: 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .padding(.top, 6)
  }
}

struct HabitCardView: View {
  var habit: WidgetHabit?
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if let h = habit {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 2) {
            Text(h.name).font(.headline).lineLimit(1)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
              Text("\(h.total)").font(.title2).fontWeight(.heavy)
              Text("/ \(h.days) days").font(.subheadline).foregroundStyle(.secondary)
            }
          }
          Spacer()
          Button(intent: ToggleHabitIntent(habitId: h.id)) {
            ToggleMark(done: h.done)
          }
          .buttonStyle(.plain)
        }
        DotGridView(states: Array(h.states.prefix(96)), columns: 16)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        NoHabitView()
      }
    }
  }
}

struct HabitCompactView: View {
  var habit: WidgetHabit?
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let h = habit {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 1) {
            Text(h.name).font(.subheadline).fontWeight(.semibold).lineLimit(1)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
              Text("\(h.total)").font(.callout).fontWeight(.heavy)
              Text("days").font(.caption2).foregroundStyle(.secondary)
            }
          }
          Spacer()
          Button(intent: ToggleHabitIntent(habitId: h.id)) {
            ToggleMark(done: h.done)
          }
          .buttonStyle(.plain)
        }
        DotGridView(states: Array(h.states.prefix(35)), columns: 7)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        NoHabitView()
      }
    }
  }
}

struct ChecklistRow: View {
  var habit: WidgetHabit
  var body: some View {
    HStack(spacing: 8) {
      Button(intent: ToggleHabitIntent(habitId: habit.id)) {
        ToggleMark(done: habit.done)
      }
      .buttonStyle(.plain)
      Text(habit.name).font(.subheadline).lineLimit(1)
      Spacer(minLength: 0)
    }
  }
}

struct TodayHabitsView: View {
  @Environment(\.widgetFamily) var family
  var data: WidgetData

  var body: some View {
    let due = data.habits.filter(\.due)
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("Today").font(.caption).foregroundStyle(.secondary)
        Spacer()
        Text("\(data.doneCount)/\(data.dueCount)")
          .font(.caption).fontWeight(.semibold).foregroundStyle(.secondary)
      }
      if due.isEmpty {
        Spacer()
        Text("Nothing due today").font(.footnote).foregroundStyle(.secondary)
        Spacer()
      } else if family == .systemSmall {
        ForEach(due.prefix(4)) { ChecklistRow(habit: $0) }
        Spacer(minLength: 0)
      } else {
        HStack(alignment: .top, spacing: 16) {
          VStack(spacing: 8) {
            ForEach(due.prefix(4)) { ChecklistRow(habit: $0) }
          }
          VStack(spacing: 8) {
            ForEach(Array(due.dropFirst(4).prefix(4))) { ChecklistRow(habit: $0) }
          }
        }
        Spacer(minLength: 0)
      }
    }
    .padding(.top, 4)
  }
}

struct TodayProgressView: View {
  var data: WidgetData
  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text("Today").font(.caption).foregroundStyle(.secondary)
      Spacer()
      Text("\(data.doneCount)/\(data.dueCount)")
        .font(.system(size: 40, weight: .heavy))
        .monospacedDigit()
        .minimumScaleFactor(0.6)
        .lineLimit(1)
      Text("done").font(.caption).foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// MARK: - Timeline providers

struct HabitEntry: TimelineEntry {
  let date: Date
  let habit: WidgetHabit?
}

struct HabitProvider: AppIntentTimelineProvider {
  func placeholder(in _: Context) -> HabitEntry { HabitEntry(date: Date(), habit: habit(byId: nil)) }

  func snapshot(for configuration: SelectHabitIntent, in _: Context) async -> HabitEntry {
    HabitEntry(date: Date(), habit: habit(byId: configuration.habit?.id))
  }

  func timeline(for configuration: SelectHabitIntent, in _: Context) async -> Timeline<HabitEntry> {
    let entry = HabitEntry(date: Date(), habit: habit(byId: configuration.habit?.id))
    return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 30)))
  }
}

struct ProgressEntry: TimelineEntry {
  let date: Date
  let data: WidgetData
}

struct ProgressProvider: TimelineProvider {
  func placeholder(in _: Context) -> ProgressEntry { ProgressEntry(date: Date(), data: .empty) }
  func getSnapshot(in _: Context, completion: @escaping (ProgressEntry) -> Void) {
    completion(ProgressEntry(date: Date(), data: loadWidgetData()))
  }

  func getTimeline(in _: Context, completion: @escaping (Timeline<ProgressEntry>) -> Void) {
    let entry = ProgressEntry(date: Date(), data: loadWidgetData())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 30))))
  }
}

// MARK: - Container background

extension View {
  @ViewBuilder func widgetBackground() -> some View {
    containerBackground(for: .widget) { Color(UIColor.systemBackground) }
  }
}

// MARK: - Widgets

struct HabitGridWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "TucanHabitGrid", intent: SelectHabitIntent.self, provider: HabitProvider()) { entry in
      HabitGridView(habit: entry.habit).widgetBackground()
    }
    .configurationDisplayName("Habit grid")
    .description("A habit’s consistency and recent activity.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct HabitCardWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "TucanHabitCard", intent: SelectHabitIntent.self, provider: HabitProvider()) { entry in
      HabitCardView(habit: entry.habit).widgetBackground()
    }
    .configurationDisplayName("Habit")
    .description("A habit with its days, total and full grid.")
    .supportedFamilies([.systemLarge])
  }
}

struct HabitCompactWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "TucanHabitCompact", intent: SelectHabitIntent.self, provider: HabitProvider()) { entry in
      HabitCompactView(habit: entry.habit).widgetBackground()
    }
    .configurationDisplayName("Habit · compact")
    .description("A habit’s total, recent grid and a check button.")
    .supportedFamilies([.systemSmall])
  }
}

struct TodayHabitsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TucanTodayHabits", provider: ProgressProvider()) { entry in
      TodayHabitsView(data: entry.data).widgetBackground()
    }
    .configurationDisplayName("Today’s habits")
    .description("Check off today’s habits.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct TodayProgressWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TucanTodayProgress", provider: ProgressProvider()) { entry in
      TodayProgressView(data: entry.data).widgetBackground()
    }
    .configurationDisplayName("Today’s progress")
    .description("How many habits you’ve done today.")
    .supportedFamilies([.systemSmall])
  }
}

@main
struct TucanWidgets: WidgetBundle {
  var body: some Widget {
    TodayHabitsWidget()
    HabitCardWidget()
    HabitCompactWidget()
    HabitGridWidget()
    TodayProgressWidget()
  }
}
