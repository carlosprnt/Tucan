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
  var done: Bool
  let total: Int
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

// MARK: - Interactivity (mark a habit from the widget)

@available(iOS 17.0, *)
struct ToggleHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Mark habit"

  @Parameter(title: "Habit ID") var habitId: String

  init() {}
  init(habitId: String) { self.habitId = habitId }

  func perform() async throws -> some IntentResult {
    guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return .result() }

    // Optimistically flip the displayed data so the widget updates instantly.
    var data = loadWidgetData()
    if let idx = data.habits.firstIndex(where: { $0.id == habitId }) {
      let newDone = !data.habits[idx].done
      data.habits[idx].done = newDone
      data.doneCount += newDone ? 1 : -1
      if let encoded = try? JSONEncoder().encode(data),
         let str = String(data: encoded, encoding: .utf8) {
        defaults.set(str, forKey: DATA_KEY)
      }

      // Queue the desired state for the app to reconcile (and sync to Supabase).
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
    return .result()
  }
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
  case 1: return .primary
  case 0: return .primary.opacity(0.16)
  default: return .primary.opacity(0.08)
  }
}

// MARK: - Pieces

struct ToggleMark: View {
  var done: Bool
  var body: some View {
    ZStack {
      Circle().strokeBorder(Color.primary.opacity(0.25), lineWidth: 2)
      if done {
        Circle().fill(Color.primary)
        Image(systemName: "checkmark")
          .font(.system(size: 11, weight: .bold))
          .foregroundStyle(Color(UIColor.systemBackground))
      }
    }
    .frame(width: 22, height: 22)
  }
}

struct DotGridView: View {
  var states: [Int]
  var columns: Int = 7
  var dot: CGFloat = 10
  var body: some View {
    let rows = max(1, Int(ceil(Double(states.count) / Double(columns))))
    VStack(spacing: 4) {
      ForEach(0 ..< rows, id: \.self) { r in
        HStack(spacing: 4) {
          ForEach(0 ..< columns, id: \.self) { c in
            let i = r * columns + c
            if i < states.count {
              Diamond().fill(dotColor(states[i])).frame(width: dot, height: dot)
            } else {
              Color.clear.frame(width: dot, height: dot)
            }
          }
        }
      }
    }
  }
}

// MARK: - Views

struct TodayHabitsView: View {
  var data: WidgetData
  var family: WidgetFamily
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("Today").font(.caption).foregroundStyle(.secondary)
        Spacer()
        Text("\(data.doneCount)/\(data.dueCount)").font(.caption).bold().foregroundStyle(.secondary)
      }
      if data.habits.isEmpty {
        Spacer()
        Text("Nothing due today").font(.footnote).foregroundStyle(.secondary)
        Spacer()
      } else {
        let limit = family == .systemSmall ? 3 : 5
        ForEach(data.habits.prefix(limit)) { habit in
          HStack(spacing: 10) {
            if #available(iOS 17.0, *) {
              Button(intent: ToggleHabitIntent(habitId: habit.id)) {
                ToggleMark(done: habit.done)
              }
              .buttonStyle(.plain)
            } else {
              ToggleMark(done: habit.done)
            }
            Text(habit.name).font(.subheadline).lineLimit(1)
            Spacer()
          }
        }
        Spacer(minLength: 0)
      }
    }
  }
}

struct HabitGridView: View {
  var data: WidgetData
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let h = data.habits.first {
        Text(h.name).font(.caption).foregroundStyle(.secondary).lineLimit(1)
        Text("\(h.percent)%").font(.system(size: 30, weight: .heavy)).monospacedDigit()
        DotGridView(states: h.states, columns: 6)
        Spacer(minLength: 0)
      } else {
        Text("No habits yet").font(.footnote).foregroundStyle(.secondary)
      }
    }
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

// MARK: - Timeline

struct SimpleEntry: TimelineEntry {
  let date: Date
  let data: WidgetData
}

struct Provider: TimelineProvider {
  func placeholder(in _: Context) -> SimpleEntry { SimpleEntry(date: Date(), data: .empty) }
  func getSnapshot(in _: Context, completion: @escaping (SimpleEntry) -> Void) {
    completion(SimpleEntry(date: Date(), data: loadWidgetData()))
  }

  func getTimeline(in _: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
    let entry = SimpleEntry(date: Date(), data: loadWidgetData())
    completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 30))))
  }
}

// MARK: - Container background (iOS 17 requires it)

extension View {
  @ViewBuilder func widgetBackground() -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { Color(UIColor.systemBackground) }
    } else {
      padding().background(Color(UIColor.systemBackground))
    }
  }
}

// MARK: - Widgets

struct TodayHabitsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TucanTodayHabits", provider: Provider()) { entry in
      WidgetFamilyReader { family in
        TodayHabitsView(data: entry.data, family: family).widgetBackground()
      }
    }
    .configurationDisplayName("Today's habits")
    .description("Check off your habits for today.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct HabitGridWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TucanHabitGrid", provider: Provider()) { entry in
      HabitGridView(data: entry.data).widgetBackground()
    }
    .configurationDisplayName("Habit grid")
    .description("A habit’s recent activity.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct TodayProgressWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TucanTodayProgress", provider: Provider()) { entry in
      TodayProgressView(data: entry.data).widgetBackground()
    }
    .configurationDisplayName("Today’s progress")
    .description("How many habits you’ve done today.")
    .supportedFamilies([.systemSmall])
  }
}

// Reads the current widget family inside the content closure.
struct WidgetFamilyReader<Content: View>: View {
  @Environment(\.widgetFamily) var family
  let content: (WidgetFamily) -> Content
  var body: some View { content(family) }
}

@main
struct TucanWidgets: WidgetBundle {
  var body: some Widget {
    TodayHabitsWidget()
    HabitGridWidget()
    TodayProgressWidget()
  }
}
