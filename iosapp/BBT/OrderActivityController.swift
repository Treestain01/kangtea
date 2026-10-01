import ActivityKit
import Foundation

/// Starts, updates and ends the one Live Activity for the order in the kitchen.
/// There is at most one active order at a time, so there is at most one activity.
@MainActor
final class OrderActivityController {
    private var current: Activity<OrderActivityAttributes>?

    /// Starts the activity on the first status and updates it on the rest. Silent when the person
    /// has turned Live Activities off for the app.
    func update(attributes: OrderActivityAttributes, state: OrderActivityAttributes.ContentState) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let content = ActivityContent(state: state, staleDate: state.readyAt.addingTimeInterval(30 * 60))
        if let current, current.attributes.placedAt == attributes.placedAt {
            Task { await current.update(content) }
            return
        }
        end()
        do {
            current = try Activity.request(attributes: attributes, content: content, pushType: nil)
        } catch {
            // Too many activities or a system refusal: the order still shows in the app.
            current = nil
        }
    }

    /// Ends the activity when the order is collected or cancelled. It lingers briefly on the lock screen.
    func end() {
        guard let activity = current else { return }
        current = nil
        Task {
            await activity.end(nil, dismissalPolicy: .after(.now + 60))
        }
    }
}
