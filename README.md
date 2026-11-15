# YTXTube iOS

Bản viết lại cho iPhone/iPad của **YTXTube** — app xem YouTube + YouTube Music
nhẹ, không quảng cáo, giao diện Liquid Glass. Viết lại từ đầu (clean-room):
không copy code Android (Kotlin/Jetpack Compose) của bản gốc, chỉ giữ lại
ý tưởng — xem YouTube qua API công khai + trình phát embed.

> ⚠️ **Chưa có file .ipa sẵn.** Máy Linux này không có Xcode/macOS nên
> **không biên dịch được IPA tại đây và chưa test trên iPhone thật**.
> Làm theo mục "Cách lấy file IPA" bên dưới để build.

## Mục tiêu: giống hệt bản Android v2.2.0

Bản Android đối chiếu là **YTXTube v2.2.0, phát hành 2026-11-03**
(APK 4.146.869 byte, 13 release). Changelog v2.2.0 (kiểm chứng qua GitHub
API): hỗ trợ nhiều ngôn ngữ, sửa icon Shorts và thanh điều hướng dưới, sửa
màu status bar, thêm switch trong General settings, **mini player kiểu
YouTube**, cải thiện engine tải (stream liên tục, hỗ trợ resume), sửa lỗi
nhỏ. Bản iOS này lấy v2.2.0 làm đích: cùng màn hình, cùng thứ tự tab, cùng
giao diện đồ hoạ — chỉ phần engine khác ở chỗ iOS bắt buộc (Swift/WKWebView
+ Piped/lrclib thay cho Kotlin/InnerTube/ExoPlayer). Ảnh chụp gốc đối
chiếu nằm trong repo Android (`docs/screenshots/`), không copy file ảnh.

Căn theo từng ảnh chụp:

- **01-home:** header logo đỏ + nút search + avatar; chip All / Today /
  Videos / Subscribed / Live (chip chọn nền trắng chữ đen); thẻ video
  full-width có avatar kênh + ⋮; mini player dock kính phía trên thanh tab;
  thanh tab pill kính nổi, 5 tab **Home | Music | Shorts | Library |
  Saved** theo đúng thứ tự Android (bản v1 cũ chỉ có 3 tab sai thứ tự).
- **02-shorts:** top bar có nút back + "Shorts" + nút tròn kính volume /
  refresh / search; rail phải theo thứ tự Like | Dislike | Comments |
  Download | Share; overlay có tên kênh + nút Subscribe trắng + "♫ Shorts".
- **03-player:** tiêu đề, dòng meta views • ngày • likes, kênh + nút
  Subscribe trắng, hàng nút Like (kèm số) | Dislike | Save | Download |
  Share, mô tả có "...more", Comments (kèm số), "More videos".
- **04-music-player:** màn hình Now Playing — "YTX MUSIC" / "Now
  Playing", ảnh vuông bo lớn, tên bài + nghệ sĩ + tim, seek bar, nút
  shuffle / prev / play to / next / repeat, pill "HQ AUDIO · 256 KBPS AAC".
- **05-lyrics:** thẻ kính, chữ "LYRICS" đỏ, pill EN + ✕, câu đang hát
  trắng đậm to, các câu khác mờ, căn trái.
- **08-settings:** cấu trúc đối chiếu (Appearance, General, Language,
  Storage, About) — màn hình Settings làm ở Bước 5 (xem dưới).

Cái v2.2.0 sửa mà bản iOS đã theo: **bottom bar đã sửa** (pill nổi 368px,
đúng 5 tab, đúng thứ tự, tab active có pill sáng), **mini player kiểu
YouTube** (dock kính, play/next/close, vạch tiến độ đỏ), **màu status bar**
(`theme-color #0f0f0f`). Chưa theo được: nút điều khiển player bằng kính
tùy chỉnh của Android (ExoPlayer) — bản iOS dùng điều khiển embed YouTube
chính thức; engine tải của v2.2.0 (stream liên tục + resume) là Bước 4
(xem dưới — bản iOS làm theo cách iOS cho phép, không có resume).

## Có gì trong v1

## Đa ngôn ngữ (đã làm, 2026-11-15)

Theo changelog v2.2.0 của bản Android ("multiple languages support").
Web client hỗ trợ **Tiếng Việt, English, Español, 中文 (简体), 日本語,
한국어** — cả 6 ngôn ngữ đều đầy đủ 219 chuỗi giao diện (nav, chip, trang
xem, Shorts, Nhạc + lời, Tải xuống + Chất lượng, SponsorBlock, Library,
Saved, Settings, toast và thông báo trạng thái). Đổi ngôn ngữ ở
**Settings → Language** (mặc định System = theo ngôn ngữ máy qua
`navigator.language`, không nhận ra thì về tiếng Anh); lựa chọn lưu trong
localStorage và áp ngay **không cần tải lại trang** — nhãn tĩnh qua
`data-i18n` / `data-i18n-placeholder`, chuỗi động qua hàm `t(key)` với
chuỗi fallback ngôn ngữ đã chọn → tiếng Anh → chính key (không bao giờ
để trống). Số lượt xem / ngày tháng / số đếm cũng theo locale của ngôn
ngữ đang chọn.

- **Web client viết lại** (`YTXTubeiOS/Web/`): giao diện Liquid Glass
  theo ảnh chụp Android v2.2.0 (nền tối mặc định, kính mờ, điểm nhấn đỏ),
  nhãn tiếng Anh mặc định như bản Android.
  - Tìm kiếm (nút search trên header mở ô tìm kiếm), chip HomeFilter:
    All, Today, Videos, Subscribed, Live.
  - Feed thịnh hành (Piped, khu vực VN), cuộn vô hạn (tải thêm khi cuộn gần cuối).
  - Trang xem: trình phát `youtube-nocookie.com` + YouTube IFrame API
    (`enablejsapi=1`, `playsinline=1`, `rel=0`, `autoplay=1` — xem ghi chú
    kỹ thuật bên dưới), tiêu đề, meta views/likes, kênh + Subscribe, hàng
    nút Like | Dislike | Save | Download | Share, mô tả có "...more",
    Comments, More videos.
  - Bình luận qua Piped: sidebar trên desktop, ngăn trượt lên (drawer) trên mobile.
  - Thích / Không thích / Lưu / Đăng ký — chỉ lưu trên máy (localStorage),
    dùng `navigator.share` để chia sẻ, không có thì copy link.
  - Lịch sử xem + gợi ý cá nhân hoá: chỉ dựa trên video bạn đã xem trên máy
    này (localStorage), không gửi đi đâu.
- **App SwiftUI** (`YTXTubeiOS/`): `WKWebView` chạy web client đóng gói sẵn,
  phát inline trong trang (`allowsInlineMediaPlayback`), Picture-in-Picture,
  phát nền (AVAudioSession `.playback` + Background Mode `audio`), link ngoài
  mở bằng Safari, có màn hình loading / lỗi tiếng Việt.
- **Icon app** tự vẽ (nút play trắng trên nền đỏ), không dùng icon của bản gốc.

## Bước 2 — Shorts (đã làm, 2026-11-15)

Thanh điều hướng dưới: **Trang chủ | Shorts**. Mở Shorts là feed dọc toàn
màn hình, vuốt lên để sang video tiếp theo (scroll-snap), tự phát slide
đang thấy và tạm dừng các slide khác (IntersectionObserver), chạm vào
video để bật/tắt tiếng (mặc định tắt tiếng để iOS cho autoplay).

Mỗi slide có thanh nút bên phải: Thích (chỉ lưu trên máy), Bình luận
(lấy qua Piped, hiện trong ngăn trượt lên), Chia sẻ (link
`youtube.com/shorts/ID`), Bật/Tắt tiếng, Làm mới loạt video. Rời Shorts
(trang chủ, tìm kiếm, mở video) thì trình phát Shorts bị dừng + gỡ iframe
để không còn tiếng chạy nền. Video đã xem được nhớ trong localStorage để
tránh lặp lại trong các loạt sau; cuộn gần cuối feed thì tải thêm.

**Nguồn Shorts khác bản Android — nói thẳng:** bản Android lấy Shorts qua
`InnerTube.shorts` (cần PoToken / đăng nhập, chạy bằng ExoPlayer, có số
lượt thích/không thích thật và tải video). Đường đó không copy được sang
web iOS, nên bản iOS lấy video ngắn qua Piped: tìm nhiều chủ đề
("shorts âm nhạc", "shorts mèo", "#shorts"…), chỉ giữ video dài 1–64 giây,
gom đủ 10 video mới dừng; hết thì bù bằng danh sách dự phòng đã kiểm tra
qua Piped. Vì vậy Shorts iOS là "video ngắn tìm được qua Piped", không phải
Shorts cá nhân hoá theo tài khoản Google.

**Giống bản Android:** vuốt dọc toàn màn hình, tự phát, thanh nút Thích /
Bình luận / Chia sẻ, nút Làm mới lấy loạt mới, nhớ video đã xem.
**Khác bản Android:** không có ExoPlayer preload, không có Shorts cá nhân
hoá theo tài khoản đã đăng nhập, không có số lượt không thích, không tải
video trong bước này (tải là Bước khác, chưa làm).

Lưu ý khi test: tìm "shorts" trên Piped thường trả video *dài* nói về
Shorts, nên code phải gom qua nhiều truy vấn — nếu mạng yếu hoặc Piped bận,
Shorts có thể về chậm hoặc chỉ còn video dự phòng.

## Bước 3 — Nhạc + lời đồng bộ (đã làm, 2026-11-15)

Thanh điều hướng dưới giờ có đủ 5 tab Android: **Home | Music | Shorts |
Library | Saved**, và giao diện đã căn lại theo ảnh chụp v2.2.0 (xem mục
"Mục tiêu" ở trên). Ngôn ngữ giao diện theo mặc định tiếng Anh của bản
Android (bản Android có hỗ trợ nhiều ngôn ngữ; bản iOS này theo nhãn mặc
định của nó, không thiết kế lại kiểu khác).

- **Tab Music:** ô tìm bài hát / nghệ sĩ + chips For You, Vietnamese,
  US-UK, K-Pop, Lo-fi, Remix + 2 kệ như Android (Recently played, Liked
  tracks — lấy từ lịch sử / thích trên máy, không cần đăng nhập). Tìm qua
  Piped, thử lần lượt filter `music_songs`, `music_videos`, rồi rơi về
  `videos` nếu filter nhạc trả rỗng (tùy máy chủ Piped).
- **Now Playing:** bấm vào bài thì mở màn hình Now Playing như ảnh 04 —
  ảnh vuông bo lớn, tên bài + nghệ sĩ + tim, seek bar có giờ hiện tại /
  tổng giờ, shuffle / prev / play to / next / repeat, pill "HQ AUDIO ·
  256 KBPS AAC", nút Lyrics và Queue. Video gốc chạy ẩn để lấy tiếng
  (embed youtube-nocookie), nên vẫn phát nền + PiP như v1. Nút Back thu
  nhỏ về mini player thay vì tắt nhạc.
- **Mini player (mới ở v2.2.0):** rời khỏi player thì nhạc/video thu về
  dock kính trên thanh tab — ảnh nhỏ, tên bài, play/pause, next, đóng,
  vạch tiến độ đỏ. Nút Next lấy bài tiếp theo trong queue nhạc, hoặc video
  liên quan tiếp theo khi đang xem video thường.
- **Library / Saved (tab 4 và 5):** Library liệt kê History, Liked videos
  và Subscriptions (đăng ký kênh lưu trên máy — nút Subscribe trắng trong
  trang xem và trong Shorts); Saved liệt kê video đã Save (nút Save trong
  trang xem). Tải file thật là Bước 4 (đã làm, xem dưới).
- **Lời bài hát:** nút "🎵 Lyrics" dưới trình phát ở trang xem, hoặc nút
  Lyrics trong Now Playing (mở thẻ lời như ảnh 05). Tên bài + nghệ sĩ
  được tách từ tiêu đề video (bỏ hậu tố "(Official Music Video)",
  "(Official Audio)", "Lyric Video"… trong ngoặc, tách "Nghệ sĩ - Tên
  bài", bỏ phần "ft./feat." ở nghệ sĩ), rồi hỏi lrclib:
  `GET /api/get?track_name=…&artist_name=…&duration=…` trước, không có thì
  `GET /api/search?q=…` làm dự phòng, ưu tiên bản có `syncedLyrics`.
  - Có lời đồng bộ (LRC `[mm:ss.xx]`): hiển thị kiểu Apple Music — câu
    đang hát trắng đậm to, các câu đã qua mờ dần, tự cuộn theo nhạc
    (đọc `player.getCurrentTime()` mỗi 250ms); chạm vào câu hát thì nhảy
    tới đúng giây đó (`player.seekTo(giây, true)`).
  - Chỉ có lời thường (`plainLyrics`): hiện nguyên văn để đọc, không
    highlight, có ghi chú.
  - Không tìm thấy lời: báo "No lyrics found for this track" + nút
    Try again. Bấm Back thì lời dừng theo dõi, đổi video thì tải lời mới.

**Nguồn lời đúng như bản Android — nói thẳng:** bản Android
(`Account.kt musicLyrics`) cũng dùng lrclib công khai theo đúng 2 bước
trên (`/api/get` rồi `/api/search`), chỉ khác là khi lrclib không có, bản
Android còn hỏi thêm YouTube Music (cần tài khoản / InnerTube). Bản iOS
không có đường dự phòng đó, nên có bài sẽ không có lời.

**Giống bản Android:** highlight câu đang hát, chạm để nhảy, lời thường
làm dự phòng, Now Playing, mini player, tab Library/Saved. **Khác bản
Android:** không có lời từ YouTube Music, không lưu lời offline, nhạc
Việt / nhạc ít người nghe có thể không có lời đồng bộ trên lrclib (vì lời
do cộng đồng đóng góp); điều khiển player là embed YouTube, không phải
nút kính tùy chỉnh ExoPlayer; chưa có đăng nhập tài khoản.

## Bước 4 — Tải xuống + chọn chất lượng (đã làm, 2026-11-15)

Căn theo ảnh chụp 06-download-video và 07-downloading của Android v2.2.0.

- **Chọn chất lượng (Quality):** nút "⚙️ Auto" trong hàng nút của trang
  xem, và nút "HD" trên top bar của Shorts, mở sheet chọn Auto / 2160p /
  1440p / 1080p / 720p / 480p / 360p / Audio only. Dùng đúng API đã ghi
  trong tài liệu YouTube: `getAvailableQualityLevels()`,
  `getPlaybackQuality()`, `setPlaybackQuality(level)` với các level
  `hd2160`, `hd1440`, `hd1080`, `hd720`, `large`, `medium`, `small`,
  `tiny`. Lựa chọn được khóa lại (lưu trong localStorage) và áp cho mọi
  video, nhạc và Shorts khi player sẵn sàng; ở chế độ Auto thì nút hiện
  chất lượng thực tế đang phát (vd. "Auto · 1080p"). Chế độ Auto có gợi ý
  từ kết nối (`navigator.connection.effectiveType` / `downlink`) — chỉ là
  gợi ý hiển thị, không ép chất lượng.
- **Tải xuống (Download):** nút Download trong trang xem, rail của Shorts
  và Now Playing mở sheet "Download video" như ảnh 06 — ảnh thumb + tiêu
  đề + kênh, danh sách radio theo chất lượng, nút đỏ "⬇ Download 1080p ·
  4.18 MB". Link lấy qua Piped `/streams/{id}` (thử lần lượt từng
  instance): `videoStreams` (khử trùng theo quality, giữ bitrate cao
  nhất, ưu tiên MP4) và `audioStreams` (bitrate cao nhất mỗi format),
  ghi rõ "video + audio" hay "video only (no sound)" và dung lượng khi
  Piped có `contentLength`.
- **Trang Downloads (Saved tab):** như ảnh 07 — tab Videos / Music có đếm
  số lượng, từng mục có thumb, tiêu đề, kênh · chất lượng · dung lượng ·
  ngày, trạng thái và thanh tiến độ đỏ, nút Open / Remove. Mục tải được
  ghi vào localStorage khi bấm Download.

**Khác bản Android — nói thẳng:** bản Android có engine tải ExoPlayer
(stream liên tục + resume), chọn thư mục tải, mux video+audio thành một
file 4K/HDR. Bản iOS **không có** những thứ đó: Safari/WKWebView bỏ qua
thuộc tính `download` với link cross-origin (đúng bài học ở dự án
tai-anh-4k), nên file mở trong tab mới và người dùng long-press video rồi
chọn "Save to Files" (hoặc "Save to Photos" với MP4) — sheet hiện hướng
dẫn đó ngay sau khi bấm Download, kèm nút Copy link. Không có resume,
không có folder picker, không mux — video 1080p+ thường là stream riêng
không tiếng, cần tải thêm bản audio nếu muốn cả tiếng.
**Piped có lúc không trả đủ link:** kiểm tra thật ngày 2026-11-15, video
Rick Astley chỉ có 360p muxed, không có `audioStreams`, không có
`contentLength` — sheet hiển thị đúng những gì Piped trả, không bịa ra
2160p; `/streams` từng trả `SignInConfirmNotBot` từ IP của VM (YouTube
chặn truy cập ẩn danh) — code thử instance còn lại rồi báo lỗi rõ ràng
"Couldn't get download links — try again" và giữ sheet mở để thử lại.

## Bước 5 — SponsorBlock + Subscriptions + Settings (đã làm, 2026-11-15)

Bước cuối trong kế hoạch 5 bước. Mini player (đã có từ Bước 3) vẫn còn
nguyên và hoạt động: rời khỏi player thì video/nhạc thu về dock kính trên
thanh tab, có play/pause, next, đóng và vạch tiến độ đỏ.

- **SponsorBlock:** khi mở video / Shorts / bài nhạc, app hỏi API công khai
  `sponsor.ajay.app/api/skipSegments?videoID=…&categories=[…]` (kiểm tra
  thật ngày 2026-11-15: video `MuMUexmhHtg` trả segment sponsor
  `[0, 21.114]` — HTTP 200; video không có segment trả `[]`, phát bình
  thường). Kết quả được cache theo từng video (1 request / video). Một
  tick chung 250ms (chung với vòng theo dõi lời bài hát — không tạo timer
  thứ hai) đọc `player.getCurrentTime()`; vào tới segment thì
  `seekTo(end + 0.1)` và hiện toast "Skipped sponsor segment". Nếu API
  lỗi / offline thì phát bình thường, không hiện lỗi. Category theo đúng
  bản Android (`SponsorBlock.kt`): sponsor, intro, outro, selfpromo,
  interaction, music_offtopic — bản Android còn có preview/filler (mặc
  định Show/Off) nhưng bản iOS không tự skip 2 loại đó. Lưu ý: bản
  Android dùng endpoint hash-prefix (`/skipSegments/{4 ký tự đầu của
  SHA-256}`) để không gửi nguyên video ID; bản iOS dùng endpoint trực
  tiếp `?videoID=` cho đơn giản (đã kiểm tra là hoạt động).
- **Settings (nút ⚙️ trên header):** màn hình đầy đủ như ảnh 08 —
  Appearance (Liquid Glass toggle: tắt thì bỏ blur/kính mờ, dùng nền đặc
  qua class `body.no-glass`, đúng như Android; Theme mode System / Dark /
  Light / AMOLED — AMOLED là nền đen tuyền), Playback (Background
  playback: tắt thì rời khỏi player sẽ dừng hẳn thay vì thu về mini
  player; Autoplay next video: hết video thì tự phát video liên quan tiếp
  theo; Playback quality: hiện mức đã khóa + mở sheet chọn chất lượng),
  SponsorBlock (toggle chung + checkbox từng category, mặc định bật
  sponsor/intro/outro, tắt các loại còn lại), Data & Storage (dung lượng
  đã dùng + Clear cache — chỉ xóa history/preferences/seen Shorts, không
  xóa like/save/download/subscription), About (phiên bản + ghi chú không
  có đăng nhập Google). Mọi cài đặt lưu trong localStorage và áp lại khi
  mở app. Chỉ có switch thật sự hoạt động mới được đưa vào — không có
  switch giả (vd. Language giờ đã có thật — xem mục "Đa ngôn ngữ" ở trên;
  PiP luôn bật qua wrapper native nên không có switch).
- **Subscriptions (local, không đăng nhập Google):** nút Subscribe trắng
  trong trang xem / Shorts giờ lưu thật: tên + avatar + channel ID (lấy
  từ `uploaderUrl` của Piped) + ngày đăng ký trong localStorage. Tab
  Library → Subscriptions liệt kê kèm avatar, bấm vào thì mở video của
  kênh đó (thử `GET /channel/{id}` trước, không có thì tìm theo tên kênh
  qua Piped search), nút Unsubscribe ngay trong danh sách. Chip
  "Subscribed" trên trang chủ giờ lọc thật: lọc feed thịnh hành theo kênh
  đã đăng ký, nếu không có thì tìm video theo từng kênh đã đăng ký (tối
  đa 3 kênh, khử trùng); chưa đăng ký kênh nào thì báo rõ "You have no
  subscriptions yet".

**Giống bản Android:** skip sponsor tự động + toast, Settings có Liquid
Glass toggle + theme AMOLED + SponsorBlock theo category, Subscriptions
mở được video của kênh, chip Subscribed lọc thật. **Khác bản Android —
nói thẳng:** không có đăng nhập Google / nhiều tài khoản (không thể làm
được nếu không có Google login — subscriptions chỉ lưu trên máy); không
có chế độ TV; không có ExoPlayer (điều khiển player là embed YouTube);
SponsorBlock chỉ skip tự động, không có chế độ Ask (hỏi trước khi skip)
hay Show (chỉ đánh dấu) như Android; SponsorBlock phụ thuộc vào dữ liệu
cộng đồng — video ít người xem có thể không có segment nào.

## Chưa có (không port từ bản Android)

PoToken, đăng nhập tài khoản Google (nhiều tài khoản), chế độ TV. Những
tính năng này cần InnerTube / PoToken / server riêng — vượt khỏi phạm vi
bản hiện tại chạy hoàn toàn bằng Piped + embed công khai.

## Ghi chú kỹ thuật: vì sao embed kiểu này chạy được trên iOS

Theo tài liệu chính thức của YouTube
([IFrame API](https://developers.google.com/youtube/iframe_api_reference),
[Player parameters](https://developers.google.com/youtube/player_parameters)):

- `src = https://www.youtube-nocookie.com/embed/VIDEO_ID?autoplay=1&enablejsapi=1&rel=0&playsinline=1`,
  nạp `https://www.youtube.com/iframe_api`, dùng `new YT.Player(...)` với
  `playerVars: { playsinline: 1 }` và gọi `playVideo()` trong `onReady`.
- `playsinline=1` + `WKWebViewConfiguration.allowsInlineMediaPlayback = true`
  là bắt buộc để video phát ngay trong trang trên iOS, không nhảy fullscreen.
- `modestbranding` **không dùng** — tham số này đã bị YouTube bỏ từ
  15/08/2023, truyền vào cũng không có tác dụng.

## Cách lấy file IPA

### Cách A — có máy Mac + Xcode (khuyên dùng)

1. Mở `YTXTubeiOS.xcodeproj` bằng Xcode.
2. Chọn target **YTXTubeiOS** → Signing & Capabilities → tick
   **Automatically manage signing**, chọn Team là Apple ID miễn phí của bạn.
3. Cắm iPhone → chọn máy ở thanh công cụ → bấm ▶ Run để cài thẳng lên máy,
   hoặc **Product → Archive** → **Distribute App → Development** để xuất IPA.
4. IPA ký bằng Apple ID miễn phí hết hạn sau **7 ngày** — hết hạn thì cắm
   máy build lại (xem `HUONG-DAN-CAI-IPA.md`).

### Cách B — không có máy Mac (dùng GitHub Actions)

1. Đẩy repo này lên GitHub (repo public hoặc private đều được).
2. Vào tab **Actions** → workflow **Build unsigned IPA** → **Run workflow**.
3. Tải artifact `YTXTubeiOS-unsigned` về — đây là IPA **chưa ký**.
4. Ký + cài bằng SideStore / ESign / AltStore (xem `HUONG-DAN-CAI-IPA.md`).

### Cách C — thử ngay, không cần IPA

Mở thư mục `YTXTubeiOS/Web/index.html` bằng Safari trên iPhone
(hoặc host tĩnh thư mục này), rồi **Chia sẻ → Thêm vào Màn hình chính**.
Bản web chạy y hệt phần lõi của app, chỉ thiếu phát nền + PiP của app native.
Cần mạng để gọi Piped và YouTube.

## Cấu trúc thư mục

```
ytxtube-ios/
├── README.md
├── HUONG-DAN-CAI-IPA.md
├── LICENSE                     # GPL-3.0
├── .github/workflows/build-ipa.yml
├── YTXTubeiOS.xcodeproj/project.pbxproj
└── YTXTubeiOS/
    ├── YTXTubeiOSApp.swift     # @main, AVAudioSession phát nền
    ├── ContentView.swift       # WKWebView wrapper
    ├── Info.plist              # com.vux.ytxtubeios, background audio
    ├── Assets.xcassets/        # Icon + AccentColor (tự vẽ)
    └── Web/
        ├── index.html          # Giao diện (English, like Android)
        ├── app.js              # Gọi Piped API + IFrame API + SponsorBlock + lrclib
        └── style.css           # Liquid Glass, sáng/tối theo hệ thống + theme AMOLED
```

## Ghi công & giấy phép

- Ý tưởng và tên gốc: **YTXTube** của [Koustubh12345](https://github.com/Koustubh12345/YTXTube),
  giấy phép GPL-3.0. Bản viết lại này cũng phát hành theo **GPL-3.0**
  (xem `LICENSE`).
- Không liên kết với Google LLC hay YouTube. Video được phát trực tiếp từ
  máy chủ YouTube qua embed chính thức, chỉ dùng cho mục đích cá nhân.
  Người dùng tự chịu trách nhiệm tuân thủ Điều khoản dịch vụ của YouTube.
