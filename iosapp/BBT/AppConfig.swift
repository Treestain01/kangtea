import Foundation

/// Runtime configuration for the shell. The only place that reads Info.plist.
struct AppConfig: Equatable {
    /// Product token the shell appends to the WKWebView user agent. The webapp checks for it.
    static let userAgentProduct = "BBTiOS"

    let webAppURL: URL
    let appVersion: String

    /// For example "BBTiOS/1.0.0". Appended to the default WebKit user agent.
    var userAgentSuffix: String {
        "\(Self.userAgentProduct)/\(appVersion)"
    }

    init(rawURL: String, appVersion: String) throws {
        let trimmed = rawURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            let url = URL(string: trimmed),
            let scheme = url.scheme?.lowercased(),
            ["http", "https"].contains(scheme),
            url.host != nil
        else {
            throw AppConfigError.invalidWebAppURL(trimmed)
        }
        self.webAppURL = url
        self.appVersion = appVersion
    }

    /// Reads WEBAPP_URL and CFBundleShortVersionString from the bundle's Info.plist.
    static func load(from bundle: Bundle = .main) throws -> AppConfig {
        guard let rawURL = bundle.object(forInfoDictionaryKey: "WEBAPP_URL") as? String else {
            throw AppConfigError.missingWebAppURL
        }
        let version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        return try AppConfig(rawURL: rawURL, appVersion: version)
    }
}

enum AppConfigError: Error, LocalizedError, Equatable {
    case missingWebAppURL
    case invalidWebAppURL(String)

    var errorDescription: String? {
        switch self {
        case .missingWebAppURL:
            return "WEBAPP_URL is missing from Info.plist. Check Config/*.xcconfig."
        case .invalidWebAppURL(let value):
            return "WEBAPP_URL is not a valid http(s) URL: \"\(value)\". In xcconfig write https:/$()/host, because // starts a comment."
        }
    }
}
