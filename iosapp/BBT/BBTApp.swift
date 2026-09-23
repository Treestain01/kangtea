import SwiftUI

@main
struct BBTApp: App {
    private let configResult = Result { try AppConfig.load() }

    var body: some Scene {
        WindowGroup {
            switch configResult {
            case .success(let config):
                ContentView(config: config)
            case .failure(let error):
                ConfigurationErrorView(error: error)
            }
        }
    }
}
