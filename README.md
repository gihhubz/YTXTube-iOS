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
한국어** — cả 6 ngôn ngữ đều đầy đủ 264 chuỗi giao diện (nav, chip, trang
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
  sponsor/intro/outro, tắt các loại còn lại), Data & Storage (trạng thái
  đồng bộ cloud + Xuất/Nhập dữ liệu JSON sang máy khác + dung lượng đã
  dùng + Clear cache — chỉ xóa history/preferences/seen Shorts, không
  xóa like/save/download/subscription), About (phiên bản + tài khoản).
  Mọi cài đặt lưu trong localStorage và áp lại khi mở app. Chỉ có switch thật sự hoạt động mới được đưa vào — không có
  switch giả (vd. Language giờ đã có thật — xem mục "Đa ngôn ngữ" ở trên;
  PiP luôn bật qua wrapper native nên không có switch).
- **Subscriptions (lưu local theo tài khoản):** nút Subscribe trắng
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
nói thẳng:** đăng nhập Google đã có (xem mục Đăng nhập bên dưới) nhưng
chỉ là GIS — không cấp quyền đọc YouTube (không có YouTube Data API)
nên subscriptions vẫn lưu local theo tài khoản, không phải theo tài
khoản YouTube thật; nhiều tài khoản YouTube vẫn chưa có; không có chế
độ TV; không có ExoPlayer (điều khiển player là embed YouTube);
SponsorBlock chỉ skip tự động, không có chế độ Ask (hỏi trước khi skip)
hay Show (chỉ đánh dấu) như Android; SponsorBlock phụ thuộc vào dữ liệu
cộng đồng — video ít người xem có thể không có segment nào.

## Đăng nhập + dữ liệu theo tài khoản + đồng bộ cloud (mới, 2026-11-15)

### Đăng nhập (nút avatar trên header)

- **Email — dùng được ngay, không cần máy chủ:** nhập email + tên hiển
  thị + chọn avatar (emoji hoặc chữ cái đầu với màu theo tên), kiểm tra
  định dạng email, lưu local `{name, email, avatar, method:'email'}`.
  Giao diện ghi rõ hồ sơ chỉ lưu trên máy.
- **Google — luồng thật bằng Google Identity Services (GIS):** nạp script
  GIS, init bằng Client ID, nhận credential (ID token), lấy tên/email/
  avatar từ payload, lưu profile `method:'google'`. Client ID lấy từ
  `GOOGLE_CLIENT_ID` ở đầu `app.js`, mặc định để trống. Khi trống, bấm
  nút Google thì báo rõ "chưa cấu hình Google Client ID" — không giả vờ
  đăng nhập thành công. **Không có Apple ID** (theo yêu cầu — chỉ Google
  hoặc Email).
- Sau khi đăng nhập, header hiện avatar/tên/email đã chọn; bấm avatar mở
  bảng hồ sơ (tên + avatar + cách đăng nhập, nút Đăng xuất xóa profile
  về icon mặc định).
- **Cài đặt Google Client ID (1 lần):** Google Cloud Console
  (console.cloud.google.com) → tạo project → APIs & Services →
  Credentials → Create Credentials → OAuth client ID → loại **Web
  application** → Authorized JavaScript origins thêm domain Vercel
  (vd. `https://ytxtube-ios-web.vercel.app`) + `http://localhost` →
  copy Client ID → dán vào `GOOGLE_CLIENT_ID` trong `app.js`.
- Giới hạn: trong WKWebView của app đã cài, popup Google có thể cần xử
  lý thêm phía Swift (chưa có) — Google chắc chắn chạy trên link web
  (Safari). Đăng nhập Google qua GIS **không** cấp quyền đọc YouTube
  (không có YouTube Data API) nên subscriptions vẫn là local.

### Dữ liệu gắn theo tài khoản (không cần máy chủ)

- Lịch sử xem, video đã thích, kênh đã đăng ký, video đã lưu/tải, cài
  đặt, ngôn ngữ, chất lượng đã khóa, tùy chọn SponsorBlock… đều lưu
  theo hồ sơ qua 1 lớp dữ liệu (`store` + `DATA_KEYS` trong `app.js`):
  chưa đăng nhập dùng key cũ `ytxtube:<key>` (dữ liệu local cũ **không
  mất** khi cập nhật); đã đăng nhập dùng
  `ytxtube:acct:<accountId>:<key>` (Google: `g:<sub>`; Email:
  `e:<hash email>`). Đăng nhập nạp đúng bộ của tài khoản đó, đăng xuất
  về lại bộ local, đổi tài khoản là đổi bộ dữ liệu.
- Tài khoản mới đăng nhập lần đầu mà chưa có dữ liệu: app tự copy dữ
  liệu local trên máy này sang tài khoản đó (1 lần) để lịch sử/đã thích/
  đăng ký không "biến mất".
- **Xuất / Nhập dữ liệu (Settings → Data & Storage):** "Xuất dữ liệu"
  tải xuống 1 file JSON chứa toàn bộ dữ liệu của tài khoản đang dùng;
  "Nhập dữ liệu" chọn file JSON đã xuất để nạp lại (hỏi xác nhận ghi đè
  trước). Đây là cách chuyển dữ liệu sang máy khác khi chưa có cloud.
  Trên iOS Safari file mở trong tab mới — dùng nút Share → Save to Files.

### Đồng bộ cloud thật bằng Firebase (gói miễn phí Spark)

- Module Firebase trong `app.js`: Firebase JS SDK (compat) nạp từ CDN
  gstatic, cấu hình từ `FIREBASE_CONFIG` ở đầu file, mặc định để trống.
  **Không bịa config/key giả.** Config trống → cloud TẮT, app chạy hoàn
  toàn bằng local theo tài khoản + xuất/nhập file, Settings hiện rõ
  "Đồng bộ cloud: chưa cấu hình", không lỗi console.
- Khi có config: mọi thay đổi (thích, đăng ký/bỏ đăng ký, lưu, lịch sử,
  đổi cài đặt/ngôn ngữ/chất lượng) tự đẩy lên cloud sau debounce ~2.5
  giây, không cần bấm nút. Chiều ngược lại tự động theo thời gian thực
  qua Firestore `onSnapshot`: máy khác đổi là tự tải về, gộp và cập nhật
  ngay giao diện đang mở (không cần tải lại trang). Gộp thông minh từng
  mục theo `updatedAt` (bản mới nhất thắng từng mục, không ghi đè cả bộ).
  Mất mạng thì dùng local, có mạng lại thì đẩy tiếp. Trạng thái trong
  Settings: đang bật/tắt, lần đồng bộ cuối, lỗi nếu có.
- Firestore: collection `users`, doc id = `g_<sub>` (Google) hoặc
  `e_<hash>` (Email — không lưu email trần làm doc id), 1 field `data`
  (toàn bộ JSON) + `updatedAt` (map từng key → ms) + `updatedAtDoc`.
- **Tạo project Firebase miễn phí:** console.firebase.google.com →
  Add project → Build → Firestore Database → Create database (chế độ
  **production mode**, chọn vị trí gần nhất) → Project settings → Your
  apps → Web app (</>) → copy config → dán vào `FIREBASE_CONFIG`.
- **Rules mẫu** (Firestore → Rules):
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```
  **Giới hạn bảo mật — nói thẳng:** rules trên chỉ có tác dụng khi bật
  Firebase Auth; app này dùng GIS / Email local (không có Firebase
  Auth) nên rules không xác minh được chủ sở hữu — doc id đã băm là rào
  chắn duy nhất, đừng lưu dữ liệu nhạy cảm. Muốn bảo mật đúng nghĩa thì
  bật Firebase Auth (Google provider) sau này.
- Lưu ý: Email local không có xác thực server nên khóa đồng bộ chỉ là
  định danh local.

## Feed tải liên tục + live theo thời gian thực (mới, 2026-11-15)

- **Thanh trên dính:** header (logo, tìm kiếm, avatar, cài đặt) + hàng
  chips được bọc trong 1 wrapper `.topbar` sticky (top 0, nền đặc,
  z-index 60). Safari/WKWebView không dính được khi cùng 1 phần tử vừa
  `position: sticky` vừa `backdrop-filter` nên wrapper sticky KHÔNG có
  backdrop-filter, header/chips giữ hiệu ứng kính mờ bên trong. Thanh
  điều hướng dưới (5 tab) giữ nguyên.
- **Feed tải liên tục, không giới hạn:** lướt hết feed Trang chủ (kể cả
  khi bấm chip lọc) thì tự tải thêm — Piped `/trending` chỉ trả 1 danh
  sách cố định nên khi hết, app xoay vòng các nguồn khác (tìm kiếm phổ
  biến: nhạc, game, thể thao, tin tức… / trending khu vực khác), nối
  tiếp vào feed, loại trùng id đã hiện, lọc đúng chip đang chọn. Chỉ
  hiện "Hết video" khi đã thử nhiều nguồn mà vẫn không còn gì (hiếm).
  Tìm kiếm dùng token `nextpage` của Piped `/search` để tải thêm trang
  khi lướt tới cuối (cuộn vô hạn thật sự). Đang tải thì hiện spinner
  "Đang tải thêm video…", lỗi mạng thì hiện nút thử lại.
- **Live / sắp chiếu / ngày đăng:** video live không còn hiện
  "-1:-1:-1" hay "56 năm trước". Duration -1 hiện huy hiệu đỏ
  "Trực tiếp"; video sắp chiếu (ngày công chiếu trong tương lai) hiện
  "Chưa chiếu" hoặc giờ công chiếu ("Chiếu lúc 16:10 • 15/11" theo giờ
  máy). Ngày đăng dưới mỗi video (feed, màn xem, video liên quan,
  Shorts) là **ngày tuyệt đối** theo locale của máy (vd. "15/11/2026"),
  không còn "X ngày trước". Ngày không hợp lệ (<= 0 hoặc quá khứ xa như
  1970) thì ẩn phần ngày. Giới hạn: dữ liệu danh sách Piped không có
  trường `isLive`/`isUpcoming`, livestream trả `duration: -1` và
  `uploaded: -1`, nên từ danh sách không phân biệt được "đang live" và
  "sắp chiếu" — duration -1 luôn hiện "Trực tiếp" trừ khi có ngày công
  chiếu trong tương lai. Ngày trong bình luận giữ nguyên thời gian tương
  đối.
- **Xem live theo thời gian thực:** mở video live là phát ngay tại điểm
  live hiện tại (live edge), huy hiệu đỏ "TRỰC TIẾP" trong màn xem,
  đồng hồ live cập nhật từng giây. Tua lại phía sau (DVR) thì hiện nút
  "Quay lại trực tiếp" để nhảy về live edge. Luồng kết thúc thì hiện
  "Luồng trực tiếp này đã kết thúc" (không đứng hình ở khung cuối);
  video sắp chiếu vừa lên sóng thì tự chuyển sang trạng thái trực tiếp.
  Chỉ dùng API YouTube đã có trong tài liệu (`getCurrentTime`,
  `getDuration` — live là Infinity, `seekTo`, `getPlayerState`).
  SponsorBlock được bỏ qua cho live (không có đoạn sponsor cố định).
- **Video thường cũng cập nhật theo thời gian thực:** đồng hồ đã xem/
  tổng thời gian + thanh tiến trình dưới màn xem chạy mượt, cập nhật
  từng giây trong lúc phát; tua thì cập nhật trong vòng 1 giây; tạm dừng
  thì đồng hồ dừng đúng chỗ. VOD và live dùng chung 1 vòng tick 1 giây,
  chỉ khác live có thêm huy hiệu TRỰC TIẾP + nút "Quay lại trực tiếp".

## Bình luận: avatar + giờ đăng (sửa, 2026-11-15)

- Piped `/comments` trả `thumbnail: null` cho mọi bình luận nên bản cũ
  render `<img src="">` và hiện icon ảnh vỡ ở mọi avatar. Bản sửa dùng
  DiceBear identicon theo tên tác giả khi không có ảnh thật — đúng cách
  bản web gốc làm (`c.thumbnail || dicebear.com/7.x/identicon/...`);
  ảnh thật (nếu có) vẫn dùng, lỗi tải thì tự đổi sang DiceBear.
- Giờ bình luận: Piped trả sẵn chuỗi tương đối ("6 years ago") nên hiện
  nguyên chuỗi đó; chỉ khi nào là timestamp số mới tính tương đối qua
  `timeAgo` (trước đây chuỗi đi qua `timeAgo` nên ra "NaN năm trước").
- Cùng lỗi `src=""` ở avatar kênh trong màn xem và đầu trang kênh cũng
  đã sửa sang DiceBear theo tên kênh.

## Màn xem 2 cột như bản web gốc (sửa, 2026-11-15)

- Trên màn hình rộng (≥900px) màn xem giờ có 2 cột như bản web gốc:
  cột trái là video + tiêu đề + kênh + mô tả + lời + bình luận, cột
  phải (380px) chỉ có "Recommended Videos" với các hàng ngang gọn
  (ảnh 168px bên trái, tiêu đề/kênh/lượt xem bên phải, không avatar
  kênh, không nút ⋮). Trước đây cột phải là bình luận nên video đề xuất
  bị chìm dưới cả chục bình luận, phải cuộn mãi mới thấy.
- Trên điện thoại vẫn 1 cột như cũ (video, bình luận, rồi video đề
  xuất); ngăn bình luận trượt từ dưới lên không đổi.

## Gợi ý video không còn trống + tương tác (sửa, 2026-11-15)

- Nguyên nhân trống: gợi ý chỉ lấy từ `relatedStreams` của Piped
  `/streams`, mà Piped thường trả rỗng (hoặc lỗi theo IP) nên sidebar
  chỉ hiện một dòng "Không có video liên quan" — và khi `/streams`
  lỗi hẳn thì sidebar trống hoàn toàn, không có cả dòng báo.
- Giờ thử lần lượt: related của `/streams` → tìm theo tên kênh →
  tìm theo từ khóa tiêu đề → trending VN; trong lúc chờ hiện
  "Đang tải gợi ý…", nếu mọi nguồn đều lỗi/trống thì hiện nút "Thử
  lại". Nhờ đó cả tính năng tự phát video tiếp theo (`relatedList[0]`)
  cũng hoạt động khi Piped không trả related.
- Tương tác trên từng video gợi ý: bấm vào video để mở (như cũ), thêm
  3 nút **Lưu** (vào tab Đã lưu), **Chia sẻ** (mở hộp chia sẻ của máy
  hoặc sao chép link) và **Ẩn** (xóa khỏi gợi ý, nhớ luôn lần sau).
  Nút ⋮ trong gợi ý đã bỏ (trước đây bấm vào nó lại mở video thay vì
  mở menu). Đã kiểm tra 6 tình huống dự phòng bằng Piped giả lập, đều
  đạt.

## Biểu tượng giống bản web/app gốc (sửa, 2026-11-15)

- Trước đây nút bấm dùng emoji (🔍 👍 👎 🔖 ⬇ ⚙️ 🎵 💬 ⋮ …), trong
  khi bản web gốc và app Android đều dùng icon Material (SVG 24x24,
  `fill="currentColor"`).
- Giờ mọi nút bấm dùng SVG Material: tìm kiếm, đóng (✕ giữ nguyên
  như bản gốc), quay lại, ⋮, like/dislike, chia sẻ, tim, lưu
  (bookmark), tải xuống, cài đặt, nốt nhạc, phát/tạm dừng, tới/lùi,
  xáo trộn, lặp lại, âm lượng, làm mới, bình luận, trang chủ, thư
  viện, danh sách phát, tài khoản, quả địa cầu, mũi tên xuống. Các
  path search/close/back/more-vert/like/dislike/share/heart lấy đúng
  từ `index.html` bản web gốc; còn lại là path Material chuẩn cùng bộ.
- Bộ icon nằm trong `ICONS` + hàm `icon()` ở `app.js`; nút tĩnh viết
  trực tiếp trong `index.html`, nút JS vẽ lại qua `innerHTML` (vì
  `applyI18n` và các hàm đồng bộ nút vẫn ghi đè nội dung nút). Nhãn
  i18n (12 khóa × 6 ngôn ngữ) đã bỏ emoji ở đầu, chỉ còn chữ.
- Còn giữ nguyên: ✕ ở nút đóng (bản gốc cũng dùng ✕), ✓ ở "Đã đăng
  ký ✓", ♥ trong câu hướng dẫn, và avatar thú (🦊 🐼…) do người dùng
  tự chọn — đó không phải biểu tượng nút bấm.

## Chưa có (không port từ bản Android)

PoToken, nhiều tài khoản YouTube, chế độ TV. Những
tính năng này cần InnerTube / PoToken / server riêng — vượt khỏi phạm vi
bản hiện tại chạy hoàn toàn bằng Piped + embed công khai. (Đăng nhập
Google 1 tài khoản đã có — xem mục Đăng nhập bên dưới; cần Client ID.)

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
