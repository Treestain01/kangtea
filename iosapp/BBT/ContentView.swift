import SwiftUI

/// Hosts the web content edge to edge. The webapp handles safe areas with CSS env() insets.
struct ContentView: View {
    let config: AppConfig
    @State private var model = WebViewModel()
    @State private var reloadToken = 0

    var body: some View {
        ZStack {
            WebView(
                url: config.webAppURL,
                userAgentSuffix: config.userAgentSuffix,
                model: model,
                reloadToken: reloadToken
            )
            .ignoresSafeArea()

            switch model.state {
            case .loading:
                ProgressView()
                    .controlSize(.large)
            case .loaded:
                EmptyView()
            case .failed(let message):
                OfflineView(message: message) {
                    reloadToken += 1
                }
                .ignoresSafeArea()
            }
        }
    }
}
