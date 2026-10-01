import XCTest
@testable import BBT

final class ShellBridgeTests: XCTestCase {
    func testParsesHaptics() {
        XCTAssertEqual(ShellMessage(body: ["type": "haptic", "style": "light"]), .haptic(.light))
        XCTAssertEqual(ShellMessage(body: ["type": "haptic", "style": "success"]), .haptic(.success))
        XCTAssertNil(ShellMessage(body: ["type": "haptic", "style": "heavy"]))
    }

    func testParsesOrderStatus() throws {
        let message = ShellMessage(body: [
            "type": "orderStatus",
            "status": "making",
            "itemName": "Signature Fruit Tea",
            "storeName": "Calamvale Central",
            "placedAt": "2026-10-02T01:00:00.000Z",
            "readyAt": "2026-10-02T01:01:00.000Z",
        ])
        guard case let .orderStatus(status, itemName, storeName, placedAt, readyAt)? = message else {
            return XCTFail("expected an order status")
        }
        XCTAssertEqual(status, "making")
        XCTAssertEqual(itemName, "Signature Fruit Tea")
        XCTAssertEqual(storeName, "Calamvale Central")
        XCTAssertEqual(readyAt.timeIntervalSince(placedAt), 60, accuracy: 0.001)
    }

    func testParsesOrderEndedAndRejectsTheRest() {
        XCTAssertEqual(ShellMessage(body: ["type": "orderEnded"]), .orderEnded)
        XCTAssertNil(ShellMessage(body: ["type": "vibrate"]))
        XCTAssertNil(ShellMessage(body: "not a dictionary"))
        XCTAssertNil(ShellMessage(body: ["type": "orderStatus", "status": "ready"]))
    }
}
