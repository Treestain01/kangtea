import SwiftUI
import WebKit

/// Wraps WKWebView for SwiftUI. Owns everything WebKit specific.
struct WebView: UIViewRepresentable {
    let url: URL
    let userAgentSuffix: String
    let model: WebViewModel
    /// Increment to force a reload (used by the retry button).
    let reloadToken: Int

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        // Preserve WebKit's default "Mobile/<build>" token and append ours.
        let defaultApplicationName = configuration.applicationNameForUserAgent ?? ""
        configuration.applicationNameForUserAgent = [defaultApplicationName, userAgentSuffix]
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        // The one way bridge from the webapp (ADR 0021): haptics and the order's Live Activity.
        configuration.userContentController.add(context.coordinator.bridge, name: ShellBridge.handlerName)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.load(URLRequest(url: url))
        context.coordinator.lastReloadToken = reloadToken
        return webView
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: ShellBridge.handlerName)
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.lastReloadToken != reloadToken else { return }
        context.coordinator.lastReloadToken = reloadToken
        webView.load(URLRequest(url: url))
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        let model: WebViewModel
        let bridge = ShellBridge()
        var lastReloadToken = 0

        init(model: WebViewModel) {
            self.model = model
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.didStartLoading()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.didFinishLoading()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            model.didFail(error)
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            model.didFail(error)
        }
    }
}
