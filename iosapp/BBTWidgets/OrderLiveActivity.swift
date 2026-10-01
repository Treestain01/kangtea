import ActivityKit
import SwiftUI
import WidgetKit

/// The order in the kitchen on the lock screen and in the Dynamic Island: a cup that fills toward
/// ready, the drink and store, and the time left. Mirrors the kitchen cup in the webapp's order panel.
struct OrderLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrderActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color("AccentColor"))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    CupGlyph(progress: progress(for: context))
                        .frame(width: 44, height: 44)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.title).font(.headline)
                        Text(context.attributes.itemName).font(.caption).foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Countdown(state: context.state)
                        .font(.title3.weight(.bold).monospacedDigit())
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: progress(for: context))
                        .tint(.white)
                }
            } compactLeading: {
                CupGlyph(progress: progress(for: context))
                    .frame(width: 20, height: 20)
            } compactTrailing: {
                Countdown(state: context.state)
                    .font(.caption.weight(.bold).monospacedDigit())
                    .frame(minWidth: 40)
            } minimal: {
                CupGlyph(progress: progress(for: context))
                    .frame(width: 18, height: 18)
            }
        }
    }

    /// How far the kitchen has got, from placed to ready, for the cup and the bar.
    private func progress(for context: ActivityViewContext<OrderActivityAttributes>) -> Double {
        if context.state.isReady { return 1 }
        let total = context.state.readyAt.timeIntervalSince(context.attributes.placedAt)
        guard total > 0 else { return 0 }
        let elapsed = Date().timeIntervalSince(context.attributes.placedAt)
        return min(1, max(0, elapsed / total))
    }
}

/// The lock screen card: cup on the left, words in the middle, time on the right, bar underneath.
private struct LockScreenView: View {
    let context: ActivityViewContext<OrderActivityAttributes>

    var body: some View {
        HStack(spacing: 14) {
            CupGlyph(progress: fill)
                .frame(width: 52, height: 64)
            VStack(alignment: .leading, spacing: 3) {
                Text("KANG TEA")
                    .font(.caption2.weight(.semibold))
                    .tracking(1.5)
                    .opacity(0.8)
                Text(context.state.title)
                    .font(.headline)
                Text("\(context.attributes.itemName) · \(context.attributes.storeName)")
                    .font(.caption)
                    .opacity(0.85)
                    .lineLimit(1)
                ProgressView(value: fill)
                    .tint(.white)
                    .padding(.top, 4)
            }
            Spacer(minLength: 0)
            Countdown(state: context.state)
                .font(.title2.weight(.bold).monospacedDigit())
        }
        .foregroundStyle(.white)
        .padding(16)
    }

    private var fill: Double {
        if context.state.isReady { return 1 }
        let total = context.state.readyAt.timeIntervalSince(context.attributes.placedAt)
        guard total > 0 else { return 0 }
        return min(1, max(0, Date().timeIntervalSince(context.attributes.placedAt) / total))
    }
}

/// The time left, counting down live, or "Ready".
private struct Countdown: View {
    let state: OrderActivityAttributes.ContentState

    var body: some View {
        if state.isReady || state.readyAt <= Date() {
            Text("Ready")
        } else {
            Text(timerInterval: Date()...state.readyAt, countsDown: true)
                .multilineTextAlignment(.trailing)
        }
    }
}

/// A simple cup that fills with tea as the order moves along. Drawn in SwiftUI so it needs no asset.
private struct CupGlyph: View {
    /// 0 is empty, 1 is full with the lid on.
    let progress: Double

    var body: some View {
        GeometryReader { geometry in
            let w = geometry.size.width
            let h = geometry.size.height
            let inset = w * 0.12
            ZStack(alignment: .bottom) {
                CupShape()
                    .fill(.white.opacity(0.18))
                CupShape()
                    .fill(Color(red: 0.69, green: 0.48, blue: 0.27))
                    .mask(alignment: .bottom) {
                        Rectangle().frame(height: h * (0.15 + 0.75 * progress))
                    }
                CupShape()
                    .stroke(.white, lineWidth: max(1.5, w * 0.06))
                if progress >= 1 {
                    Capsule()
                        .fill(.white)
                        .frame(width: w - inset * 0.5, height: max(3, h * 0.08))
                        .offset(y: -h + h * 0.04)
                }
            }
        }
        .aspectRatio(0.62, contentMode: .fit)
    }
}

/// The tapered cup outline, wider at the top.
private struct CupShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let taper = rect.width * 0.1
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX - taper, y: rect.maxY - rect.height * 0.06))
        path.addQuadCurve(
            to: CGPoint(x: rect.maxX - taper - rect.height * 0.06, y: rect.maxY),
            control: CGPoint(x: rect.maxX - taper, y: rect.maxY)
        )
        path.addLine(to: CGPoint(x: rect.minX + taper + rect.height * 0.06, y: rect.maxY))
        path.addQuadCurve(
            to: CGPoint(x: rect.minX + taper, y: rect.maxY - rect.height * 0.06),
            control: CGPoint(x: rect.minX + taper, y: rect.maxY)
        )
        path.closeSubpath()
        return path
    }
}
