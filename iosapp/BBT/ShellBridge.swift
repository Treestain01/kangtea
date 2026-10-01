import Foundation
import UIKit
import WebKit

/// A message from the webapp. The schema lives in `packages/shared/src/shell.ts`; this is its Swift twin.
enum ShellMessage: Equatable {
    enum HapticStyle: String {
        case light, medium, success
    }

    case haptic(HapticStyle)
    case orderStatus(status: String, itemName: String, storeName: String, placedAt: Date, readyAt: Date)
    case orderEnded

    /// Parses the dictionary WebKit hands over for `postMessage({...})`. Nil for anything unknown.
    init?(body: Any) {
        guard let dictionary = body as? [String: Any], let type = dictionary["type"] as? String else {
            return nil
        }
        switch type {
        case "haptic":
            guard let raw = dictionary["style"] as? String, let style = HapticStyle(rawValue: raw) else {
                return nil
            }
            self = .haptic(style)
        case "orderStatus":
            guard
                let status = dictionary["status"] as? String,
                let itemName = dictionary["itemName"] as? String,
                let storeName = dictionary["storeName"] as? String,
                let placedAt = Self.date(dictionary["placedAt"]),
                let readyAt = Self.date(dictionary["readyAt"])
            else {
                return nil
            }
            self = .orderStatus(
                status: status, itemName: itemName, storeName: storeName, placedAt: placedAt, readyAt: readyAt
            )
        case "orderEnded":
            self = .orderEnded
        default:
            return nil
        }
    }

    private static func date(_ value: Any?) -> Date? {
        guard let string = value as? String else { return nil }
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: string) ?? ISO8601DateFormatter().date(from: string)
    }
}

/// Receives `window.webkit.messageHandlers.bbt.postMessage(...)` from the webapp and acts on it:
/// haptics through UIKit, the order's Live Activity through `OrderActivityController`.
/// The bridge is one way; the webapp never waits for a reply.
@MainActor
final class ShellBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "bbt"

    private let activities: OrderActivityController
    private let impact = UIImpactFeedbackGenerator(style: .light)
    private let notification = UINotificationFeedbackGenerator()

    init(activities: OrderActivityController = OrderActivityController()) {
        self.activities = activities
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.handlerName, let parsed = ShellMessage(body: message.body) else { return }
        handle(parsed)
    }

    func handle(_ message: ShellMessage) {
        switch message {
        case .haptic(.light):
            impact.impactOccurred(intensity: 0.6)
        case .haptic(.medium):
            impact.impactOccurred(intensity: 1.0)
        case .haptic(.success):
            notification.notificationOccurred(.success)
        case let .orderStatus(status, itemName, storeName, placedAt, readyAt):
            activities.update(
                attributes: OrderActivityAttributes(itemName: itemName, storeName: storeName, placedAt: placedAt),
                state: OrderActivityAttributes.ContentState(status: status, readyAt: readyAt)
            )
        case .orderEnded:
            activities.end()
        }
    }
}
