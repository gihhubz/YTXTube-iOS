import SwiftUI
import AVFoundation

@main
struct YTXTubeiOSApp: App {
    init() {
        // Cho phép phát âm thanh khi app xuống nền (nút Home / khoá màn hình),
        // giống tính năng Background playback của bản Android.
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("YTXTube: không đặt được AVAudioSession: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
