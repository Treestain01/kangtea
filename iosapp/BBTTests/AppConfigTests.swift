import XCTest
@testable import BBT

final class AppConfigTests: XCTestCase {
    func testParsesHTTPSURL() throws {
        let config = try AppConfig(rawURL: "https://bbt.example.com", appVersion: "1.2.3")
        XCTAssertEqual(config.webAppURL.absoluteString, "https://bbt.example.com")
    }

    func testParsesLocalHTTPURLWithPort() throws {
        let config = try AppConfig(rawURL: "http://localhost:5173", appVersion: "1.0.0")
        XCTAssertEqual(config.webAppURL.host, "localhost")
        XCTAssertEqual(config.webAppURL.port, 5173)
    }

    func testTrimsWhitespace() throws {
        let config = try AppConfig(rawURL: "  https://bbt.example.com\n", appVersion: "1.0.0")
        XCTAssertEqual(config.webAppURL.absoluteString, "https://bbt.example.com")
    }

    func testRejectsEmptyURL() {
        XCTAssertThrowsError(try AppConfig(rawURL: "", appVersion: "1.0.0")) { error in
            guard case AppConfigError.invalidWebAppURL = error else {
                return XCTFail("Expected invalidWebAppURL, got \(error)")
            }
        }
    }

    func testRejectsCommentMangledURL() {
        // What you get if an xcconfig writes https://host without the /$()/ trick.
        XCTAssertThrowsError(try AppConfig(rawURL: "https:", appVersion: "1.0.0"))
    }

    func testRejectsNonHTTPScheme() {
        XCTAssertThrowsError(try AppConfig(rawURL: "ftp://bbt.example.com", appVersion: "1.0.0"))
    }

    func testUserAgentSuffixUsesProductTokenAndVersion() throws {
        let config = try AppConfig(rawURL: "https://bbt.example.com", appVersion: "1.2.3")
        XCTAssertEqual(config.userAgentSuffix, "BBTiOS/1.2.3")
    }
}
