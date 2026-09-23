import Foundation
import Observation

/// Loading state of the web content. Owned by ContentView, driven by WebView's navigation delegate.
@Observable
@MainActor
final class WebViewModel {
    enum State: Equatable {
        case loading
        case loaded
        case failed(message: String)
    }

    private(set) var state: State = .loading

    func didStartLoading() {
        state = .loading
    }

    func didFinishLoading() {
        state = .loaded
    }

    func didFail(_ error: Error) {
        state = .failed(message: error.localizedDescription)
    }
}
