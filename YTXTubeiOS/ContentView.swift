import SwiftUI
import WebKit

// Màn hình duy nhất: WKWebView chạy web client đóng gói trong app.
// Toàn bộ giao diện (tìm kiếm, feed, trình phát, bình luận) nằm trong
// thư mục Web/ — Swift chỉ lo phát inline, PiP, chạy nền và mở link ngoài.

struct ContentView: View {
    @State private var isLoading = true
    @State private var loadError: String?

    var body: some View {
        ZStack {
            WebView(isLoading: $isLoading, loadError: $loadError)
                .ignoresSafeArea()

            if isLoading {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Đang tải YTXTube…")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            if let error = loadError {
                VStack(spacing: 12) {
                    Text("⚠️")
                        .font(.largeTitle)
                    Text("Không tải được trang")
                        .font(.headline)
                    Text(error)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    Button("Thử lại") {
                        loadError = nil
                        isLoading = true
                        NotificationCenter.default.post(name: .reloadWebView, object: nil)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
                .padding()
            }
        }
    }
}

extension Notification.Name {
    static let reloadWebView = Notification.Name("YTXTubeReloadWebView")
}

struct WebView: UIViewRepresentable {
    @Binding var isLoading: Bool
    @Binding var loadError: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, loadError: $loadError)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // BẮT BUỘC trên iOS: phát video ngay trong trang, không nhảy fullscreen.
        config.allowsInlineMediaPlayback = true
        // Cho phép Picture-in-Picture (vuốt về Home vẫn xem tiếp).
        config.allowsPictureInPictureMediaPlayback = true
        // Tự phát khi bấm Play trong trang, không cần chạm thêm lần nữa.
        config.mediaTypesRequiringUserActionForPlayback = []
        // Trang web dùng JavaScript (IFrame API của YouTube).
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        loadBundledPage(into: webView)
        context.coordinator.webView = webView

        NotificationCenter.default.addObserver(
            forName: .reloadWebView, object: nil, queue: .main
        ) { _ in loadBundledPage(into: webView) }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    private func loadBundledPage(into webView: WKWebView) {
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") else {
            loadError = "Không tìm thấy file Web/index.html trong app."
            isLoading = false
            return
        }
        // Cho phép trang đọc cả thư mục Web/ (app.js, style.css).
        let folder = url.deletingLastPathComponent()
        webView.loadFileURL(url, allowingReadAccessTo: folder)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        @Binding var isLoading: Bool
        @Binding var loadError: String?
        weak var webView: WKWebView?

        init(isLoading: Binding<Bool>, loadError: Binding<String?>) {
            _isLoading = isLoading
            _loadError = loadError
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
            loadError = error.localizedDescription
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading = false
            loadError = error.localizedDescription
        }

        // Link ngoài (http/https) mở bằng Safari, không mở trong app.
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.isFileURL || url.host == nil {
                decisionHandler(.allow) // file Web/ nội bộ + youtube-nocookie iframe
                return
            }
            // Piped API + iframe YouTube được tải ngầm, không phải điều hướng:
            // chỉ chặn điều hướng trang chính ra ngoài.
            if navigationAction.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
