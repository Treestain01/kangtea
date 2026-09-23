import SwiftUI

/// Shown when the webapp cannot be reached. The shell has no bundled content, so this must exist.
struct OfflineView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Can't reach Kang Tea")
                .font(.title2.weight(.semibold))
            Text(message)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

/// Shown when Info.plist has no usable WEBAPP_URL. A misconfigured build should fail loudly.
struct ConfigurationErrorView: View {
    let error: Error

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text("Configuration error")
                .font(.title2.weight(.semibold))
            Text(error.localizedDescription)
                .font(.footnote)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}

#Preview("Offline") {
    OfflineView(message: "The Internet connection appears to be offline.") {}
}

#Preview("Configuration error") {
    ConfigurationErrorView(error: AppConfigError.missingWebAppURL)
}
