import ActivityKit
import Foundation

/// The Live Activity for an order in the kitchen. Compiled into the app and the widget extension,
/// so both sides agree on the shape. Mirrors the `orderStatus` message in `packages/shared/src/shell.ts`.
struct OrderActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// "received", "making" or "ready".
        var status: String
        /// When the kitchen expects the drink to be ready.
        var readyAt: Date
    }

    /// The first drink on the order, for example "Signature Fruit Tea".
    var itemName: String
    /// Where to collect it, for example "Calamvale Central".
    var storeName: String
    /// When the order was placed.
    var placedAt: Date
}

extension OrderActivityAttributes.ContentState {
    var isReady: Bool { status == "ready" }

    var title: String {
        switch status {
        case "received": return "Order received"
        case "making": return "Pouring your drink"
        case "ready": return "Ready to collect"
        default: return "Your Order"
        }
    }
}
