/* YTXTube iOS — web client (viết lại từ đầu, GPL-3.0)
   Target: Android YTXTube v2.2.0 (2026-11-03) — same screens, same tab
   order (Home | Music | Shorts | Library | Saved), same Liquid Glass look,
   same player / Shorts rail / music player / lyrics visuals as the Android
   screenshots. Only the engine differs where iOS requires it (Piped +
   lrclib + youtube-nocookie instead of Kotlin / InnerTube / ExoPlayer).
   Nguồn dữ liệu: Piped API công khai (không cần tài khoản, không cần API key).
   Trình phát: YouTube IFrame API qua youtube-nocookie.com (xem README để biết
   vì sao dùng nocookie + enablejsapi + playsinline trên iOS).
   UI strings are multilingual (I18N dict below: en + vi complete, es/zh/ja/ko
   primary UI with English fallback); English is the fallback language.
   KHÔNG có đăng nhập, KHÔNG chặn quảng cáo
   bằng thủ thuật — quảng cáo không xuất hiện vì video chạy qua embed
   nocookie, không qua trang youtube.com. Tải video (Bước 4) chạy theo
   cách iOS cho phép: mở link stream trong tab mới rồi lưu vào Files. */

'use strict';

// ---------- Cấu hình ----------
const INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
];
const EMBED = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`;

// Danh sách dự phòng (chỉ dùng khi cả 2 máy chủ Piped đều lỗi).
// 6 video khác với bản gốc, để trang không trống.
const FALLBACK_VIDEOS = [
  { id: 'dQw4w9WgXcQ', title: 'Rick Astley — Never Gonna Give You Up', uploader: 'Rick Astley', views: 1600000000, duration: 213, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
  { id: '9bZkp7q19f0', title: 'PSY — GANGNAM STYLE', uploader: 'officialpsy', views: 5000000000, duration: 253, thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg' },
  { id: 'kJQP7kiw5Fk', title: 'Luis Fonsi — Despacito ft. Daddy Yankee', uploader: 'Luis Fonsi', views: 8800000000, duration: 282, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg' },
  { id: '60ItHLz5WEA', title: 'Alan Walker — Faded', uploader: 'Alan Walker', views: 3800000000, duration: 212, thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg' },
  { id: 'hTWKbfoikeg', title: 'Nirvana — Smells Like Teen Spirit', uploader: 'Nirvana', views: 2100000000, duration: 279, thumbnail: 'https://i.ytimg.com/vi/hTWKbfoikeg/hqdefault.jpg' },
  { id: 'JGwWNGJdvx8', title: 'Ed Sheeran — Shape of You', uploader: 'Ed Sheeran', views: 6300000000, duration: 263, thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg' },
];

// ---------- Shorts (Bước 2) ----------
// Bản Android lấy Shorts qua InnerTube (cần PoToken / đăng nhập) nên không
// copy được sang web iOS. Bản iOS lấy video ngắn qua Piped: tìm nhiều chủ đề,
// chỉ giữ video dài 1–64 giây. Kiểm tra ngày 2026-11-15: tìm "shorts" thường
// trả video DÀI nói về Shorts, chỉ vài chủ đề ("shorts âm nhạc", "shorts mèo")
// mới có video ngắn thật — vì vậy phải gom qua nhiều truy vấn mới đủ 10.
const SHORTS_QUERIES = [
  'shorts âm nhạc', 'shorts mèo', 'shorts hài', '#shorts',
  'shorts du lịch', 'shorts nấu ăn', 'shorts thể thao', 'shorts funny',
  'shorts dance', 'shorts công nghệ',
];
// Video ngắn dự phòng — ID đã kiểm tra qua Piped ngày 2026-11-15 là video
// < 65 giây. Chỉ dùng khi Piped trả quá ít video ngắn; tiêu đề hiển thị
// trong trình phát vẫn là tiêu đề thật của video.
const FALLBACK_SHORTS = [
  { id: 'bGYIUTCgzVA', title: 'Shorts', uploader: '', views: 0, duration: 30 },
  { id: 'ETv7UF0m5Bw', title: 'Shorts', uploader: '', views: 0, duration: 30 },
  { id: 'F4dI5RulG4c', title: 'Shorts', uploader: '', views: 0, duration: 30 },
  { id: 'FVOc8xi41_0', title: 'Shorts', uploader: '', views: 0, duration: 30 },
  { id: 'KccZ2jtdDGc', title: 'Shorts', uploader: '', views: 0, duration: 30 },
  { id: 'WRjB4fuW38U', title: 'Shorts', uploader: '', views: 0, duration: 30 },
];
const EMBED_SHORTS = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1&loop=1&playlist=${id}`;

// Home filter chips — exactly Android's HomeFilter (Screens.kt):
// All / Today / Videos / Subscribed / Live. Filtering is client-side over
// the trending feed (Piped has no "today" or "subscribed" endpoint).
const CATEGORIES = [
  { label: 'All', filter: 'all' },
  { label: 'Today', filter: 'today' },
  { label: 'Videos', filter: 'videos' },
  { label: 'Subscribed', filter: 'subscribed' },
  { label: 'Live', filter: 'live' },
];

// ---------- Bộ nhớ cục bộ (lịch sử + sở thích, chỉ trên máy) ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem('ytxtube:' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('ytxtube:' + key, JSON.stringify(value)); } catch { /* ẩn danh: bỏ qua */ }
  },
};
let liked = new Set(store.get('liked', []));
let disliked = new Set(store.get('disliked', []));
let subscribed = new Set(store.get('subscribed', [])); // channel names (local only)
let savedVideos = store.get('savedVideos', {}); // id -> {id,title,uploader,thumbnail,duration}
let likedMeta = store.get('likedMeta', {});     // id -> {id,title,uploader,thumbnail,duration}
let history = store.get('history', []);       // [{id, title, category, at}]
let prefWords = store.get('prefWords', {});   // {từ khóa: số lần xem}

// ---------- Đa ngôn ngữ (i18n) — Android v2.2.0 có "multiple languages support" ----------
// t(key) fallback chain: chosen language -> English -> key itself. Never blank.
// English + Vietnamese are complete (every key). es/zh/ja/ko translate the
// primary UI strings; any key missing there falls back to English at runtime.
const I18N = {
en: {
'common.views': 'views', 'common.likes': 'likes', 'common.subscribers': 'subscribers', 'common.channel': 'Channel',
'common.today': 'Today', 'common.dayAgo': '1 day ago', 'common.daysAgo': '{n} days ago', 'common.monthsAgo': '{n} months ago', 'common.yearsAgo': '{n} years ago',
'common.change': 'Change', 'common.search': 'Search', 'common.library': 'Library', 'common.settings': 'Settings',
'common.moreOptions': 'More options coming in a later step.', 'common.tryAgain': 'Try again', 'common.loading': 'Loading…',
'nav.home': 'Home', 'nav.music': 'Music', 'nav.shorts': 'Shorts', 'nav.library': 'Library', 'nav.saved': 'Saved',
'search.placeholder': 'Search videos, channels…',
'chip.all': 'All', 'chip.today': 'Today', 'chip.videos': 'Videos', 'chip.subscribed': 'Subscribed', 'chip.live': 'Live',
'music.search.placeholder': 'Search songs, artists…',
'music.chip.forYou': 'For You', 'music.chip.vietnamese': 'Vietnamese', 'music.chip.usUk': 'US-UK', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': 'Remix',
'music.nowPlaying': 'Now Playing', 'music.hqAudio': 'HQ AUDIO · 256 KBPS AAC', 'music.lyrics': '🎵 Lyrics', 'music.queue': '🎶 Queue',
'music.recent': 'Recently played', 'music.likedTracks': 'Liked tracks', 'music.browse': 'Browse',
'music.noRecent': 'No recent music yet.', 'music.noLiked': 'No liked tracks yet — tap ♥ on any track.',
'music.noSongs': 'No songs found — try another search.', 'music.loading': 'Loading music…',
'music.queueToast': 'Queue: {n} track{s} — now playing #{i}.', 'music.endQueue': 'End of queue.', 'music.nothingNext': 'Nothing next to play.',
'music.loadError': 'Could not load music — check your connection and try again.',
'watch.back': '← Back', 'watch.subscribe': 'Subscribe', 'watch.subscribed': 'Subscribed ✓',
'watch.save': '🔖 Save', 'watch.saved': '🔖 Saved', 'watch.download': '⬇ Download', 'watch.quality': 'Quality', 'watch.share': '↗ Share',
'watch.lyrics': '🎵 Lyrics', 'watch.hideLyrics': '🎵 Hide lyrics', 'watch.comments': 'Comments', 'watch.commentsFab': '💬 Comments',
'watch.moreVideos': 'More videos', 'watch.more': '...more', 'watch.less': '...less',
'watch.loading': 'Loading…', 'watch.loadError': 'Could not load video info, but the player is still running.',
'watch.noComments': 'No comments yet.', 'watch.commentsError': 'Could not load comments right now.',
'watch.noRelated': 'No related videos.', 'watch.loadingComments': 'Loading comments…',
'download.title': 'Download video', 'download.gettingLinks': 'Getting download links…',
'download.noStreams': 'No downloadable streams for this video — it may be age-restricted or a live stream.',
'download.noLinks': 'Couldn’t get download links — check your connection and try again.',
'download.noLinksBlocked': 'Couldn’t get download links — YouTube is blocking this server right now. Try again later.',
'download.openedNote': 'Opened in a new tab — <b>long-press the video and choose “Save to Files”</b> (or “Save to Photos” for MP4). Find it later in Saved → Downloads.',
'download.go': '⬇ Download', 'download.copyLink': 'Copy link', 'download.retry': 'Try again',
'download.videoAudio': 'video + audio', 'download.videoOnly': 'video only (no sound)',
'download.sizeUnknown': 'Size unknown', 'download.openedStatus': 'Opened in Safari — save from there',
'download.noDownloads': 'No downloads yet — tap Download on any video.',
'download.noVideoDownloads': 'No video downloads yet.', 'download.noMusicDownloads': 'No music downloads yet.',
'download.opened': 'Download opened — save it from the new tab.', 'download.linkCopied': 'Download link copied.',
'download.iosNote': 'On iOS the file opens in a new tab — long-press the video and choose “Save to Files”. Video and audio are separate streams on YouTube, so high-quality video may have no sound.',
'quality.title': 'Quality', 'quality.auto': 'Auto', 'quality.audioOnly': 'Audio only',
'quality.autoNote': 'Auto — YouTube picks the best quality for your connection.',
'quality.suggests': 'Auto — YouTube picks the best quality for your connection. Your connection ({conn}) suggests around {sug}.',
'quality.note': 'Your choice is saved on this device and applied to every video and Short. HDR depends on the video and the device.',
'quality.locked': 'Quality locked to {label}.', 'quality.autoSet': 'Quality: Auto.',
'quality.audioNote': 'Audio only applies to downloads — playback stays on Auto.',
'quality.notAvailable': 'Not available for this video', 'quality.letDecide': 'Let YouTube decide', 'quality.noVideo': 'No video — for downloads',
'quality.subAuto': 'Auto · {q}', 'quality.sub1080': 'Full HD', 'quality.sub1440': '2K', 'quality.sub2160': '4K', 'quality.sub720': 'HD',
'shorts.title': 'Shorts', 'shorts.hint': 'Swipe up for the next video • Tap the video to mute / unmute',
'shorts.noShorts': 'No Shorts yet.', 'shorts.loading': 'Loading Shorts…',
'shorts.loadError': 'Could not load Shorts right now — check your connection and tap Refresh.',
'shorts.loadErrorToast': 'Could not load Shorts, try again later.', 'shorts.refreshToast': 'Loaded a fresh batch of Shorts.',
'shorts.muted': 'Shorts muted.', 'shorts.unmuted': 'Shorts unmuted — tap again to mute.',
'shorts.linkCopied': 'Shorts link copied.', 'shorts.comments': 'Comments', 'shorts.like': 'Like', 'shorts.dislike': 'Dislike',
'shorts.download': 'Download', 'shorts.share': 'Share',
'lyrics.looking': 'Looking for lyrics…', 'lyrics.notFound': 'No lyrics found for this track — try another one.',
'lyrics.plainOnly': 'This track only has plain lyrics (not synced to the music).',
'lyrics.tapHint': 'Tap a line to jump to that part.', 'lyrics.tryAgain': 'Try again',
'library.title': 'Library', 'library.history': 'History', 'library.likedVideos': 'Liked videos',
'library.subscriptions': 'Subscriptions', 'library.storage': 'Storage', 'library.clearCache': 'Clear cache',
'library.clearCacheNote': 'Clear cache removes history, preferences and seen Shorts from this app only. It does not delete files you saved in the Files app.',
'library.noHistory': 'No history yet.', 'library.noLiked': 'No liked videos yet.',
'library.noSubs': 'No subscriptions yet — tap Subscribe on any channel.', 'library.unsubscribe': 'Unsubscribe',
'library.checking': 'Checking storage…', 'library.storageUnavailable': 'Storage estimate is not available in this browser.',
'library.storageUsed': 'This app is using about {used} in the browser.',
'library.storageUsedQuota': 'This app is using about {used} of {quota} available in the browser.',
'saved.title': 'Saved', 'saved.downloads': 'Downloads', 'saved.videos': 'Videos', 'saved.music': 'Music',
'saved.savedVideos': 'Saved videos', 'saved.note': 'Videos you save show up here.',
'saved.nothingSaved': 'Nothing saved yet — tap Save on any video.', 'saved.noDownloads': 'No downloads yet.', 'saved.open': 'Open', 'saved.remove': 'Remove',
'settings.title': 'Settings', 'settings.appearance': 'Appearance', 'settings.playback': 'Playback',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': 'Data & Storage', 'settings.about': 'About',
'settings.language': 'Language', 'settings.languageSub': 'Interface language — follows your device when set to System',
'settings.system': 'System', 'settings.dark': 'Dark', 'settings.light': 'Light',
'settings.glass': 'Liquid Glass', 'settings.glassSub': 'Frosted, see-through surfaces with depth and blur',
'settings.theme': 'Theme mode', 'settings.themeSub': 'Choose how the app looks',
'settings.bgPlayback': 'Background playback', 'settings.bgPlaybackSub': 'Keep playing in the mini player when you leave the player',
'settings.autoplayNext': 'Autoplay next video', 'settings.autoplayNextSub': 'Play the next related video when this one ends',
'settings.playbackQuality': 'Playback quality', 'settings.playbackQualitySub': 'Current: {label} — saved on this device.',
'settings.storageUsage': 'Storage usage', 'settings.clearCache': 'Clear cache',
'settings.clearCacheSub': 'Removes history, preferences and seen Shorts — not your likes, saves, downloads or subscriptions',
'settings.version': 'Version', 'settings.versionSub': 'YTXTube iOS v2.2.0 — clean-room port of Android YTXTube v2.2.0 (GPL-3.0)',
'settings.accounts': 'Accounts', 'settings.accountsSub': 'No Google sign-in in this build — subscriptions are stored on this device only.',
'settings.sbSub': 'Automatically skip segments — community data from sponsor.ajay.app (CC BY-NC-SA 4.0)',
'settings.sbCatSub': 'Skip automatically',
'sb.sponsor': 'Sponsor', 'sb.intro': 'Intro', 'sb.outro': 'Outro and credits', 'sb.selfpromo': 'Self-promotion',
'sb.interaction': 'Like and subscribe reminder', 'sb.musicOfftopic': 'Non-music part of a music video',
'sb.skipped': 'Skipped {label} segment', 'sb.on': 'SponsorBlock on.', 'sb.off': 'SponsorBlock off.',
'toast.pipedBusy': 'Piped is busy — showing fallback videos.', 'toast.searchFailed': 'Search failed — check your connection and try again.',
'toast.linkCopied': 'Video link copied.', 'toast.likedAdded': 'Added to Liked videos.', 'toast.likedRemoved': 'Removed from Liked videos.',
'toast.savedAdded': 'Saved — find it in the Saved tab.', 'toast.savedRemoved': 'Removed from Saved.',
'toast.subscribed': 'Subscribed to {name}.', 'toast.unsubscribed': 'Unsubscribed from {name}.',
'toast.cacheCleared': 'Cache cleared — history, preferences and seen Shorts were removed.',
'toast.glassOn': 'Liquid Glass on.', 'toast.glassOff': 'Liquid Glass off — using solid surfaces.',
'toast.bgOn': 'Background playback on.', 'toast.bgOff': 'Background playback off — leaving the player stops it.',
'toast.shuffleOn': 'Shuffle on.', 'toast.shuffleOff': 'Shuffle off.', 'toast.repeatOn': 'Repeat on.', 'toast.repeatOff': 'Repeat off.',
'toast.openFirst': 'Open a video first.', 'toast.downloadRemoved': 'Download removed from the list.',
'status.noVideos': 'No videos found.', 'status.noMore': 'No more videos — try another filter.',
'status.noSubsYet': 'You have no subscriptions yet — tap Subscribe on any channel.',
'status.noRecentSubs': 'No recent videos from your subscriptions.', 'status.loadingSubs': 'Loading videos from your subscriptions…',
'status.searching': 'Searching for “{q}”…', 'status.loadingTrending': 'Loading trending…',
'status.loadingChannel': 'Loading channel videos…', 'status.noVideosChannel': 'No videos found for {name}.',
},
vi: {
'common.views': 'lượt xem', 'common.likes': 'lượt thích', 'common.subscribers': 'người đăng ký', 'common.channel': 'Kênh',
'common.today': 'Hôm nay', 'common.dayAgo': '1 ngày trước', 'common.daysAgo': '{n} ngày trước', 'common.monthsAgo': '{n} tháng trước', 'common.yearsAgo': '{n} năm trước',
'common.change': 'Đổi', 'common.search': 'Tìm kiếm', 'common.library': 'Thư viện', 'common.settings': 'Cài đặt',
'common.moreOptions': 'Thêm tùy chọn sẽ có ở bước sau.', 'common.tryAgain': 'Thử lại', 'common.loading': 'Đang tải…',
'nav.home': 'Trang chủ', 'nav.music': 'Nhạc', 'nav.shorts': 'Shorts', 'nav.library': 'Thư viện', 'nav.saved': 'Đã lưu',
'search.placeholder': 'Tìm video, kênh…',
'chip.all': 'Tất cả', 'chip.today': 'Hôm nay', 'chip.videos': 'Video', 'chip.subscribed': 'Đã đăng ký', 'chip.live': 'Trực tiếp',
'music.search.placeholder': 'Tìm bài hát, nghệ sĩ…',
'music.chip.forYou': 'Dành cho bạn', 'music.chip.vietnamese': 'Nhạc Việt', 'music.chip.usUk': 'US-UK', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': 'Remix',
'music.nowPlaying': 'Đang phát', 'music.hqAudio': 'ÂM THANH CHẤT LƯỢNG CAO · 256 KBPS AAC', 'music.lyrics': '🎵 Lời bài hát', 'music.queue': '🎶 Hàng đợi',
'music.recent': 'Nghe gần đây', 'music.likedTracks': 'Bài hát đã thích', 'music.browse': 'Khám phá',
'music.noRecent': 'Chưa có nhạc nghe gần đây.', 'music.noLiked': 'Chưa có bài hát đã thích — chạm ♥ ở bài hát bất kỳ.',
'music.noSongs': 'Không tìm thấy bài hát — thử tìm khác.', 'music.loading': 'Đang tải nhạc…',
'music.queueToast': 'Hàng đợi: {n} bài — đang phát bài #{i}.', 'music.endQueue': 'Đã hết hàng đợi.', 'music.nothingNext': 'Không còn gì để phát tiếp.',
'music.loadError': 'Không tải được nhạc — kiểm tra mạng rồi thử lại.',
'watch.back': '← Quay lại', 'watch.subscribe': 'Đăng ký', 'watch.subscribed': 'Đã đăng ký ✓',
'watch.save': '🔖 Lưu', 'watch.saved': '🔖 Đã lưu', 'watch.download': '⬇ Tải xuống', 'watch.quality': 'Chất lượng', 'watch.share': '↗ Chia sẻ',
'watch.lyrics': '🎵 Lời bài hát', 'watch.hideLyrics': '🎵 Ẩn lời bài hát', 'watch.comments': 'Bình luận', 'watch.commentsFab': '💬 Bình luận',
'watch.moreVideos': 'Video khác', 'watch.more': '...xem thêm', 'watch.less': '...thu gọn',
'watch.loading': 'Đang tải…', 'watch.loadError': 'Không tải được thông tin video, nhưng trình phát vẫn đang chạy.',
'watch.noComments': 'Chưa có bình luận.', 'watch.commentsError': 'Không tải được bình luận lúc này.',
'watch.noRelated': 'Không có video liên quan.', 'watch.loadingComments': 'Đang tải bình luận…',
'download.title': 'Tải video', 'download.gettingLinks': 'Đang lấy link tải…',
'download.noStreams': 'Video này không có luồng tải được — có thể bị giới hạn độ tuổi hoặc đang phát trực tiếp.',
'download.noLinks': 'Không lấy được link tải — kiểm tra mạng rồi thử lại.',
'download.noLinksBlocked': 'Không lấy được link tải — YouTube đang chặn máy chủ này. Thử lại sau.',
'download.openedNote': 'Đã mở trong tab mới — <b>nhấn giữ video rồi chọn “Lưu vào Tệp”</b> (hoặc “Lưu vào Ảnh” với MP4). Xem lại trong Đã lưu → Tải xuống.',
'download.go': '⬇ Tải xuống', 'download.copyLink': 'Sao chép link', 'download.retry': 'Thử lại',
'download.videoAudio': 'video + âm thanh', 'download.videoOnly': 'chỉ video (không tiếng)',
'download.sizeUnknown': 'Không rõ dung lượng', 'download.openedStatus': 'Đã mở trong Safari — lưu từ đó',
'download.noDownloads': 'Chưa có lượt tải nào — chạm Tải xuống ở video bất kỳ.',
'download.noVideoDownloads': 'Chưa có video đã tải.', 'download.noMusicDownloads': 'Chưa có nhạc đã tải.',
'download.opened': 'Đã mở bản tải — lưu lại từ tab mới.', 'download.linkCopied': 'Đã sao chép link tải.',
'download.iosNote': 'Trên iOS, file sẽ mở trong tab mới — nhấn giữ video rồi chọn “Lưu vào Tệp”. Video và âm thanh là luồng riêng trên YouTube nên video chất lượng cao có thể không có tiếng.',
'quality.title': 'Chất lượng', 'quality.auto': 'Tự động', 'quality.audioOnly': 'Chỉ âm thanh',
'quality.autoNote': 'Tự động — YouTube tự chọn chất lượng tốt nhất cho mạng của bạn.',
'quality.suggests': 'Tự động — YouTube tự chọn chất lượng tốt nhất cho mạng của bạn. Mạng của bạn ({conn}) gợi ý khoảng {sug}.',
'quality.note': 'Lựa chọn của bạn được lưu trên máy này và áp cho mọi video và Short. HDR tùy thuộc vào video và thiết bị.',
'quality.locked': 'Đã khóa chất lượng ở {label}.', 'quality.autoSet': 'Chất lượng: Tự động.',
'quality.audioNote': 'Chỉ âm thanh chỉ áp cho tải xuống — phát vẫn ở chế độ Tự động.',
'quality.notAvailable': 'Không có cho video này', 'quality.letDecide': 'Để YouTube tự quyết', 'quality.noVideo': 'Không có video — chỉ để tải',
'quality.subAuto': 'Tự động · {q}', 'quality.sub1080': 'Full HD', 'quality.sub1440': '2K', 'quality.sub2160': '4K', 'quality.sub720': 'HD',
'shorts.title': 'Shorts', 'shorts.hint': 'Vuốt lên để xem video tiếp theo • Chạm vào video để bật / tắt tiếng',
'shorts.noShorts': 'Chưa có Shorts.', 'shorts.loading': 'Đang tải Shorts…',
'shorts.loadError': 'Không tải được Shorts lúc này — kiểm tra mạng rồi chạm Làm mới.',
'shorts.loadErrorToast': 'Không tải được Shorts, thử lại sau.', 'shorts.refreshToast': 'Đã tải loạt Shorts mới.',
'shorts.muted': 'Đã tắt tiếng Shorts.', 'shorts.unmuted': 'Đã bật tiếng Shorts — chạm lại để tắt tiếng.',
'shorts.linkCopied': 'Đã sao chép link Shorts.', 'shorts.comments': 'Bình luận', 'shorts.like': 'Thích', 'shorts.dislike': 'Không thích',
'shorts.download': 'Tải xuống', 'shorts.share': 'Chia sẻ',
'lyrics.looking': 'Đang tìm lời bài hát…', 'lyrics.notFound': 'Không tìm thấy lời cho bài này — thử bài khác.',
'lyrics.plainOnly': 'Bài này chỉ có lời thường (không đồng bộ với nhạc).',
'lyrics.tapHint': 'Chạm vào một câu để nhảy tới đoạn đó.', 'lyrics.tryAgain': 'Thử lại',
'library.title': 'Thư viện', 'library.history': 'Lịch sử', 'library.likedVideos': 'Video đã thích',
'library.subscriptions': 'Kênh đã đăng ký', 'library.storage': 'Dung lượng', 'library.clearCache': 'Xóa bộ nhớ đệm',
'library.clearCacheNote': 'Xóa bộ nhớ đệm chỉ xóa lịch sử, tùy chọn và Shorts đã xem trong app này. Không xóa file bạn đã lưu trong app Tệp.',
'library.noHistory': 'Chưa có lịch sử.', 'library.noLiked': 'Chưa có video đã thích.',
'library.noSubs': 'Chưa đăng ký kênh nào — chạm Đăng ký ở kênh bất kỳ.', 'library.unsubscribe': 'Hủy đăng ký',
'library.checking': 'Đang kiểm tra dung lượng…', 'library.storageUnavailable': 'Trình duyệt này không hỗ trợ ước tính dung lượng.',
'library.storageUsed': 'App này đang dùng khoảng {used} trong trình duyệt.',
'library.storageUsedQuota': 'App này đang dùng khoảng {used} trên {quota} có sẵn trong trình duyệt.',
'saved.title': 'Đã lưu', 'saved.downloads': 'Tải xuống', 'saved.videos': 'Video', 'saved.music': 'Nhạc',
'saved.savedVideos': 'Video đã lưu', 'saved.note': 'Video bạn lưu sẽ hiện ở đây.',
'saved.nothingSaved': 'Chưa lưu gì — chạm Lưu ở video bất kỳ.', 'saved.noDownloads': 'Chưa có lượt tải nào.', 'saved.open': 'Mở', 'saved.remove': 'Xóa',
'settings.title': 'Cài đặt', 'settings.appearance': 'Giao diện', 'settings.playback': 'Phát lại',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': 'Dữ liệu & Dung lượng', 'settings.about': 'Giới thiệu',
'settings.language': 'Ngôn ngữ', 'settings.languageSub': 'Ngôn ngữ giao diện — chọn Hệ thống để theo ngôn ngữ của máy',
'settings.system': 'Hệ thống', 'settings.dark': 'Tối', 'settings.light': 'Sáng',
'settings.glass': 'Kính lỏng (Liquid Glass)', 'settings.glassSub': 'Bề mặt mờ trong suốt, có chiều sâu và hiệu ứng mờ',
'settings.theme': 'Chế độ giao diện', 'settings.themeSub': 'Chọn cách app hiển thị',
'settings.bgPlayback': 'Phát trong nền', 'settings.bgPlaybackSub': 'Tiếp tục phát trong trình phát mini khi rời khỏi trình phát',
'settings.autoplayNext': 'Tự phát video tiếp theo', 'settings.autoplayNextSub': 'Phát video liên quan tiếp theo khi video này kết thúc',
'settings.playbackQuality': 'Chất lượng phát', 'settings.playbackQualitySub': 'Hiện tại: {label} — đã lưu trên máy này.',
'settings.storageUsage': 'Dung lượng đã dùng', 'settings.clearCache': 'Xóa bộ nhớ đệm',
'settings.clearCacheSub': 'Xóa lịch sử, tùy chọn và Shorts đã xem — không xóa lượt thích, video đã lưu, lượt tải hay kênh đã đăng ký',
'settings.version': 'Phiên bản', 'settings.versionSub': 'YTXTube iOS v2.2.0 — bản port clean-room từ YTXTube Android v2.2.0 (GPL-3.0)',
'settings.accounts': 'Tài khoản', 'settings.accountsSub': 'Bản này không có đăng nhập Google — kênh đăng ký chỉ lưu trên máy này.',
'settings.sbSub': 'Tự động bỏ qua đoạn — dữ liệu cộng đồng từ sponsor.ajay.app (CC BY-NC-SA 4.0)',
'settings.sbCatSub': 'Tự động bỏ qua',
'sb.sponsor': 'Quảng cáo tài trợ', 'sb.intro': 'Mở đầu', 'sb.outro': 'Kết thúc và credit', 'sb.selfpromo': 'Tự quảng cáo',
'sb.interaction': 'Nhắc thích và đăng ký', 'sb.musicOfftopic': 'Đoạn không phải nhạc trong video nhạc',
'sb.skipped': 'Đã bỏ qua đoạn {label}', 'sb.on': 'Đã bật SponsorBlock.', 'sb.off': 'Đã tắt SponsorBlock.',
'toast.pipedBusy': 'Piped đang bận — đang hiện video dự phòng.', 'toast.searchFailed': 'Tìm kiếm thất bại — kiểm tra mạng rồi thử lại.',
'toast.linkCopied': 'Đã sao chép link video.', 'toast.likedAdded': 'Đã thêm vào Video đã thích.', 'toast.likedRemoved': 'Đã xóa khỏi Video đã thích.',
'toast.savedAdded': 'Đã lưu — xem trong tab Đã lưu.', 'toast.savedRemoved': 'Đã xóa khỏi Đã lưu.',
'toast.subscribed': 'Đã đăng ký {name}.', 'toast.unsubscribed': 'Đã hủy đăng ký {name}.',
'toast.cacheCleared': 'Đã xóa bộ nhớ đệm — lịch sử, tùy chọn và Shorts đã xem đã bị xóa.',
'toast.glassOn': 'Đã bật Kính lỏng.', 'toast.glassOff': 'Đã tắt Kính lỏng — dùng bề mặt đặc.',
'toast.bgOn': 'Đã bật phát trong nền.', 'toast.bgOff': 'Đã tắt phát trong nền — rời khỏi trình phát sẽ dừng hẳn.',
'toast.shuffleOn': 'Đã bật phát ngẫu nhiên.', 'toast.shuffleOff': 'Đã tắt phát ngẫu nhiên.', 'toast.repeatOn': 'Đã bật lặp lại.', 'toast.repeatOff': 'Đã tắt lặp lại.',
'toast.openFirst': 'Mở một video trước đã.', 'toast.downloadRemoved': 'Đã xóa lượt tải khỏi danh sách.',
'status.noVideos': 'Không tìm thấy video.', 'status.noMore': 'Hết video — thử bộ lọc khác.',
'status.noSubsYet': 'Chưa đăng ký kênh nào — chạm Đăng ký ở kênh bất kỳ.',
'status.noRecentSubs': 'Không có video mới từ kênh đã đăng ký.', 'status.loadingSubs': 'Đang tải video từ kênh đã đăng ký…',
'status.searching': 'Đang tìm “{q}”…', 'status.loadingTrending': 'Đang tải video thịnh hành…',
'status.loadingChannel': 'Đang tải video của kênh…', 'status.noVideosChannel': 'Không tìm thấy video của {name}.',
},
};
// Primary UI strings only for es/zh/ja/ko — every other key falls back to English.
I18N.es = {
'toast.subscribed': 'Te suscribiste a {name}.',
'toast.unsubscribed': 'Cancelaste la suscripción a {name}.',
'sb.skipped': 'Segmento {label} omitido',
'sb.on': 'SponsorBlock activado.',
'sb.off': 'SponsorBlock desactivado.',
'quality.locked': 'Calidad fijada en {label}.',
'quality.autoSet': 'Calidad: Automática.',
'toast.openFirst': 'Abre un video primero.',
'shorts.refreshToast': 'Se cargó una nueva tanda de Shorts.',
'shorts.loadErrorToast': 'No se pudieron cargar los Shorts, inténtalo más tarde.',
'music.endQueue': 'Fin de la cola.',
'music.nothingNext': 'No hay nada más que reproducir.',
'watch.loadError': 'No se pudo cargar la información del video, pero el reproductor sigue funcionando.',
'watch.noRelated': 'No hay videos relacionados.',
'watch.commentsError': 'No se pudieron cargar los comentarios ahora mismo.',
'status.noSubsYet': 'Aún no tienes suscripciones — toca Suscribirse en cualquier canal.',
'status.noRecentSubs': 'No hay videos recientes de tus suscripciones.',
'status.searching': 'Buscando “{q}”…',
'status.loadingSubs': 'Cargando videos de tus suscripciones…',
'status.loadingChannel': 'Cargando videos del canal…',
'status.noVideosChannel': 'No se encontraron videos de {name}.',
'download.opened': 'Descarga abierta — guárdala desde la nueva pestaña.',
'download.linkCopied': 'Enlace de descarga copiado.',
'toast.cacheCleared': 'Caché borrada — se eliminaron el historial, las preferencias y los Shorts vistos.',
'toast.glassOn': 'Liquid Glass activado.',
'toast.glassOff': 'Liquid Glass desactivado — usando superficies sólidas.',
'toast.bgOn': 'Reproducción en segundo plano activada.',
'toast.bgOff': 'Reproducción en segundo plano desactivada — al salir del reproductor se detiene.',
'toast.shuffleOn': 'Aleatorio activado.',
'toast.shuffleOff': 'Aleatorio desactivado.',
'toast.repeatOn': 'Repetición activada.',
'toast.repeatOff': 'Repetición desactivada.',
'toast.downloadRemoved': 'Descarga eliminada de la lista.',
'common.moreOptions': 'Más opciones en un paso posterior.',
'common.tryAgain': 'Reintentar',
'common.loading': 'Cargando…',
'lyrics.plainOnly': 'Esta canción solo tiene letra sin sincronizar (no sigue la música).',
'settings.sbSub': 'Omitir segmentos automáticamente — datos de la comunidad de sponsor.ajay.app (CC BY-NC-SA 4.0)',
'settings.sbCatSub': 'Omitir automáticamente',
'quality.audioNote': 'Solo audio se aplica a las descargas — la reproducción sigue en Automática.',
'quality.letDecide': 'Dejar que YouTube decida',
'quality.noVideo': 'Sin video — solo para descargas',
'quality.notAvailable': 'No disponible para este video',
'settings.playbackQualitySub': 'Actual: {label} — guardado en este dispositivo.',
'settings.clearCacheSub': 'Elimina el historial, las preferencias y los Shorts vistos — no tus me gusta, guardados, descargas ni suscripciones',
'settings.versionSub': 'YTXTube iOS v2.2.0 — port clean-room de YTXTube Android v2.2.0 (GPL-3.0)',
'library.clearCacheNote': 'Borrar la caché elimina el historial, las preferencias y los Shorts vistos solo en esta app. No elimina los archivos que guardaste en la app Archivos.',
'library.storageUnavailable': 'La estimación de almacenamiento no está disponible en este navegador.',
'library.storageUsed': 'Esta app usa unos {used} en el navegador.',
'library.storageUsedQuota': 'Esta app usa unos {used} de {quota} disponibles en el navegador.',
'download.iosNote': 'En iOS el archivo se abre en una pestaña nueva — mantén pulsado el video y elige “Guardar en Archivos”. El video y el audio son flujos separados en YouTube, así que el video de alta calidad puede no tener sonido.',
'download.noLinks': 'No se pudieron obtener los enlaces de descarga — revisa tu conexión e inténtalo de nuevo.',
'download.noLinksBlocked': 'No se pudieron obtener los enlaces de descarga — YouTube está bloqueando este servidor ahora mismo. Inténtalo más tarde.',
'download.noStreams': 'No hay flujos descargables para este video — puede tener restricción de edad o ser un directo.',
'download.openedNote': 'Se abrió en una pestaña nueva — <b>mantén pulsado el video y elige “Guardar en Archivos”</b> (o “Guardar en Fotos” para MP4). Encuéntralo luego en Guardados → Descargas.',
'download.openedStatus': 'Abierto en Safari — guárdalo desde ahí',
'download.noDownloads': 'Aún no hay descargas — toca Descargar en cualquier video.',
'download.noVideoDownloads': 'Aún no hay descargas de video.',
'download.noMusicDownloads': 'Aún no hay descargas de música.',
'music.queueToast': 'Cola: {n} pista{s} — reproduciendo la n.º {i}.',
'music.loadError': 'No se pudo cargar la música — revisa tu conexión e inténtalo de nuevo.',
'music.hqAudio': 'AUDIO HQ · 256 KBPS AAC',
'quality.autoNote': 'Automática — YouTube elige la mejor calidad para tu conexión.',
'quality.suggests': 'Automática — YouTube elige la mejor calidad para tu conexión. Tu conexión ({conn}) sugiere alrededor de {sug}.',
'quality.subAuto': 'Automática · {q}',
'quality.sub1080': 'Full HD',
'quality.sub1440': '2K',
'quality.sub2160': '4K',
'quality.sub720': 'HD',
'saved.noDownloads': 'Aún no hay descargas.',
'shorts.loadError': 'No se pudieron cargar los Shorts ahora mismo — revisa tu conexión y toca Actualizar.',
'toast.pipedBusy': 'Piped está ocupado — mostrando videos de reserva.',

'common.views': 'vistas', 'common.likes': 'me gusta', 'common.subscribers': 'suscriptores', 'common.channel': 'Canal',
'common.today': 'Hoy', 'common.dayAgo': 'hace 1 día', 'common.daysAgo': 'hace {n} días', 'common.monthsAgo': 'hace {n} meses', 'common.yearsAgo': 'hace {n} años',
'common.change': 'Cambiar', 'common.search': 'Buscar', 'common.library': 'Biblioteca', 'common.settings': 'Ajustes',
'nav.home': 'Inicio', 'nav.music': 'Música', 'nav.shorts': 'Shorts', 'nav.library': 'Biblioteca', 'nav.saved': 'Guardados',
'search.placeholder': 'Buscar videos, canales…',
'chip.all': 'Todo', 'chip.today': 'Hoy', 'chip.videos': 'Videos', 'chip.subscribed': 'Suscripciones', 'chip.live': 'En vivo',
'music.search.placeholder': 'Buscar canciones, artistas…',
'music.chip.forYou': 'Para ti', 'music.chip.vietnamese': 'Vietnamita', 'music.chip.usUk': 'EE. UU. y Reino Unido', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': 'Remix',
'music.nowPlaying': 'Reproduciendo', 'music.lyrics': '🎵 Letra', 'music.queue': '🎶 Cola',
'music.recent': 'Reproducido recientemente', 'music.likedTracks': 'Canciones que te gustan', 'music.browse': 'Explorar',
'music.noRecent': 'Aún no hay música reciente.', 'music.noLiked': 'Aún no hay canciones que te gusten — toca ♥ en cualquier canción.',
'music.noSongs': 'No se encontraron canciones — prueba otra búsqueda.', 'music.loading': 'Cargando música…',
'watch.back': '← Atrás', 'watch.subscribe': 'Suscribirse', 'watch.subscribed': 'Suscrito ✓',
'watch.save': '🔖 Guardar', 'watch.saved': '🔖 Guardado', 'watch.download': '⬇ Descargar', 'watch.quality': 'Calidad', 'watch.share': '↗ Compartir',
'watch.lyrics': '🎵 Letra', 'watch.hideLyrics': '🎵 Ocultar letra', 'watch.comments': 'Comentarios', 'watch.commentsFab': '💬 Comentarios',
'watch.moreVideos': 'Más videos', 'watch.more': '...más', 'watch.less': '...menos',
'watch.loading': 'Cargando…', 'watch.noComments': 'Aún no hay comentarios.', 'watch.loadingComments': 'Cargando comentarios…',
'download.title': 'Descargar video', 'download.gettingLinks': 'Obteniendo enlaces de descarga…',
'download.go': '⬇ Descargar', 'download.copyLink': 'Copiar enlace', 'download.retry': 'Reintentar',
'download.videoAudio': 'video + audio', 'download.videoOnly': 'solo video (sin sonido)',
'download.sizeUnknown': 'Tamaño desconocido',
'quality.title': 'Calidad', 'quality.auto': 'Automática', 'quality.audioOnly': 'Solo audio',
'quality.note': 'Tu elección se guarda en este dispositivo y se aplica a todos los videos y Shorts. El HDR depende del video y del dispositivo.',
'shorts.title': 'Shorts', 'shorts.hint': 'Desliza hacia arriba para el siguiente video • Toca el video para silenciar / activar el sonido',
'shorts.noShorts': 'Aún no hay Shorts.', 'shorts.loading': 'Cargando Shorts…',
'shorts.muted': 'Shorts silenciados.', 'shorts.unmuted': 'Sonido de Shorts activado — toca de nuevo para silenciar.',
'shorts.linkCopied': 'Enlace de Shorts copiado.', 'shorts.comments': 'Comentarios', 'shorts.like': 'Me gusta', 'shorts.dislike': 'No me gusta',
'shorts.download': 'Descargar', 'shorts.share': 'Compartir',
'lyrics.looking': 'Buscando la letra…', 'lyrics.notFound': 'No se encontró la letra de esta canción — prueba otra.',
'lyrics.tapHint': 'Toca una línea para saltar a esa parte.', 'lyrics.tryAgain': 'Reintentar',
'library.title': 'Biblioteca', 'library.history': 'Historial', 'library.likedVideos': 'Videos que te gustan',
'library.subscriptions': 'Suscripciones', 'library.storage': 'Almacenamiento', 'library.clearCache': 'Borrar caché',
'library.noHistory': 'Aún no hay historial.', 'library.noLiked': 'Aún no hay videos que te gusten.',
'library.noSubs': 'Aún no tienes suscripciones — toca Suscribirse en cualquier canal.', 'library.unsubscribe': 'Cancelar suscripción',
'library.checking': 'Comprobando almacenamiento…',
'saved.title': 'Guardados', 'saved.downloads': 'Descargas', 'saved.videos': 'Videos', 'saved.music': 'Música',
'saved.savedVideos': 'Videos guardados', 'saved.note': 'Los videos que guardes aparecen aquí.',
'saved.nothingSaved': 'Nada guardado aún — toca Guardar en cualquier video.', 'saved.open': 'Abrir', 'saved.remove': 'Eliminar',
'settings.title': 'Ajustes', 'settings.appearance': 'Apariencia', 'settings.playback': 'Reproducción',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': 'Datos y almacenamiento', 'settings.about': 'Acerca de',
'settings.language': 'Idioma', 'settings.languageSub': 'Idioma de la interfaz — sigue el del dispositivo con Sistema',
'settings.system': 'Sistema', 'settings.dark': 'Oscuro', 'settings.light': 'Claro',
'settings.glass': 'Liquid Glass', 'settings.glassSub': 'Superficies translúcidas con profundidad y desenfoque',
'settings.theme': 'Tema', 'settings.themeSub': 'Elige el aspecto de la app',
'settings.bgPlayback': 'Reproducción en segundo plano', 'settings.bgPlaybackSub': 'Sigue sonando en el mini reproductor al salir del reproductor',
'settings.autoplayNext': 'Reproducir el siguiente video', 'settings.autoplayNextSub': 'Reproduce el siguiente video relacionado cuando este termine',
'settings.playbackQuality': 'Calidad de reproducción', 'settings.storageUsage': 'Uso de almacenamiento', 'settings.clearCache': 'Borrar caché',
'settings.version': 'Versión', 'settings.accounts': 'Cuentas',
'settings.accountsSub': 'No hay inicio de sesión con Google en esta versión — las suscripciones se guardan solo en este dispositivo.',
'sb.sponsor': 'Patrocinador', 'sb.intro': 'Introducción', 'sb.outro': 'Créditos finales', 'sb.selfpromo': 'Autopromoción',
'sb.interaction': 'Recordatorio de me gusta y suscripción', 'sb.musicOfftopic': 'Parte sin música de un video musical',
'toast.searchFailed': 'La búsqueda falló — revisa tu conexión e inténtalo de nuevo.',
'toast.linkCopied': 'Enlace del video copiado.', 'toast.likedAdded': 'Añadido a videos que te gustan.', 'toast.likedRemoved': 'Eliminado de videos que te gustan.',
'toast.savedAdded': 'Guardado — encuéntralo en la pestaña Guardados.', 'toast.savedRemoved': 'Eliminado de Guardados.',
'status.noVideos': 'No se encontraron videos.', 'status.noMore': 'No hay más videos — prueba otro filtro.',
'status.loadingTrending': 'Cargando tendencias…',
};
I18N.zh = {
'toast.subscribed': '已订阅 {name}。',
'toast.unsubscribed': '已取消订阅 {name}。',
'sb.skipped': '已跳过{label}片段',
'sb.on': 'SponsorBlock 已开启。',
'sb.off': 'SponsorBlock 已关闭。',
'quality.locked': '画质已锁定为 {label}。',
'quality.autoSet': '画质：自动。',
'toast.openFirst': '请先打开一个视频。',
'shorts.refreshToast': '已加载一批新的短视频。',
'shorts.loadErrorToast': '短视频加载失败，请稍后再试。',
'music.endQueue': '队列已结束。',
'music.nothingNext': '没有下一个可播放的内容。',
'watch.loadError': '无法加载视频信息，但播放器仍在运行。',
'watch.noRelated': '没有相关视频。',
'watch.commentsError': '暂时无法加载评论。',
'status.noSubsYet': '暂无订阅——点任意频道的“订阅”。',
'status.noRecentSubs': '订阅频道暂无新视频。',
'status.searching': '正在搜索“{q}”…',
'status.loadingSubs': '正在加载订阅频道的视频…',
'status.loadingChannel': '正在加载频道视频…',
'status.noVideosChannel': '未找到 {name} 的视频。',
'download.opened': '下载已打开——请在新标签页中保存。',
'download.linkCopied': '下载链接已复制。',
'toast.cacheCleared': '缓存已清除——历史记录、偏好设置和已看过的短视频已被删除。',
'toast.glassOn': 'Liquid Glass 已开启。',
'toast.glassOff': 'Liquid Glass 已关闭——使用实色表面。',
'toast.bgOn': '后台播放已开启。',
'toast.bgOff': '后台播放已关闭——离开播放器将停止播放。',
'toast.shuffleOn': '随机播放已开启。',
'toast.shuffleOff': '随机播放已关闭。',
'toast.repeatOn': '循环播放已开启。',
'toast.repeatOff': '循环播放已关闭。',
'toast.downloadRemoved': '已从列表中删除该下载。',
'common.moreOptions': '更多选项将在后续步骤中提供。',
'common.tryAgain': '重试',
'common.loading': '加载中…',
'lyrics.plainOnly': '这首歌只有普通歌词（未与音乐同步）。',
'settings.sbSub': '自动跳过片段——来自 sponsor.ajay.app 的社区数据（CC BY-NC-SA 4.0）',
'settings.sbCatSub': '自动跳过',
'quality.audioNote': '仅音频仅适用于下载——播放仍为自动。',
'quality.letDecide': '由 YouTube 决定',
'quality.noVideo': '无视频——仅用于下载',
'quality.notAvailable': '此视频不可用',
'settings.playbackQualitySub': '当前：{label}——已保存在此设备上。',
'settings.clearCacheSub': '清除历史记录、偏好设置和已看过的短视频——不会清除点赞、保存、下载或订阅',
'settings.versionSub': 'YTXTube iOS v2.2.0——Android YTXTube v2.2.0 的 clean-room 移植版（GPL-3.0）',
'library.clearCacheNote': '清除缓存仅删除此应用中的历史记录、偏好设置和已看过的短视频，不会删除你保存在“文件”应用中的文件。',
'library.storageUnavailable': '此浏览器不支持存储空间估算。',
'library.storageUsed': '此应用在浏览器中约占用 {used}。',
'library.storageUsedQuota': '此应用在浏览器中约占用 {used}，可用空间为 {quota}。',
'download.iosNote': '在 iOS 上，文件会在新标签页中打开——长按视频并选择“存储到文件”。视频和音频在 YouTube 上是分开的流，因此高画质视频可能没有声音。',
'download.noLinks': '无法获取下载链接——请检查网络后重试。',
'download.noLinksBlocked': '无法获取下载链接——YouTube 目前正在屏蔽此服务器，请稍后再试。',
'download.noStreams': '此视频没有可下载的流——可能有年龄限制或正在直播。',
'download.openedNote': '已在新标签页中打开——<b>长按视频并选择“存储到文件”</b>（MP4 可选择“存储到照片”）。稍后可在“已保存 → 下载”中找到。',
'download.openedStatus': '已在 Safari 中打开——请在那里保存',
'download.noDownloads': '暂无下载——点任意视频上的“下载”。',
'download.noVideoDownloads': '暂无视频下载。',
'download.noMusicDownloads': '暂无音乐下载。',
'music.queueToast': '队列：共 {n} 首——正在播放第 {i} 首。',
'music.loadError': '无法加载音乐——请检查网络后重试。',
'music.hqAudio': '高品质音频 · 256 KBPS AAC',
'quality.autoNote': '自动——YouTube 会为你的网络选择最佳画质。',
'quality.suggests': '自动——YouTube 会为你的网络选择最佳画质。你的网络（{conn}）建议约为 {sug}。',
'quality.subAuto': '自动 · {q}',
'quality.sub1080': '全高清',
'quality.sub1440': '2K',
'quality.sub2160': '4K',
'quality.sub720': '高清',
'saved.noDownloads': '暂无下载。',
'shorts.loadError': '暂时无法加载短视频——请检查网络并点按刷新。',
'toast.pipedBusy': 'Piped 繁忙——正在显示备用视频。',

'common.views': '次观看', 'common.likes': '个赞', 'common.subscribers': '位订阅者', 'common.channel': '频道',
'common.today': '今天', 'common.dayAgo': '1天前', 'common.daysAgo': '{n}天前', 'common.monthsAgo': '{n}个月前', 'common.yearsAgo': '{n}年前',
'common.change': '更改', 'common.search': '搜索', 'common.library': '资料库', 'common.settings': '设置',
'nav.home': '首页', 'nav.music': '音乐', 'nav.shorts': '短视频', 'nav.library': '资料库', 'nav.saved': '已保存',
'search.placeholder': '搜索视频、频道…',
'chip.all': '全部', 'chip.today': '今天', 'chip.videos': '视频', 'chip.subscribed': '已订阅', 'chip.live': '直播',
'music.search.placeholder': '搜索歌曲、歌手…',
'music.chip.forYou': '为你推荐', 'music.chip.vietnamese': '越南音乐', 'music.chip.usUk': '欧美音乐', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': '混音',
'music.nowPlaying': '正在播放', 'music.lyrics': '🎵 歌词', 'music.queue': '🎶 播放队列',
'music.recent': '最近播放', 'music.likedTracks': '喜欢的歌曲', 'music.browse': '浏览',
'music.noRecent': '暂无最近播放的音乐。', 'music.noLiked': '暂无喜欢的歌曲——点任意歌曲上的 ♥。',
'music.noSongs': '未找到歌曲——换个关键词试试。', 'music.loading': '正在加载音乐…',
'watch.back': '← 返回', 'watch.subscribe': '订阅', 'watch.subscribed': '已订阅 ✓',
'watch.save': '🔖 保存', 'watch.saved': '🔖 已保存', 'watch.download': '⬇ 下载', 'watch.quality': '画质', 'watch.share': '↗ 分享',
'watch.lyrics': '🎵 歌词', 'watch.hideLyrics': '🎵 隐藏歌词', 'watch.comments': '评论', 'watch.commentsFab': '💬 评论',
'watch.moreVideos': '更多视频', 'watch.more': '...更多', 'watch.less': '...收起',
'watch.loading': '加载中…', 'watch.noComments': '暂无评论。', 'watch.loadingComments': '正在加载评论…',
'download.title': '下载视频', 'download.gettingLinks': '正在获取下载链接…',
'download.go': '⬇ 下载', 'download.copyLink': '复制链接', 'download.retry': '重试',
'download.videoAudio': '视频 + 音频', 'download.videoOnly': '仅视频（无声音）',
'download.sizeUnknown': '大小未知',
'quality.title': '画质', 'quality.auto': '自动', 'quality.audioOnly': '仅音频',
'quality.note': '你的选择将保存在此设备上，并应用于所有视频和短视频。HDR 取决于视频和设备。',
'shorts.title': '短视频', 'shorts.hint': '上滑观看下一个视频 • 点按视频可静音 / 取消静音',
'shorts.noShorts': '暂无短视频。', 'shorts.loading': '正在加载短视频…',
'shorts.muted': '短视频已静音。', 'shorts.unmuted': '短视频已取消静音——再点一次可静音。',
'shorts.linkCopied': '短视频链接已复制。', 'shorts.comments': '评论', 'shorts.like': '喜欢', 'shorts.dislike': '不喜欢',
'shorts.download': '下载', 'shorts.share': '分享',
'lyrics.looking': '正在查找歌词…', 'lyrics.notFound': '未找到这首歌的歌词——换一首试试。',
'lyrics.tapHint': '点按某一行可跳转到对应位置。', 'lyrics.tryAgain': '重试',
'library.title': '资料库', 'library.history': '历史记录', 'library.likedVideos': '喜欢的视频',
'library.subscriptions': '订阅', 'library.storage': '存储空间', 'library.clearCache': '清除缓存',
'library.noHistory': '暂无历史记录。', 'library.noLiked': '暂无喜欢的视频。',
'library.noSubs': '暂无订阅——点任意频道的“订阅”。', 'library.unsubscribe': '取消订阅',
'library.checking': '正在检查存储空间…',
'saved.title': '已保存', 'saved.downloads': '下载', 'saved.videos': '视频', 'saved.music': '音乐',
'saved.savedVideos': '已保存的视频', 'saved.note': '你保存的视频会出现在这里。',
'saved.nothingSaved': '暂无保存内容——点任意视频上的“保存”。', 'saved.open': '打开', 'saved.remove': '删除',
'settings.title': '设置', 'settings.appearance': '外观', 'settings.playback': '播放',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': '数据与存储', 'settings.about': '关于',
'settings.language': '语言', 'settings.languageSub': '界面语言——选择“系统”时跟随设备语言',
'settings.system': '系统', 'settings.dark': '深色', 'settings.light': '浅色',
'settings.glass': 'Liquid Glass', 'settings.glassSub': '磨砂半透明表面，富有层次感',
'settings.theme': '主题模式', 'settings.themeSub': '选择应用外观',
'settings.bgPlayback': '后台播放', 'settings.bgPlaybackSub': '离开播放器后继续在迷你播放器中播放',
'settings.autoplayNext': '自动播放下一个视频', 'settings.autoplayNextSub': '当前视频结束后自动播放下一个相关视频',
'settings.playbackQuality': '播放画质', 'settings.storageUsage': '存储用量', 'settings.clearCache': '清除缓存',
'settings.version': '版本', 'settings.accounts': '账号',
'settings.accountsSub': '此版本没有 Google 登录——订阅仅保存在本设备上。',
'sb.sponsor': '赞助内容', 'sb.intro': '片头', 'sb.outro': '片尾和字幕', 'sb.selfpromo': '自我推广',
'sb.interaction': '点赞和订阅提醒', 'sb.musicOfftopic': '音乐视频中的非音乐部分',
'toast.searchFailed': '搜索失败——请检查网络后重试。',
'toast.linkCopied': '视频链接已复制。', 'toast.likedAdded': '已加入喜欢的视频。', 'toast.likedRemoved': '已从喜欢的视频中移除。',
'toast.savedAdded': '已保存——在“已保存”标签页中查看。', 'toast.savedRemoved': '已从已保存中移除。',
'status.noVideos': '未找到视频。', 'status.noMore': '没有更多视频了——换个筛选试试。',
'status.loadingTrending': '正在加载热门视频…',
};
I18N.ja = {
'toast.subscribed': '{name} に登録しました。',
'toast.unsubscribed': '{name} の登録を解除しました。',
'sb.skipped': '{label}のセグメントをスキップしました',
'sb.on': 'SponsorBlock をオンにしました。',
'sb.off': 'SponsorBlock をオフにしました。',
'quality.locked': '画質を {label} に固定しました。',
'quality.autoSet': '画質：自動。',
'toast.openFirst': 'まず動画を開いてください。',
'shorts.refreshToast': '新しいショートを読み込みました。',
'shorts.loadErrorToast': 'ショートを読み込めませんでした。後でもう一度お試しください。',
'music.endQueue': 'キューの終わりです。',
'music.nothingNext': '次に再生するものがありません。',
'watch.loadError': '動画情報を読み込めませんでしたが、プレーヤーは動作しています。',
'watch.noRelated': '関連動画はありません。',
'watch.commentsError': 'コメントを読み込めませんでした。',
'status.noSubsYet': '登録チャンネルはまだありません — チャンネルの「登録」をタップしてください。',
'status.noRecentSubs': '登録チャンネルの新しい動画はありません。',
'status.searching': '「{q}」を検索中…',
'status.loadingSubs': '登録チャンネルの動画を読み込み中…',
'status.loadingChannel': 'チャンネルの動画を読み込み中…',
'status.noVideosChannel': '{name} の動画が見つかりませんでした。',
'download.opened': 'ダウンロードを開きました — 新しいタブから保存してください。',
'download.linkCopied': 'ダウンロードリンクをコピーしました。',
'toast.cacheCleared': 'キャッシュを消去しました — 履歴、設定、視聴済みショートを削除しました。',
'toast.glassOn': 'Liquid Glass をオンにしました。',
'toast.glassOff': 'Liquid Glass をオフにしました — ソリッドな表面を使用します。',
'toast.bgOn': 'バックグラウンド再生をオンにしました。',
'toast.bgOff': 'バックグラウンド再生をオフにしました — プレーヤーを離れると停止します。',
'toast.shuffleOn': 'シャッフルをオンにしました。',
'toast.shuffleOff': 'シャッフルをオフにしました。',
'toast.repeatOn': 'リピートをオンにしました。',
'toast.repeatOff': 'リピートをオフにしました。',
'toast.downloadRemoved': 'ダウンロードをリストから削除しました。',
'common.moreOptions': 'その他のオプションは後のステップで追加されます。',
'common.tryAgain': '再試行',
'common.loading': '読み込み中…',
'lyrics.plainOnly': 'この曲には通常の歌詞のみがあります（音楽と同期していません）。',
'settings.sbSub': 'セグメントを自動でスキップ — sponsor.ajay.app のコミュニティデータ（CC BY-NC-SA 4.0）',
'settings.sbCatSub': '自動でスキップ',
'quality.audioNote': '音声のみはダウンロードにのみ適用されます — 再生は自動のままです。',
'quality.letDecide': 'YouTubeに任せる',
'quality.noVideo': '動画なし — ダウンロード用',
'quality.notAvailable': 'この動画では利用できません',
'settings.playbackQualitySub': '現在：{label} — このデバイスに保存されています。',
'settings.clearCacheSub': '履歴、設定、視聴済みショートを削除します — 高評価、保存、ダウンロード、登録は削除しません',
'settings.versionSub': 'YTXTube iOS v2.2.0 — Android YTXTube v2.2.0 のクリーンルーム移植版（GPL-3.0）',
'library.clearCacheNote': 'キャッシュの消去は、このアプリの履歴、設定、視聴済みショートのみを削除します。ファイルアプリに保存したファイルは削除されません。',
'library.storageUnavailable': 'このブラウザではストレージの見積もりは利用できません。',
'library.storageUsed': 'このアプリはブラウザで約 {used} を使用しています。',
'library.storageUsedQuota': 'このアプリはブラウザで約 {used} / {quota} を使用しています。',
'download.iosNote': 'iOSではファイルが新しいタブで開きます — 動画を長押しして「ファイルに保存」を選択してください。YouTubeでは動画と音声は別々のストリームのため、高画質の動画には音声がない場合があります。',
'download.noLinks': 'ダウンロードリンクを取得できませんでした — 接続を確認して再試行してください。',
'download.noLinksBlocked': 'ダウンロードリンクを取得できませんでした — YouTubeが現在このサーバーをブロックしています。後でもう一度お試しください。',
'download.noStreams': 'この動画にはダウンロード可能なストリームがありません — 年齢制限があるか、ライブ配信の可能性があります。',
'download.openedNote': '新しいタブで開きました — <b>動画を長押しして「ファイルに保存」</b>（MP4は「写真に保存」）を選択してください。後で「保存済み → ダウンロード」で確認できます。',
'download.openedStatus': 'Safariで開きました — そこから保存してください',
'download.noDownloads': 'ダウンロードはまだありません — 動画の「ダウンロード」をタップしてください。',
'download.noVideoDownloads': '動画のダウンロードはまだありません。',
'download.noMusicDownloads': '音楽のダウンロードはまだありません。',
'music.queueToast': 'キュー：{n}曲 — #{i}を再生中。',
'music.loadError': '音楽を読み込めませんでした — 接続を確認して再試行してください。',
'music.hqAudio': '高音質オーディオ · 256 KBPS AAC',
'quality.autoNote': '自動 — YouTubeが接続に最適な画質を選びます。',
'quality.suggests': '自動 — YouTubeが接続に最適な画質を選びます。お使いの接続（{conn}）では {sug} 程度が推奨されます。',
'quality.subAuto': '自動 · {q}',
'quality.sub1080': 'フルHD',
'quality.sub1440': '2K',
'quality.sub2160': '4K',
'quality.sub720': 'HD',
'saved.noDownloads': 'ダウンロードはまだありません。',
'shorts.loadError': 'ショートを読み込めませんでした — 接続を確認して更新をタップしてください。',
'toast.pipedBusy': 'Pipedが混雑しています — 代替動画を表示しています。',

'common.views': '回視聴', 'common.likes': '高評価', 'common.subscribers': '登録者', 'common.channel': 'チャンネル',
'common.today': '今日', 'common.dayAgo': '1日前', 'common.daysAgo': '{n}日前', 'common.monthsAgo': '{n}か月前', 'common.yearsAgo': '{n}年前',
'common.change': '変更', 'common.search': '検索', 'common.library': 'ライブラリ', 'common.settings': '設定',
'nav.home': 'ホーム', 'nav.music': '音楽', 'nav.shorts': 'ショート', 'nav.library': 'ライブラリ', 'nav.saved': '保存済み',
'search.placeholder': '動画やチャンネルを検索…',
'chip.all': 'すべて', 'chip.today': '今日', 'chip.videos': '動画', 'chip.subscribed': '登録済み', 'chip.live': 'ライブ',
'music.search.placeholder': '曲やアーティストを検索…',
'music.chip.forYou': 'あなたへのおすすめ', 'music.chip.vietnamese': 'ベトナム音楽', 'music.chip.usUk': 'US-UK', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': 'リミックス',
'music.nowPlaying': '再生中', 'music.lyrics': '🎵 歌詞', 'music.queue': '🎶 キュー',
'music.recent': '最近再生した曲', 'music.likedTracks': 'お気に入りの曲', 'music.browse': 'ブラウズ',
'music.noRecent': '最近の音楽はまだありません。', 'music.noLiked': 'お気に入りの曲はまだありません — 曲の ♥ をタップしてください。',
'music.noSongs': '曲が見つかりませんでした — 別の検索を試してください。', 'music.loading': '音楽を読み込み中…',
'watch.back': '← 戻る', 'watch.subscribe': '登録', 'watch.subscribed': '登録済み ✓',
'watch.save': '🔖 保存', 'watch.saved': '🔖 保存済み', 'watch.download': '⬇ ダウンロード', 'watch.quality': '画質', 'watch.share': '↗ 共有',
'watch.lyrics': '🎵 歌詞', 'watch.hideLyrics': '🎵 歌詞を隠す', 'watch.comments': 'コメント', 'watch.commentsFab': '💬 コメント',
'watch.moreVideos': '関連動画', 'watch.more': '...もっと見る', 'watch.less': '...閉じる',
'watch.loading': '読み込み中…', 'watch.noComments': 'コメントはまだありません。', 'watch.loadingComments': 'コメントを読み込み中…',
'download.title': '動画をダウンロード', 'download.gettingLinks': 'ダウンロードリンクを取得中…',
'download.go': '⬇ ダウンロード', 'download.copyLink': 'リンクをコピー', 'download.retry': '再試行',
'download.videoAudio': '動画 + 音声', 'download.videoOnly': '動画のみ（音声なし）',
'download.sizeUnknown': 'サイズ不明',
'quality.title': '画質', 'quality.auto': '自動', 'quality.audioOnly': '音声のみ',
'quality.note': '選択内容はこのデバイスに保存され、すべての動画とショートに適用されます。HDRは動画とデバイスによって異なります。',
'shorts.title': 'ショート', 'shorts.hint': '上にスワイプして次の動画へ • 動画をタップしてミュート / ミュート解除',
'shorts.noShorts': 'ショートはまだありません。', 'shorts.loading': 'ショートを読み込み中…',
'shorts.muted': 'ショートをミュートしました。', 'shorts.unmuted': 'ショートのミュートを解除しました — もう一度タップするとミュートします。',
'shorts.linkCopied': 'ショートのリンクをコピーしました。', 'shorts.comments': 'コメント', 'shorts.like': '高評価', 'shorts.dislike': '低評価',
'shorts.download': 'ダウンロード', 'shorts.share': '共有',
'lyrics.looking': '歌詞を検索中…', 'lyrics.notFound': 'この曲の歌詞が見つかりませんでした — 別の曲を試してください。',
'lyrics.tapHint': '行をタップするとその部分に移動します。', 'lyrics.tryAgain': '再試行',
'library.title': 'ライブラリ', 'library.history': '履歴', 'library.likedVideos': '高評価した動画',
'library.subscriptions': '登録チャンネル', 'library.storage': 'ストレージ', 'library.clearCache': 'キャッシュを消去',
'library.noHistory': '履歴はまだありません。', 'library.noLiked': '高評価した動画はまだありません。',
'library.noSubs': '登録チャンネルはまだありません — チャンネルの「登録」をタップしてください。', 'library.unsubscribe': '登録解除',
'library.checking': 'ストレージを確認中…',
'saved.title': '保存済み', 'saved.downloads': 'ダウンロード', 'saved.videos': '動画', 'saved.music': '音楽',
'saved.savedVideos': '保存した動画', 'saved.note': '保存した動画はここに表示されます。',
'saved.nothingSaved': 'まだ何も保存されていません — 動画の「保存」をタップしてください。', 'saved.open': '開く', 'saved.remove': '削除',
'settings.title': '設定', 'settings.appearance': '外観', 'settings.playback': '再生',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': 'データとストレージ', 'settings.about': 'このアプリについて',
'settings.language': '言語', 'settings.languageSub': '表示言語 — 「システム」ではデバイスの言語に従います',
'settings.system': 'システム', 'settings.dark': 'ダーク', 'settings.light': 'ライト',
'settings.glass': 'Liquid Glass', 'settings.glassSub': 'すりガラスのような半透明の表面',
'settings.theme': 'テーマ', 'settings.themeSub': 'アプリの見た目を選択',
'settings.bgPlayback': 'バックグラウンド再生', 'settings.bgPlaybackSub': 'プレーヤーを離れてもミニプレーヤーで再生を続ける',
'settings.autoplayNext': '次の動画を自動再生', 'settings.autoplayNextSub': 'この動画が終わったら次の関連動画を再生する',
'settings.playbackQuality': '再生画質', 'settings.storageUsage': 'ストレージ使用量', 'settings.clearCache': 'キャッシュを消去',
'settings.version': 'バージョン', 'settings.accounts': 'アカウント',
'settings.accountsSub': 'このビルドにはGoogleログインがありません — 登録はこのデバイスにのみ保存されます。',
'sb.sponsor': 'スポンサー', 'sb.intro': 'イントロ', 'sb.outro': 'エンディングとクレジット', 'sb.selfpromo': '自己宣伝',
'sb.interaction': '高評価と登録のお願い', 'sb.musicOfftopic': 'ミュージックビデオの音楽以外の部分',
'toast.searchFailed': '検索に失敗しました — 接続を確認して再試行してください。',
'toast.linkCopied': '動画リンクをコピーしました。', 'toast.likedAdded': '高評価した動画に追加しました。', 'toast.likedRemoved': '高評価した動画から削除しました。',
'toast.savedAdded': '保存しました — 「保存済み」タブで確認できます。', 'toast.savedRemoved': '保存済みから削除しました。',
'status.noVideos': '動画が見つかりませんでした。', 'status.noMore': 'これ以上動画はありません — 別のフィルターを試してください。',
'status.loadingTrending': 'トレンドを読み込み中…',
};
I18N.ko = {
'toast.subscribed': '{name}을(를) 구독했습니다.',
'toast.unsubscribed': '{name} 구독을 취소했습니다.',
'sb.skipped': '{label} 구간을 건너뛰었습니다',
'sb.on': 'SponsorBlock을 켰습니다.',
'sb.off': 'SponsorBlock을 껐습니다.',
'quality.locked': '화질을 {label}(으)로 고정했습니다.',
'quality.autoSet': '화질: 자동.',
'toast.openFirst': '먼저 동영상을 여세요.',
'shorts.refreshToast': '새 Shorts를 불러왔습니다.',
'shorts.loadErrorToast': 'Shorts를 불러오지 못했습니다. 나중에 다시 시도하세요.',
'music.endQueue': '재생목록이 끝났습니다.',
'music.nothingNext': '다음에 재생할 항목이 없습니다.',
'watch.loadError': '동영상 정보를 불러오지 못했지만 플레이어는 계속 실행 중입니다.',
'watch.noRelated': '관련 동영상이 없습니다.',
'watch.commentsError': '댓글을 불러오지 못했습니다.',
'status.noSubsYet': '구독 중인 채널이 없습니다 — 채널에서 구독을 눌러보세요.',
'status.noRecentSubs': '구독 채널의 최근 동영상이 없습니다.',
'status.searching': '“{q}” 검색 중…',
'status.loadingSubs': '구독 채널의 동영상을 불러오는 중…',
'status.loadingChannel': '채널 동영상을 불러오는 중…',
'status.noVideosChannel': '{name}의 동영상을 찾을 수 없습니다.',
'download.opened': '다운로드가 열렸습니다 — 새 탭에서 저장하세요.',
'download.linkCopied': '다운로드 링크가 복사되었습니다.',
'toast.cacheCleared': '캐시가 지워졌습니다 — 기록, 설정, 본 Shorts가 삭제되었습니다.',
'toast.glassOn': 'Liquid Glass를 켰습니다.',
'toast.glassOff': 'Liquid Glass를 껐습니다 — 단색 표면을 사용합니다.',
'toast.bgOn': '백그라운드 재생을 켰습니다.',
'toast.bgOff': '백그라운드 재생을 껐습니다 — 플레이어를 벗어나면 중단됩니다.',
'toast.shuffleOn': '셔플을 켰습니다.',
'toast.shuffleOff': '셔플을 껐습니다.',
'toast.repeatOn': '반복을 켰습니다.',
'toast.repeatOff': '반복을 껐습니다.',
'toast.downloadRemoved': '다운로드를 목록에서 삭제했습니다.',
'common.moreOptions': '추가 옵션은 이후 단계에서 제공됩니다.',
'common.tryAgain': '다시 시도',
'common.loading': '불러오는 중…',
'lyrics.plainOnly': '이 곡은 일반 가사만 있습니다(음악과 동기화되지 않음).',
'settings.sbSub': '구간 자동 건너뛰기 — sponsor.ajay.app 커뮤니티 데이터(CC BY-NC-SA 4.0)',
'settings.sbCatSub': '자동으로 건너뛰기',
'quality.audioNote': '오디오만은 다운로드에만 적용됩니다 — 재생은 자동 상태를 유지합니다.',
'quality.letDecide': 'YouTube에 맡기기',
'quality.noVideo': '동영상 없음 — 다운로드용',
'quality.notAvailable': '이 동영상에서는 사용할 수 없음',
'settings.playbackQualitySub': '현재: {label} — 이 기기에 저장됨.',
'settings.clearCacheSub': '기록, 설정, 본 Shorts를 삭제합니다 — 좋아요, 저장, 다운로드, 구독은 삭제하지 않습니다',
'settings.versionSub': 'YTXTube iOS v2.2.0 — Android YTXTube v2.2.0의 클린룸 포팅(GPL-3.0)',
'library.clearCacheNote': '캐시를 지우면 이 앱의 기록, 설정, 본 Shorts만 삭제됩니다. 파일 앱에 저장한 파일은 삭제되지 않습니다.',
'library.storageUnavailable': '이 브라우저에서는 저장 공간 추정을 사용할 수 없습니다.',
'library.storageUsed': '이 앱은 브라우저에서 약 {used}를 사용하고 있습니다.',
'library.storageUsedQuota': '이 앱은 브라우저에서 약 {used} / {quota}를 사용하고 있습니다.',
'download.iosNote': 'iOS에서는 파일이 새 탭에서 열립니다 — 동영상을 길게 눌러 “파일에 저장”을 선택하세요. YouTube에서는 동영상과 오디오가 별도 스트림이므로 고화질 동영상에 소리가 없을 수 있습니다.',
'download.noLinks': '다운로드 링크를 가져오지 못했습니다 — 연결을 확인하고 다시 시도하세요.',
'download.noLinksBlocked': '다운로드 링크를 가져오지 못했습니다 — YouTube가 현재 이 서버를 차단하고 있습니다. 나중에 다시 시도하세요.',
'download.noStreams': '이 동영상에는 다운로드 가능한 스트림이 없습니다 — 연령 제한이 있거나 라이브 스트림일 수 있습니다.',
'download.openedNote': '새 탭에서 열렸습니다 — <b>동영상을 길게 눌러 “파일에 저장”</b>(MP4는 “사진에 저장”)을 선택하세요. 나중에 저장됨 → 다운로드에서 찾을 수 있습니다.',
'download.openedStatus': 'Safari에서 열렸습니다 — 거기서 저장하세요',
'download.noDownloads': '다운로드가 없습니다 — 동영상에서 다운로드를 눌러보세요.',
'download.noVideoDownloads': '동영상 다운로드가 없습니다.',
'download.noMusicDownloads': '음악 다운로드가 없습니다.',
'music.queueToast': '재생목록: {n}곡 — #{i}번 재생 중.',
'music.loadError': '음악을 불러오지 못했습니다 — 연결을 확인하고 다시 시도하세요.',
'music.hqAudio': '고음질 오디오 · 256 KBPS AAC',
'quality.autoNote': '자동 — YouTube가 연결에 가장 적합한 화질을 선택합니다.',
'quality.suggests': '자동 — YouTube가 연결에 가장 적합한 화질을 선택합니다. 연결({conn}) 기준 약 {sug} 정도가 적당합니다.',
'quality.subAuto': '자동 · {q}',
'quality.sub1080': '풀 HD',
'quality.sub1440': '2K',
'quality.sub2160': '4K',
'quality.sub720': 'HD',
'saved.noDownloads': '다운로드가 없습니다.',
'shorts.loadError': 'Shorts를 불러오지 못했습니다 — 연결을 확인하고 새로고침을 눌러보세요.',
'toast.pipedBusy': 'Piped가 바쁩니다 — 대체 동영상을 표시하고 있습니다.',

'common.views': '회 조회', 'common.likes': '좋아요', 'common.subscribers': '구독자', 'common.channel': '채널',
'common.today': '오늘', 'common.dayAgo': '1일 전', 'common.daysAgo': '{n}일 전', 'common.monthsAgo': '{n}개월 전', 'common.yearsAgo': '{n}년 전',
'common.change': '변경', 'common.search': '검색', 'common.library': '보관함', 'common.settings': '설정',
'nav.home': '홈', 'nav.music': '음악', 'nav.shorts': 'Shorts', 'nav.library': '보관함', 'nav.saved': '저장됨',
'search.placeholder': '동영상, 채널 검색…',
'chip.all': '전체', 'chip.today': '오늘', 'chip.videos': '동영상', 'chip.subscribed': '구독 중', 'chip.live': '라이브',
'music.search.placeholder': '노래, 아티스트 검색…',
'music.chip.forYou': '맞춤 추천', 'music.chip.vietnamese': '베트남 음악', 'music.chip.usUk': 'US-UK', 'music.chip.kPop': 'K-Pop', 'music.chip.loFi': 'Lo-fi', 'music.chip.remix': '리믹스',
'music.nowPlaying': '재생 중', 'music.lyrics': '🎵 가사', 'music.queue': '🎶 재생목록',
'music.recent': '최근 재생', 'music.likedTracks': '좋아요한 곡', 'music.browse': '둘러보기',
'music.noRecent': '최근 재생한 음악이 없습니다.', 'music.noLiked': '좋아요한 곡이 없습니다 — 곡의 ♥를 눌러보세요.',
'music.noSongs': '노래를 찾을 수 없습니다 — 다른 검색어를 시도하세요.', 'music.loading': '음악을 불러오는 중…',
'watch.back': '← 뒤로', 'watch.subscribe': '구독', 'watch.subscribed': '구독 중 ✓',
'watch.save': '🔖 저장', 'watch.saved': '🔖 저장됨', 'watch.download': '⬇ 다운로드', 'watch.quality': '화질', 'watch.share': '↗ 공유',
'watch.lyrics': '🎵 가사', 'watch.hideLyrics': '🎵 가사 숨기기', 'watch.comments': '댓글', 'watch.commentsFab': '💬 댓글',
'watch.moreVideos': '관련 동영상', 'watch.more': '...더보기', 'watch.less': '...접기',
'watch.loading': '불러오는 중…', 'watch.noComments': '댓글이 없습니다.', 'watch.loadingComments': '댓글을 불러오는 중…',
'download.title': '동영상 다운로드', 'download.gettingLinks': '다운로드 링크를 가져오는 중…',
'download.go': '⬇ 다운로드', 'download.copyLink': '링크 복사', 'download.retry': '다시 시도',
'download.videoAudio': '동영상 + 오디오', 'download.videoOnly': '동영상만 (소리 없음)',
'download.sizeUnknown': '크기 알 수 없음',
'quality.title': '화질', 'quality.auto': '자동', 'quality.audioOnly': '오디오만',
'quality.note': '선택은 이 기기에 저장되며 모든 동영상과 Shorts에 적용됩니다. HDR은 동영상과 기기에 따라 다릅니다.',
'shorts.title': 'Shorts', 'shorts.hint': '위로 스와이프하면 다음 동영상 • 동영상을 탭하면 음소거 / 음소거 해제',
'shorts.noShorts': 'Shorts가 없습니다.', 'shorts.loading': 'Shorts를 불러오는 중…',
'shorts.muted': 'Shorts가 음소거되었습니다.', 'shorts.unmuted': 'Shorts 음소거 해제 — 다시 탭하면 음소거됩니다.',
'shorts.linkCopied': 'Shorts 링크가 복사되었습니다.', 'shorts.comments': '댓글', 'shorts.like': '좋아요', 'shorts.dislike': '싫어요',
'shorts.download': '다운로드', 'shorts.share': '공유',
'lyrics.looking': '가사를 찾는 중…', 'lyrics.notFound': '이 곡의 가사를 찾을 수 없습니다 — 다른 곡을 시도하세요.',
'lyrics.tapHint': '줄을 탭하면 해당 부분으로 이동합니다.', 'lyrics.tryAgain': '다시 시도',
'library.title': '보관함', 'library.history': '기록', 'library.likedVideos': '좋아요한 동영상',
'library.subscriptions': '구독', 'library.storage': '저장 공간', 'library.clearCache': '캐시 지우기',
'library.noHistory': '기록이 없습니다.', 'library.noLiked': '좋아요한 동영상이 없습니다.',
'library.noSubs': '구독 중인 채널이 없습니다 — 채널에서 구독을 눌러보세요.', 'library.unsubscribe': '구독 취소',
'library.checking': '저장 공간을 확인하는 중…',
'saved.title': '저장됨', 'saved.downloads': '다운로드', 'saved.videos': '동영상', 'saved.music': '음악',
'saved.savedVideos': '저장된 동영상', 'saved.note': '저장한 동영상은 여기에 표시됩니다.',
'saved.nothingSaved': '저장된 항목이 없습니다 — 동영상에서 저장을 눌러보세요.', 'saved.open': '열기', 'saved.remove': '삭제',
'settings.title': '설정', 'settings.appearance': '모양', 'settings.playback': '재생',
'settings.sponsorblock': 'SponsorBlock', 'settings.dataStorage': '데이터 및 저장 공간', 'settings.about': '정보',
'settings.language': '언어', 'settings.languageSub': '인터페이스 언어 — 시스템을 선택하면 기기 언어를 따릅니다',
'settings.system': '시스템', 'settings.dark': '다크', 'settings.light': '라이트',
'settings.glass': 'Liquid Glass', 'settings.glassSub': '깊이감 있는 반투명 표면',
'settings.theme': '테마 모드', 'settings.themeSub': '앱 모양 선택',
'settings.bgPlayback': '백그라운드 재생', 'settings.bgPlaybackSub': '플레이어를 벗어나도 미니 플레이어에서 계속 재생',
'settings.autoplayNext': '다음 동영상 자동 재생', 'settings.autoplayNextSub': '이 동영상이 끝나면 다음 관련 동영상을 재생',
'settings.playbackQuality': '재생 화질', 'settings.storageUsage': '저장 공간 사용량', 'settings.clearCache': '캐시 지우기',
'settings.version': '버전', 'settings.accounts': '계정',
'settings.accountsSub': '이 빌드에는 Google 로그인이 없습니다 — 구독은 이 기기에만 저장됩니다.',
'sb.sponsor': '스폰서', 'sb.intro': '인트로', 'sb.outro': '아웃트로 및 크레딧', 'sb.selfpromo': '자기 홍보',
'sb.interaction': '좋아요 및 구독 알림', 'sb.musicOfftopic': '뮤직비디오의 음악이 아닌 부분',
'toast.searchFailed': '검색에 실패했습니다 — 연결을 확인하고 다시 시도하세요.',
'toast.linkCopied': '동영상 링크가 복사되었습니다.', 'toast.likedAdded': '좋아요한 동영상에 추가했습니다.', 'toast.likedRemoved': '좋아요한 동영상에서 삭제했습니다.',
'toast.savedAdded': '저장했습니다 — 저장됨 탭에서 확인하세요.', 'toast.savedRemoved': '저장됨에서 삭제했습니다.',
'status.noVideos': '동영상을 찾을 수 없습니다.', 'status.noMore': '더 이상 동영상이 없습니다 — 다른 필터를 시도하세요.',
'status.loadingTrending': '인기 동영상을 불러오는 중…',
};

// ---------- Ngôn ngữ hiện tại ----------
const LANG_LOCALES = { en: 'en-US', vi: 'vi-VN', es: 'es-ES', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR' };
let langSetting = store.get('language', 'system'); // 'system' | 'en' | 'vi' | 'es' | 'zh' | 'ja' | 'ko'
function resolveLang() {
  if (langSetting && langSetting !== 'system' && I18N[langSetting]) return langSetting;
  const nav = String(navigator.language || 'en').toLowerCase();
  for (const code of ['vi', 'en', 'es', 'zh', 'ja', 'ko']) if (nav.startsWith(code)) return code;
  return 'en';
}
function langLocale() { return LANG_LOCALES[resolveLang()] || 'en-US'; }
function t(key, vars) {
  const lang = resolveLang();
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  return s;
}
// formatCount: was called in 5 places but never defined (pre-existing bug —
// opening a video would throw). Localised thousands separators.
function formatCount(n, fb = '') {
  if (n === null || n === undefined || n === '') return fb;
  try { return Number(n).toLocaleString(langLocale()); } catch { return String(n); }
}
function setLanguage(code) {
  langSetting = code;
  store.set('language', code);
  applyI18n();
}
function renderChips() {
  const el = $('chips');
  el.innerHTML = CATEGORIES.map((c, i) =>
    `<button class="chip${c.filter === currentCategory ? ' active' : ''}" data-i="${i}">${esc(t('chip.' + c.filter))}</button>`).join('');
}
function renderMusicChips() {
  const el = $('musicChips');
  el.innerHTML = MUSIC_CATEGORIES.map((c, i) =>
    `<button class="music-chip${c.key === currentMusicCat ? ' active' : ''}" data-i="${i}">${esc(t('music.chip.' + c.key))}</button>`).join('');
}
// Re-render every visible string live, without a page reload. Shorts slides
// already on screen keep their old labels until the next render (re-rendering
// them would destroy their players); everything else updates in place.
function applyI18n() {
  document.documentElement.lang = resolveLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  renderChips();
  renderMusicChips();
  if (currentVideo) syncWatchButtons();
  else { $('saveBtn').textContent = t('watch.save'); $('downloadBtn').textContent = t('watch.download'); $('shareBtn').textContent = t('watch.share'); refreshQualityLabel(); }
  $('lyricsBtn').textContent = lyricsOpen ? t('watch.hideLyrics') : t('watch.lyrics');
  $('mpLyricsBtn').textContent = t('watch.lyrics');
  $('mpDownloadBtn').textContent = t('watch.download');
  $('mpQueueBtn').textContent = t('music.queue');
  if ($('moreBtn') && $('watchDesc').dataset.full !== undefined) {
    $('moreBtn').textContent = $('watchDesc').textContent === $('watchDesc').dataset.full ? t('watch.less') : t('watch.more');
  }
  $('shortsHint').textContent = t('shorts.hint');
  if (!$('downloadSheet').hidden) renderDownloadOptions();
  if (!$('qualitySheet').hidden) openQualitySheet();
  if (!$('library-view').hidden) renderLibrary();
  if (!$('saved-view').hidden) renderSaved();
  if (!$('music-view').hidden) { renderMusicShelves(); if (musicList.length) $('musicGrid').innerHTML = musicList.map(cardHTML).join(''); }
  if (musicList.length && !$('music-view').hidden) setMusicStatus('');
  updateChannelHeadSubBtn();
  syncSettingsUI();
  document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('active', b.dataset.lang === langSetting));
  // Status text that is currently shown (feed empty / loading) is re-set in
  // English only when a new load happens; live strings above cover the UI.
}


// ---------- Trạng thái trang ----------
let feed = [];            // video đang hiển thị ở trang chủ
let trendingRaw = [];     // full trending list (HomeFilter filters client-side)
let rendered = 0;         // đã vẽ bao nhiêu thẻ (cuộn vô hạn)
let currentCategory = 'all';
let currentVideo = null;  // video đang xem
let relatedList = [];     // related videos of the open video (mini player Next)
let player = null;        // YT.Player (watch view or music player — one at a time)
let playerPlaying = false; // last known state (YT.PlayerState.PLAYING = 1)
let ytApiReady = false;
let historySavedFor = null;

// ---------- Nhạc + lời đồng bộ (Bước 3) ----------
// Nguồn lời: lrclib.net công khai — đúng nguồn bản Android dùng
// (Account.kt musicLyrics): /api/get trước, /api/search làm dự phòng,
// lời đồng bộ là định dạng LRC [mm:ss.xx]. Không có đăng nhập YouTube
// Music, không có lời lưu offline — có lời hay không tùy lrclib có bài đó.
const LRCLIB = 'https://lrclib.net';
const MUSIC_CATEGORIES = [
  { key: 'forYou', label: 'For You', query: 'top music' },
  { key: 'vietnamese', label: 'Vietnamese', query: 'Vietnamese music' },
  { key: 'usUk', label: 'US-UK', query: 'US UK music' },
  { key: 'kPop', label: 'K-Pop', query: 'K-Pop' },
  { key: 'loFi', label: 'Lo-fi', query: 'lofi' },
  { key: 'remix', label: 'Remix', query: 'remix' },
];
// Piped thử filter nhạc trước, không có kết quả thì rơi về filter=videos.
const MUSIC_FILTERS = ['music_songs', 'music_videos', 'videos'];
let musicList = [];                  // kết quả nhạc đang hiển thị
let currentMusicCat = 'forYou';       // key của chip nhạc đang chọn
let musicLoading = false;
let returnView = 'home';             // trang xem xong quay về đâu: 'home' | 'music'

// Trạng thái lời bài hát của video đang xem.
let lyricsLines = [];                // [{timeMs, text}] khi có lời đồng bộ
let lyricsPlain = '';                // lời thường (không có thời gian)
let lyricsSynced = false;
let lyricsOpen = false;
let lyricsForId = null;              // id video đã tải lời
let lyricsTimer = null;              // setInterval 250ms theo dõi thời gian phát
let lyricsCurrentIdx = -1;
let lyricsLoading = false;

// ---------- Trạng thái Shorts ----------
let shortsList = [];                 // video ngắn đang hiển thị
let shortsPlayers = new Map();       // id -> YT.Player của slide đó
let shortsObserver = null;           // IntersectionObserver: chỉ phát slide đang thấy
let shortsMuted = true;              // iOS chỉ cho autoplay khi tắt tiếng
let shortsCurrentId = null;          // slide đang hiển thị
let shortsBatch = 0;                 // số lần làm mới (đổi thứ tự truy vấn)
let shortsLoading = false;
let shortsSeen = new Set(store.get('shortsSeen', [])); // id đã xem trong phiên/lưu trữ

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const grid = $('grid'), statusEl = $('status');

// ---------- Tiện ích ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtViews = (n) => {
  if (!n && n !== 0) return '';
  const w = t('common.views');
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B ' + w;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M ' + w;
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K ' + w;
  return n + ' ' + w;
};
const compactCount = (n) => {
  if (!n) return '';
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return String(n);
};
const fmtDur = (s) => {
  if (!s && s !== 0) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const timeAgo = (ts) => {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return t('common.today');
  if (d === 1) return t('common.dayAgo');
  if (d < 30) return t('common.daysAgo', { n: d });
  if (d < 365) return t('common.monthsAgo', { n: Math.floor(d / 30) });
  return t('common.yearsAgo', { n: Math.floor(d / 365) });
};
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function showStatus(html) { statusEl.innerHTML = html; }
function spinner(msg) { showStatus(`<div class="spinner"></div>${esc(msg)}`); }

// ---------- Gọi Piped (thử lần lượt từng máy chủ) ----------
async function piped(path) {
  let lastErr;
  for (const base of INSTANCES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(base + path, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Piped không phản hồi');
}

// ---------- Gợi ý cá nhân hoá (chỉ từ lịch sử trên máy này) ----------
// Video nào có tiêu đề chứa từ khóa bạn hay xem sẽ được đẩy lên đầu feed.
function personalise(list) {
  const words = Object.entries(prefWords).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  if (!words.length) return list;
  const score = (v) => {
    const t = ((v.title || '') + ' ' + (v.uploaderName || v.uploader || '')).toLowerCase();
    return words.reduce((n, w) => n + (t.includes(w.toLowerCase()) ? 1 : 0), 0);
  };
  return [...list].sort((a, b) => score(b) - score(a));
}
function rememberWatch(video, category) {
  history = [{ id: video.id || video.url?.replace('/watch?v=', ''), title: video.title, category, at: Date.now() },
    ...history.filter((h) => h.id !== (video.id || video.url?.replace('/watch?v=', '')))].slice(0, 50);
  store.set('history', history);
  const text = ((video.title || '') + ' ' + category).toLowerCase();
  text.split(/[^a-zà-ỹ0-9]+/).filter((w) => w.length > 3).slice(0, 6).forEach((w) => {
    prefWords[w] = (prefWords[w] || 0) + 1;
  });
  store.set('prefWords', prefWords);
}

// ---------- Vẽ thẻ video ----------
function videoId(v) {
  return v.id || (v.url ? v.url.split('v=')[1] : '') || '';
}
// Android home card (screenshot 01-home): full-width thumbnail, duration
// badge, channel avatar + title + channel • views • time, ⋮ menu at right.
function cardHTML(v) {
  const id = videoId(v);
  const thumb = v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const channel = v.uploaderName || v.uploader || '';
  const avatar = v.uploaderAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel || 'YT')}`;
  return `<article class="card" data-id="${esc(id)}">
    <div class="thumb"><img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      ${v.duration ? `<span class="duration">${fmtDur(v.duration)}</span>` : ''}</div>
    <div class="card-body">
      <img class="card-avatar" src="${esc(avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <div class="card-text">
        <h3>${esc(v.title)}</h3>
        <div class="meta">${esc(channel)} • ${fmtViews(v.views)}${v.uploaded ? ' • ' + timeAgo(v.uploaded) : ''}</div>
      </div>
      <button class="card-menu" data-menu="${esc(id)}" aria-label="More options">⋮</button>
    </div>
  </article>`;
}
function renderBatch() {
  const next = feed.slice(rendered, rendered + 12);
  grid.insertAdjacentHTML('beforeend', next.map(cardHTML).join(''));
  rendered += next.length;
  showStatus(rendered >= feed.length
    ? (feed.length ? t('status.noMore') : '')
    : '');
}
function showFeed(list) {
  feed = list; rendered = 0;
  grid.innerHTML = '';
  if (!list.length) { showStatus(t('status.noVideos')); return; }
  renderBatch();
}

// ---------- Feed ----------
// Android HomeFilter, applied client-side over one trending fetch.
function applyHomeFilter(filter) {
  const list = trendingRaw;
  if (filter === 'today') {
    return list.filter((v) => !v.uploaded || Date.now() - v.uploaded < 86400000);
  }
  if (filter === 'videos') {
    return list.filter((v) => (v.duration ?? 0) > 0);
  }
  if (filter === 'live') {
    return list.filter((v) => v.duration === -1 || /live/i.test(v.title || ''));
  }
  if (filter === 'subscribed') {
    return list.filter((v) => subscribed.has(v.uploaderName || v.uploader || ''));
  }
  return list;
}
async function loadTrending() {
  currentCategory = 'all';
  $('channelHead').hidden = true;
  spinner(t('status.loadingTrending'));
  try {
    const data = await piped('/trending?region=VN');
    trendingRaw = data || [];
    showFeed(personalise(trendingRaw));
  } catch {
    toast(t('toast.pipedBusy'));
    trendingRaw = FALLBACK_VIDEOS;
    showFeed(FALLBACK_VIDEOS);
  }
}
async function loadCategory(cat) {
  currentCategory = cat.filter;
  $('channelHead').hidden = true;
  renderChips();
  if (!trendingRaw.length) { await loadTrending(); return; }
  const filtered = applyHomeFilter(cat.filter);
  if (!filtered.length && cat.filter === 'subscribed') {
    if (!subscribed.size) {
      showFeed([]);
      showStatus(t('status.noSubsYet'));
      return;
    }
    // Trending has nothing from subscribed channels — fetch per channel.
    spinner(t('status.loadingSubs'));
    const subVideos = await fetchSubscribedVideos();
    if (!subVideos.length) {
      showFeed([]);
      showStatus(t('status.noRecentSubs'));
      return;
    }
    showFeed(personalise(subVideos));
    return;
  }
  showFeed(personalise(filtered));
}
async function doSearch(q) {
  const query = (q || '').trim();
  closeShorts();
  closeSettings();
  closeMusic();
  closeLibrary();
  closeSaved();
  closeVideo(false);
  if (!query) return loadTrending();
  spinner(t('status.searching', { q: query }));
  try {
    const data = await piped(`/search?q=${encodeURIComponent(query)}&filter=videos`);
    const items = (data.items || []).filter((v) => videoId(v));
    showFeed(items);
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
  } catch {
    toast(t('toast.searchFailed'));
    showStatus('');
  }
}

// ---------- Trang xem video ----------
function stopPlayer() {
  try { if (player && player.stopVideo) player.stopVideo(); } catch { /* bỏ qua */ }
  try { if (player && player.destroy) player.destroy(); } catch { /* bỏ qua */ }
  player = null;
  playerPlaying = false;
  stopPlaybackTick();
}
function mountPlayer(id) {
  const wrap = $('playerWrap');
  wrap.innerHTML = '<div id="ytplayer" style="position:absolute;inset:0"></div>';
  const create = () => {
    player = new YT.Player('ytplayer', {
      videoId: id,
      playerVars: { playsinline: 1, rel: 0, autoplay: 1 },
      events: {
        onReady: (e) => { applyQualityLock(e.target); fetchSB(id); ensurePlaybackTick(); e.target.playVideo(); },
        onStateChange: (e) => {
          // YT.PlayerState.PLAYING = 1
          playerPlaying = e.data === 1;
          updateMiniPlayBtn();
          if (e.data === 1) {
            refreshQualityLabel();
            if (historySavedFor !== id) {
              historySavedFor = id;
              if (currentVideo) rememberWatch(currentVideo, currentCategory);
            }
          }
          // Ended: autoplay the next related video (Settings toggle).
          if (e.data === 0 && appSettings.autoplayNext) {
            const n = relatedList[0];
            if (n) openVideo(videoId(n));
          }
        },
      },
    });
  };
  if (ytApiReady && window.YT && YT.Player) create();
  else wrap.innerHTML = `<iframe src="${EMBED(id)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
}
// YouTube IFrame API gọi hàm toàn cục này khi sẵn sàng.
window.onYouTubeIframeAPIReady = () => { ytApiReady = true; };

async function openVideo(id, opts = {}) {
  // Ghi nhớ đang mở video từ đâu để nút Back đưa về đúng chỗ.
  returnView = !$('music-view').hidden ? 'music' : 'home';
  stopPlayer();
  stopLyricsPolling();
  closeLyrics();
  closeShorts();
  hideMiniPlayer();
  $('music-view').hidden = true;
  $('library-view').hidden = true;
  $('saved-view').hidden = true;
  $('music-player-view').hidden = true;
  $('musicNavBtn').classList.remove('active');
  $('home').classList.add('hidden');
  $('watch').hidden = false;
  $('watch').classList.add('open');
  $('chips').classList.add('hidden');
  $('bottomNav').style.display = 'none';
  $('commentsFab').classList.add('show');
  window.scrollTo({ top: 0 });
  $('watchTitle').textContent = t('watch.loading');
  $('watchMeta').textContent = '';
  $('watchDesc').textContent = '';
  $('moreBtn').hidden = true;
  $('relatedGrid').innerHTML = '';
  $('comments').innerHTML = `<div class="status"><div class="spinner"></div>${esc(t('watch.loadingComments'))}</div>`;
  mountPlayer(id);

  try {
    const data = await piped(`/streams/${id}`);
    currentVideo = {
      id, title: data.title, uploader: data.uploader, duration: data.duration,
      thumbnail: data.thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      likes: data.likes || 0, dislikes: data.dislikes || 0,
      uploaderAvatar: data.uploaderAvatar || '', uploaderUrl: data.uploaderUrl || '',
    };
    $('watchTitle').textContent = data.title || '';
    $('watchMeta').textContent =
      `${fmtViews(data.views)} • ${data.uploadDate ? new Date(data.uploadDate).toLocaleDateString(langLocale()) : ''} • ${formatCount(data.likes, '0')} ${t('common.likes')}`;
    $('channelName').textContent = data.uploader || '';
    $('channelSubs').textContent = data.uploaderSubscriberCount
      ? `${formatCount(data.uploaderSubscriberCount)} ${t('common.subscribers')}` : '';
    $('channelAvatar').src = data.uploaderAvatar || '';
    const fullDesc = data.description || '';
    $('watchDesc').dataset.full = fullDesc;
    $('watchDesc').textContent = fullDesc.length > 180 ? fullDesc.slice(0, 180) + '…' : fullDesc;
    $('moreBtn').hidden = fullDesc.length <= 180;
    $('moreBtn').textContent = t('watch.more');
    syncWatchButtons();
    relatedList = (data.relatedStreams || []).filter((v) => videoId(v)).slice(0, 12);
    $('relatedGrid').innerHTML = relatedList.map(cardHTML).join('') || `<p class="meta">${esc(t('watch.noRelated'))}</p>`;
    // Mở từ tab Nhạc, hoặc tiêu đề giống nhạc → tự mở lời bài hát.
    if (opts.fromMusic || isMusicLike(data.title || '')) openLyrics();
  } catch {
    $('watchTitle').textContent = t('watch.loadError');
    $('relatedGrid').innerHTML = '';
  }
  loadComments(id);
}
// Sync Like / Dislike / Save / Subscribe pills with local state.
function syncWatchButtons() {
  if (!currentVideo) return;
  const id = currentVideo.id;
  $('likeBtn').classList.toggle('liked', liked.has(id));
  $('likeCount').textContent = formatCount(currentVideo.likes, '');
  $('dislikeBtn').classList.toggle('liked', disliked.has(id));
  $('dislikeCount').textContent = currentVideo.dislikes ? formatCount(currentVideo.dislikes, '') : '';
  $('saveBtn').classList.toggle('liked', !!savedVideos[id]);
  $('saveBtn').textContent = savedVideos[id] ? t('watch.saved') : t('watch.save');
  $('subscribeBtn').textContent = subscribed.has(currentVideo.uploader || '')
    ? t('watch.subscribed') : t('watch.subscribe');
}
async function loadComments(id) {
  try {
    const data = await piped(`/comments/${id}`);
    const list = data.comments || [];
    $('commentsCount').textContent = data.commentCount ? formatCount(data.commentCount, '') : '';
    $('comments').innerHTML = list.length
      ? list.slice(0, 40).map((c) => `<div class="comment">
          <img src="${esc(c.thumbnail || '')}" alt="" loading="lazy" referrerpolicy="no-referrer">
          <div><div class="who">${esc(c.author)} <span>${timeAgo(c.commentedTime)}</span></div>
          <p>${esc(c.commentText)}</p>
          <div class="likes">👍 ${c.likeCount ? formatCount(c.likeCount) : 0}</div></div>
        </div>`).join('')
      : `<p class="meta">${esc(t('watch.noComments'))}</p>`;
  } catch {
    $('comments').innerHTML = `<p class="meta">${esc(t('watch.commentsError'))}</p>`;
  }
}
// Back from the player: Android minimises to the mini player instead of
// stopping playback. Internal callers pass minimize=false to stop for real.
// Only touches the player when the watch view is actually open, so closing
// from another tab never kills the music player by accident.
function closeVideo(minimize = false) {
  if (!$('watch').classList.contains('open')) return;
  if (minimize && player) {
    // Background playback OFF: leaving the player stops it for real.
    if (!appSettings.bgPlayback) { closeVideo(false); return; }
    stopLyricsPolling();
    closeLyrics();
    historySavedFor = null;
    $('watch').classList.remove('open');
    $('watch').hidden = true;
    $('bottomNav').style.display = '';
    $('commentsFab').classList.remove('show');
    document.querySelector('.comments').classList.remove('drawer-open');
    if (returnView === 'music') {
      $('music-view').hidden = false;
      $('chips').classList.add('hidden');
      setActiveTab('music');
    } else {
      $('home').classList.remove('hidden');
      $('chips').classList.remove('hidden');
      setActiveTab('home');
    }
    showMiniPlayer();
    return;
  }
  stopPlayer();
  stopLyricsPolling();
  closeLyrics();
  hideMiniPlayer();
  historySavedFor = null;
  currentVideo = null;
  $('watch').classList.remove('open');
  $('watch').hidden = true;
  $('bottomNav').style.display = '';
  if (returnView === 'music') {
    $('music-view').hidden = false;
    $('chips').classList.add('hidden');
    setActiveTab('music');
  } else {
    $('home').classList.remove('hidden');
    $('chips').classList.remove('hidden');
    setActiveTab('home');
  }
  $('commentsFab').classList.remove('show');
  document.querySelector('.comments').classList.remove('drawer-open');
}

// ---------- Bottom tabs (Android v2.2.0 order: Home | Music | Shorts | Library | Saved) ----------
function setActiveTab(name) {
  const map = { home: 'homeNavBtn', music: 'musicNavBtn', shorts: 'shortsNavBtn', library: 'libraryNavBtn', saved: 'savedNavBtn' };
  document.querySelectorAll('.bottom-nav-btn').forEach((b) => b.classList.remove('active'));
  if (map[name]) $(map[name]).classList.add('active');
}
function hideAllSections() {
  $('home').classList.add('hidden');
  $('watch').classList.remove('open');
  $('watch').hidden = true;
  $('music-view').hidden = true;
  $('library-view').hidden = true;
  $('saved-view').hidden = true;
  $('music-player-view').hidden = true;
  $('settings-view').hidden = true;
  $('chips').classList.add('hidden');
}
function openHome() {
  // Android: tapping Home while a player is open minimises to the mini player.
  if (!$('music-player-view').hidden) { closeMusicPlayer(true); return; }
  if ($('watch').classList.contains('open')) { closeVideo(true); return; }
  closeShorts();
  closeSettings();
  closeLibrary();
  closeSaved();
  hideAllSections();
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
  returnView = 'home';
}
function openLibrary() {
  stopLyricsPolling();
  closeLyrics();
  closeShorts();
  closeMusicPlayer(false);
  closeVideo(false);
  hideAllSections();
  renderLibrary();
  $('library-view').hidden = false;
  setActiveTab('library');
  window.scrollTo({ top: 0 });
}
function closeLibrary() {
  if ($('library-view').hidden) return;
  $('library-view').hidden = true;
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
}
function openSaved() {
  stopLyricsPolling();
  closeLyrics();
  closeShorts();
  closeMusicPlayer(false);
  closeVideo(false);
  hideAllSections();
  renderSaved();
  $('saved-view').hidden = false;
  setActiveTab('saved');
  window.scrollTo({ top: 0 });
}
function closeSaved() {
  if ($('saved-view').hidden) return;
  $('saved-view').hidden = true;
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
}
function renderLibrary() {
  const hist = history.slice(0, 12).map((h) => ({ id: h.id, title: h.title, uploader: '', views: 0 }));
  $('libraryHistory').innerHTML = hist.map(cardHTML).join('') || `<p class="meta">${esc(t('library.noHistory'))}</p>`;
  const likedList = Object.values(likedMeta).slice(0, 12);
  $('libraryLiked').innerHTML = likedList.map(cardHTML).join('') || `<p class="meta">${esc(t('library.noLiked'))}</p>`;
  renderLibrarySubs();
  renderStorage();
}
function renderSaved() {
  renderDownloads();
  const list = Object.values(savedVideos);
  $('savedGrid').innerHTML = list.map(cardHTML).join('');
  $('savedStatus').textContent = list.length ? '' : t('saved.nothingSaved');
}

// ---------- Mini player (new in Android v2.2.0: YouTube-like mini player) ----------
let miniTimer = null;
let miniVideo = null; // {id,title,uploader,thumbnail} currently in the mini player
function showMiniPlayer() {
  if (!player || !currentVideo) return;
  miniVideo = currentVideo;
  $('miniThumb').src = currentVideo.thumbnail || `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg`;
  $('miniTitle').textContent = currentVideo.title || '';
  $('miniArtist').textContent = currentVideo.uploader || '';
  $('miniPlayer').hidden = false;
  updateMiniPlayBtn();
  if (!miniTimer) miniTimer = setInterval(updateMiniProgress, 500);
}
function hideMiniPlayer() {
  $('miniPlayer').hidden = true;
  miniVideo = null;
  if (miniTimer) { clearInterval(miniTimer); miniTimer = null; }
}
function updateMiniPlayBtn() {
  $('miniPlayBtn').textContent = playerPlaying ? '⏸' : '▶';
  $('mpPlayBtn').textContent = playerPlaying ? '⏸' : '▶';
}
function updateMiniProgress() {
  if (!player || $('miniPlayer').hidden) return;
  try {
    const cur = player.getCurrentTime() || 0;
    const dur = player.getDuration() || 0;
    $('miniProgress').style.width = dur ? `${(cur / dur) * 100}%` : '0%';
  } catch { /* player not ready */ }
}
function miniNext() {
  if (currentMusic && currentMusic.queue.length > 1) { playMusicAt(currentMusic.index + 1); return; }
  const next = relatedList[0];
  if (next) openVideo(videoId(next));
  else toast(t('music.nothingNext'));
}

// ---------- Music player: Now Playing (Android screenshot 04) ----------
let currentMusic = null; // {video, queue, index}
let mpTimer = null;
let mpShuffle = false;
let mpRepeat = false;
function mountMusicPlayer(id) {
  const wrap = $('mpPlayerWrap');
  wrap.innerHTML = '<div id="mpytplayer"></div>';
  const create = () => {
    player = new YT.Player('mpytplayer', {
      videoId: id,
      playerVars: { playsinline: 1, rel: 0, autoplay: 1 },
      events: {
        onReady: (e) => { applyQualityLock(e.target); fetchSB(id); ensurePlaybackTick(); e.target.playVideo(); },
        onStateChange: (e) => {
          playerPlaying = e.data === 1;
          updateMiniPlayBtn();
          if (e.data === 1) refreshQualityLabel();
          if (e.data === 1 && historySavedFor !== id) {
            historySavedFor = id;
            if (currentVideo) rememberWatch(currentVideo, 'Music');
          }
          // Ended: repeat, or advance the queue.
          if (e.data === 0) {
            if (mpRepeat) { try { player.seekTo(0, true); player.playVideo(); } catch { /* ignore */ } }
            else playMusicAt(currentMusic ? currentMusic.index + 1 : -1);
          }
        },
      },
    });
  };
  if (ytApiReady && window.YT && YT.Player) create();
  else wrap.innerHTML = `<iframe src="${EMBED(id)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
}
function openMusicPlayer(video, queue) {
  const v = video;
  const id = videoId(v);
  if (!id) return;
  const list = (queue || [v]).filter((x) => videoId(x));
  const index = Math.max(0, list.findIndex((x) => videoId(x) === id));
  currentMusic = { video: list[index], queue: list, index };
  currentVideo = {
    id, title: v.title, uploader: v.uploaderName || v.uploader || '',
    duration: v.duration, thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    likes: v.likes || 0, dislikes: 0,
  };
  stopPlayer();
  stopLyricsPolling();
  closeLyrics();
  closeShorts();
  hideMiniPlayer();
  hideAllSections();
  $('music-player-view').hidden = false;
  $('bottomNav').style.display = 'none';
  $('commentsFab').classList.remove('show');
  setActiveTab('music');
  $('mpArt').src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  $('mpTitle').textContent = v.title || '';
  $('mpArtist').textContent = v.uploaderName || v.uploader || '';
  $('mpLikeBtn').textContent = liked.has(id) ? '♥' : '♡';
  $('mpLikeBtn').classList.toggle('liked', liked.has(id));
  $('mpCur').textContent = '0:00';
  $('mpDur').textContent = fmtDur(typeof v.duration === 'number' ? v.duration : parseDuration(v.duration));
  $('mpSeek').value = 0;
  mountMusicPlayer(id);
  rememberWatch(currentVideo, 'Music');
  if (!mpTimer) mpTimer = setInterval(updateMpSeek, 500);
  // Lyrics auto-open when the track looks like music (same rule as Android).
  openLyrics();
}
function playMusicAt(index) {
  if (!currentMusic) return;
  const q = currentMusic.queue;
  if (!q.length) return;
  let next = index;
  if (mpShuffle) next = Math.floor(Math.random() * q.length);
  if (next < 0 || next >= q.length) { toast(t('music.endQueue')); return; }
  openMusicPlayer(q[next], q);
}
function updateMpSeek() {
  if ($('music-player-view').hidden || !player) return;
  try {
    const cur = player.getCurrentTime() || 0;
    const dur = player.getDuration() || 0;
    $('mpCur').textContent = fmtDur(Math.floor(cur));
    if (dur) $('mpDur').textContent = fmtDur(Math.floor(dur));
    if (dur && document.activeElement !== $('mpSeek')) $('mpSeek').value = (cur / dur) * 100;
  } catch { /* player not ready */ }
}
function closeMusicPlayer(minimize = true) {
  if ($('music-player-view').hidden) return;
  if (minimize && player) {
    // Background playback OFF: leaving the player stops it for real.
    if (!appSettings.bgPlayback) { closeMusicPlayer(false); return; }
    stopLyricsPolling();
    closeLyrics();
    $('music-player-view').hidden = true;
    $('bottomNav').style.display = '';
    setActiveTab('music');
    openMusic();
    showMiniPlayer();
    return;
  }
  stopPlayer();
  stopLyricsPolling();
  closeLyrics();
  if (mpTimer) { clearInterval(mpTimer); mpTimer = null; }
  $('music-player-view').hidden = true;
  $('bottomNav').style.display = '';
  currentMusic = null;
}

// ---------- Shorts (Bước 2) ----------
// Thời lượng Piped trả về là giây (số); bản cũ có thể trả chuỗi "0:45".
function parseDuration(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.includes(':')) {
    const p = v.split(':').map(Number);
    return p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
  }
  return 0;
}
function isShortVideo(v) {
  const d = parseDuration(v.duration);
  return d > 0 && d < 65;
}
function setShortsStatus(html) { $('shortsStatus').innerHTML = html; }

function shortsSlideHTML(v) {
  const id = videoId(v);
  const title = v.title || t('shorts.title');
  const channel = v.uploaderName || v.uploader || '';
  const likes = v.likes || v.likeCount || 0;
  return `<div class="shorts-slide" data-id="${esc(id)}">
    <iframe id="shorts-yt-${esc(id)}" src="${EMBED_SHORTS(id)}"
      title="${esc(title)}" frameborder="0"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen></iframe>
    <div class="shorts-overlay">
      <div class="shorts-info">
        <div class="shorts-channel-row">
          <span class="shorts-channel">@${esc(channel)}</span>
          <button class="shorts-subscribe" data-action="subscribe" data-id="${esc(id)}" data-channel="${esc(channel)}">${subscribed.has(channel) ? t('watch.subscribed') : t('watch.subscribe')}</button>
        </div>
        <h3 class="shorts-title-text">${esc(title)}</h3>
        <div class="shorts-meta">${fmtViews(v.views)}${v.duration ? ' • ' + fmtDur(parseDuration(v.duration)) : ''}</div>
        <div class="shorts-music">♫ Shorts</div>
      </div>
      <div class="shorts-rail">
        <button class="rail-btn ${liked.has(id) ? 'liked' : ''}" data-action="like" data-id="${esc(id)}" title="${esc(t('shorts.like'))}">👍<span>${likes ? compactCount(likes) : t('shorts.like')}</span></button>
        <button class="rail-btn ${disliked.has(id) ? 'liked' : ''}" data-action="dislike" data-id="${esc(id)}" title="${esc(t('shorts.dislike'))}">👎<span>${esc(t('shorts.dislike'))}</span></button>
        <button class="rail-btn" data-action="comment" data-id="${esc(id)}" title="${esc(t('shorts.comments'))}">💬<span>${esc(t('shorts.comments'))}</span></button>
        <button class="rail-btn" data-action="download" data-id="${esc(id)}" title="${esc(t('shorts.download'))}">⬇<span>${esc(t('shorts.download'))}</span></button>
        <button class="rail-btn" data-action="share" data-id="${esc(id)}" title="${esc(t('shorts.share'))}">↗<span>${esc(t('shorts.share'))}</span></button>
      </div>
    </div>
  </div>`;
}
function renderShorts({ toTop = false } = {}) {
  const feedEl = $('shortsFeed');
  const prevScroll = feedEl.scrollTop; // giữ vị trí khi tải thêm (cuộn vô hạn)
  stopShortsPlayback();
  feedEl.innerHTML = shortsList.map(shortsSlideHTML).join('');
  setShortsStatus(shortsList.length ? '' : t('shorts.noShorts'));
  $('shortsHint').style.display = shortsList.length ? '' : 'none';
  setupShortsObserver();
  if (toTop) {
    const first = feedEl.querySelector('.shorts-slide');
    if (first) first.scrollIntoView();
  } else {
    feedEl.scrollTop = prevScroll;
  }
}
// Chỉ tạo YT.Player khi slide cần phát — không tạo 10 player cùng lúc trên iPhone.
function ensureShortsPlayer(id) {
  if (shortsPlayers.has(id)) return shortsPlayers.get(id);
  if (!ytApiReady || !window.YT || !YT.Player) return null;
  try {
    const p = new YT.Player(`shorts-yt-${id}`, {
      events: {
        onReady: (e) => {
          applyQualityLock(e.target);
          fetchSB(id);
          ensurePlaybackTick();
          if (shortsMuted) e.target.mute(); else { e.target.unMute(); e.target.setVolume(80); }
          if (shortsCurrentId === id) e.target.playVideo();
        },
        // Hết video mà loop không chạy (một số máy) thì vuốt sang slide sau.
        onStateChange: (e) => {
          if (e.data === 0 /* YT.PlayerState.ENDED */) nextShortsSlide();
        },
      },
    });
    shortsPlayers.set(id, p);
    return p;
  } catch { return null; }
}
function setupShortsObserver() {
  if (shortsObserver) shortsObserver.disconnect();
  const feedEl = $('shortsFeed');
  shortsObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.dataset.id;
      if (!id) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        shortsCurrentId = id;
        const p = ensureShortsPlayer(id);
        if (p) {
          try {
            if (shortsMuted) p.mute(); else { p.unMute(); p.setVolume(80); }
            p.playVideo();
          } catch { /* bỏ qua */ }
        }
      } else {
        const p = shortsPlayers.get(id);
        if (p) { try { p.pauseVideo(); } catch { /* bỏ qua */ } }
      }
    }
  }, { root: feedEl, threshold: 0.6 });
  feedEl.querySelectorAll('.shorts-slide').forEach((s) => shortsObserver.observe(s));
}
function nextShortsSlide() {
  const feedEl = $('shortsFeed');
  const cur = feedEl.querySelector(`.shorts-slide[data-id="${shortsCurrentId}"]`);
  const next = cur && cur.nextElementSibling;
  if (next) next.scrollIntoView({ behavior: 'smooth' });
  else loadShorts(true); // hết loạt: lấy loạt mới
}
// Dừng hẳn âm thanh khi rời Shorts: pause + destroy player + gỡ iframe.
function stopShortsPlayback() {
  for (const p of shortsPlayers.values()) {
    try { p.pauseVideo(); } catch { /* bỏ qua */ }
    try { p.destroy(); } catch { /* bỏ qua */ }
  }
  shortsPlayers.clear();
  shortsCurrentId = null;
  document.querySelectorAll('#shortsFeed iframe').forEach((f) => { f.src = ''; });
  if (shortsObserver) { shortsObserver.disconnect(); shortsObserver = null; }
}
function toggleShortsMute() {
  shortsMuted = !shortsMuted;
  const p = shortsCurrentId && shortsPlayers.get(shortsCurrentId);
  if (p) {
    try { if (shortsMuted) p.mute(); else { p.unMute(); p.setVolume(80); } } catch { /* bỏ qua */ }
  }
  const topMute = $('shortsMuteTopBtn');
  if (topMute) topMute.textContent = shortsMuted ? '🔇' : '🔊';
  toast(shortsMuted ? t('shorts.muted') : t('shorts.unmuted'));
}
async function loadShorts(refresh = false) {
  if (shortsLoading) return;
  shortsLoading = true;
  if (refresh) shortsBatch += 1;
  setShortsStatus(`<div class="spinner"></div>${esc(t('shorts.loading'))}`);
  // Truy vấn xoay theo batch + sở thích trên máy, để "Làm mới" ra loạt khác.
  const interest = Object.entries(prefWords).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([w]) => `shorts ${w}`);
  const queries = [...interest, ...SHORTS_QUERIES];
  const ordered = queries.slice(shortsBatch % queries.length).concat(queries.slice(0, shortsBatch % queries.length));
  const found = [];
  const seenIds = new Set(shortsList.map((v) => videoId(v)));
  try {
    for (const q of ordered) {
      if (found.length >= 10) break;
      try {
        const data = await piped(`/search?q=${encodeURIComponent(q)}&filter=videos`);
        for (const item of data.items || []) {
          const id = videoId(item);
          if (!id || seenIds.has(id) || shortsSeen.has(id) || !isShortVideo(item)) continue;
          seenIds.add(id);
          found.push(item);
          if (found.length >= 10) break;
        }
      } catch { /* máy chủ Piped lỗi với truy vấn này: thử truy vấn sau */ }
    }
  } catch { /* bỏ qua, dùng fallback bên dưới */ }
  if (found.length < 10) {
    for (const v of FALLBACK_SHORTS) {
      if (found.length >= 10) break;
      if (!seenIds.has(v.id) && !shortsSeen.has(v.id)) { seenIds.add(v.id); found.push(v); }
    }
  }
  shortsLoading = false;
  if (!found.length) {
    setShortsStatus(t('shorts.loadError'));
    toast(t('shorts.loadErrorToast'));
    return;
  }
  if (refresh) shortsList = found;
  else shortsList = [...shortsList, ...found];
  found.forEach((v) => shortsSeen.add(videoId(v)));
  if (shortsSeen.size > 200) shortsSeen = new Set([...shortsSeen].slice(-100));
  store.set('shortsSeen', [...shortsSeen]);
  renderShorts({ toTop: refresh });
  if (refresh) toast(t('shorts.refreshToast'));
}
function openShorts() {
  stopPlayer();
  hideMiniPlayer();
  currentMusic = null;
  returnView = 'home';
  closeVideo();
  closeSettings();
  closeLibrary();
  closeSaved();
  $('music-view').hidden = true;
  $('music-player-view').hidden = true;
  $('shorts-view').hidden = false;
  $('shorts-view').classList.add('open');
  $('home').classList.add('hidden');
  $('watch').classList.remove('open');
  $('chips').classList.add('hidden');
  $('commentsFab').classList.remove('show');
  setActiveTab('shorts');
  if (!shortsList.length) loadShorts();
  else renderShorts({ toTop: true });
}
function closeShorts() {
  if ($('shorts-view').hidden) return;
  stopShortsPlayback();
  $('shorts-view').classList.remove('open');
  $('shorts-view').hidden = true;
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
}
async function openShortsComments(id) {
  const drawer = $('shortsCommentsDrawer');
  const list = $('shortsCommentsList');
  drawer.hidden = false;
  list.innerHTML = `<div class="status"><div class="spinner"></div>${esc(t('watch.loadingComments'))}</div>`;
  try {
    const data = await piped(`/comments/${id}`);
    const comments = data.comments || [];
    list.innerHTML = comments.length
      ? comments.slice(0, 40).map((c) => `<div class="comment">
          <img src="${esc(c.thumbnail || '')}" alt="" loading="lazy" referrerpolicy="no-referrer">
          <div><div class="who">${esc(c.author)} <span>${timeAgo(c.commentedTime)}</span></div>
          <p>${esc(c.commentText)}</p>
          <div class="likes">👍 ${c.likeCount ? formatCount(c.likeCount) : 0}</div></div>
        </div>`).join('')
      : `<p class="meta">${esc(t('watch.noComments'))}</p>`;
  } catch {
    list.innerHTML = `<p class="meta">${esc(t('watch.commentsError'))}</p>`;
  }
}

// ---------- Nhạc (Bước 3) ----------
function setMusicStatus(html) { $('musicStatus').innerHTML = html; }
function openMusic(skipLoad = false) {
  // Never stop the player here: when called from closeMusicPlayer(true) the
  // music keeps playing under the mini player. A watch video is stopped
  // instead (closeVideo only acts when the watch view is open).
  if ($('watch').classList.contains('open')) closeVideo(false);
  closeShorts();
  closeLibrary();
  closeSaved();
  stopLyricsPolling();
  closeLyrics();
  hideAllSections();
  $('music-view').hidden = false;
  $('commentsFab').classList.remove('show');
  setActiveTab('music');
  returnView = 'home';
  window.scrollTo({ top: 0 });
  renderMusicShelves();
  if (!musicList.length && !skipLoad) loadMusic(MUSIC_CATEGORIES[0]);
}
function closeMusic() {
  if ($('music-view').hidden) return;
  $('music-view').hidden = true;
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
  returnView = 'home';
}
// Android MusicScreen shelves, from local data (no sign-in): recent plays
// and liked tracks that look like music.
function renderMusicShelves() {
  const recent = history
    .filter((h) => isMusicLike(h.title))
    .slice(0, 10)
    .map((h) => ({ id: h.id, title: h.title, uploader: '', views: 0 }));
  $('musicRecent').innerHTML = recent.map((v) =>
    `<div class="shelf-card" data-id="${esc(videoId(v))}">
      <img src="https://i.ytimg.com/vi/${esc(videoId(v))}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">
      <div>${esc(v.title)}</div>
    </div>`).join('') || `<p class="meta">${esc(t('music.noRecent'))}</p>`;
  const likedList = Object.values(likedMeta).filter((v) => isMusicLike(v.title)).slice(0, 10);
  $('musicLiked').innerHTML = likedList.map((v) =>
    `<div class="shelf-card" data-id="${esc(videoId(v))}">
      <img src="${esc(v.thumbnail || `https://i.ytimg.com/vi/${esc(videoId(v))}/hqdefault.jpg`)}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <div>${esc(v.title)}</div>
    </div>`).join('') || `<p class="meta">${esc(t('music.noLiked'))}</p>`;
}
function showMusic(list, catKey) {
  musicList = list;
  currentMusicCat = catKey || '';
  $('musicGrid').innerHTML = list.map(cardHTML).join('');
  setMusicStatus(list.length ? '' : t('music.noSongs'));
  renderMusicChips();
}
async function loadMusic(cat) {
  if (musicLoading) return;
  musicLoading = true;
  setMusicStatus(`<div class="spinner"></div>${esc(t('music.loading'))}`);
  let items = [];
  // Thử filter nhạc của Piped trước; filter nào cũng có thể trống tùy máy chủ.
  for (const filter of MUSIC_FILTERS) {
    try {
      const data = await piped(`/search?q=${encodeURIComponent(cat.query)}&filter=${filter}`);
      items = (data.items || []).filter((v) => videoId(v));
      if (items.length) break;
    } catch { /* thử filter sau */ }
  }
  musicLoading = false;
  if (!items.length) {
    toast(t('music.loadError'));
    setMusicStatus('');
    return;
  }
  showMusic(items.slice(0, 24), cat.key);
}
async function doMusicSearch(q) {
  const query = (q || '').trim();
  if (!query) { openMusic(); return; }
  openMusic(true); // open the tab without triggering the default browse load
  await loadMusic({ key: '', query });
  document.querySelectorAll('.music-chip').forEach((c) => c.classList.remove('active'));
}

// ---------- Lời bài hát (Bước 3, nguồn lrclib) ----------
// Tách "Nghệ sĩ - Tên bài" từ tiêu đề video. Bỏ hậu tố trong ngoặc chứa
// official / lyric / audio / video / mv / hd / 4k, bỏ "ft./feat." ở nghệ sĩ.
function parseTrack(title, uploader) {
  let clean = String(title || '').trim();
  clean = clean.replace(/\s*\([^)]*(official|lyric|audio|video|mv|hd|4k|remaster)[^)]*\)/gi, '');
  clean = clean.replace(/\s*\[[^\]]*(official|lyric|audio|video|mv|hd|4k|remaster)[^\]]*\]/gi, '');
  clean = clean.replace(/\s*\|.*$/, '').trim();
  let artist = String(uploader || '').trim();
  let track = clean;
  const m = clean.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (m) { artist = m[1].trim(); track = m[2].trim(); }
  artist = artist.split(/\s+(?:ft\.?|feat\.?)\s+/i)[0].trim();
  track = track.split(/\s+(?:ft\.?|feat\.?)\s+/i)[0].trim();
  return { track: track || clean, artist };
}
function isMusicLike(title) {
  return /(music|audio|lyric|nhạc|bài hát|official|mv\b)/i.test(title || '');
}
// LRC: mỗi dòng "[mm:ss.xx] câu hát". Bỏ dòng không có thời gian / trống.
function parseLRC(raw) {
  const lines = [];
  for (const line of String(raw || '').split('\n')) {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!m) continue;
    const text = m[3].trim();
    if (!text) continue;
    lines.push({ timeMs: (Number(m[1]) * 60 + Number(m[2])) * 1000, text });
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}
async function lrclibFetch(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null; // lrclib trả 404 khi không có lời
    return await res.json();
  } catch { return null; }
}
async function fetchLyrics(track, artist, durationSec) {
  // 1) /api/get: khớp chính xác tên bài + nghệ sĩ (+ thời lượng nếu có).
  const params = new URLSearchParams({ track_name: track, artist_name: artist });
  if (durationSec) params.set('duration', String(Math.round(durationSec)));
  let data = await lrclibFetch(`${LRCLIB}/api/get?${params}`);
  if (data && (data.syncedLyrics || data.plainLyrics)) return data;
  // 2) /api/search: tìm gần đúng, ưu tiên bản có lời đồng bộ.
  const list = await lrclibFetch(`${LRCLIB}/api/search?q=${encodeURIComponent(`${track} ${artist}`)}`);
  if (Array.isArray(list)) {
    const synced = list.find((d) => d.syncedLyrics);
    if (synced) return synced;
    const plain = list.find((d) => d.plainLyrics);
    if (plain) return plain;
  }
  return null;
}
function setLyricsStatus(html) {
  $('lyricsStatus').innerHTML = html;
  $('mpLyricsStatus').innerHTML = html;
}
function renderLyrics() {
  // Same lyrics in both places (watch panel + Now Playing card); the
  // highlight only runs in whichever one is visible.
  const html = lyricsSynced
    ? lyricsLines.map((l, i) =>
      `<div class="lyrics-line" data-i="${i}" data-time="${l.timeMs}">${esc(l.text)}</div>`).join('')
    : `<div class="lyrics-plain">${esc(lyricsPlain)}</div>`;
  $('lyricsLines').innerHTML = html;
  $('mpLyricsLines').innerHTML = html;
  lyricsCurrentIdx = -1;
}
function lyricsActiveBox() {
  return !$('music-player-view').hidden ? $('mpLyricsLines') : $('lyricsLines');
}
function stopLyricsPolling() {
  if (lyricsTimer) { clearInterval(lyricsTimer); lyricsTimer = null; }
}
function updateLyricsHighlight() {
  if (!lyricsSynced || !lyricsLines.length || !player) return;
  let t = 0;
  try { t = player.getCurrentTime() * 1000; } catch { return; }
  let idx = -1;
  for (let i = 0; i < lyricsLines.length; i++) {
    if (lyricsLines[i].timeMs <= t + 150) idx = i; else break;
  }
  if (idx === lyricsCurrentIdx) return;
  lyricsCurrentIdx = idx;
  const box = lyricsActiveBox();
  box.querySelectorAll('.lyrics-line').forEach((el, i) => {
    el.classList.toggle('current', i === idx);
    el.classList.toggle('past', i < idx);
  });
  const cur = box.querySelector('.lyrics-line.current');
  if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function startLyricsPolling() {
  stopLyricsPolling();
  if (!lyricsSynced) return;
  updateLyricsHighlight();
  ensurePlaybackTick(); // one shared 250ms tick for lyrics + SponsorBlock
}
async function openLyrics() {
  if (!currentVideo) return;
  lyricsOpen = true;
  // Now Playing shows the lyrics card (Android screenshot 05); the watch
  // view shows the same lyrics in its panel below the player.
  if (!$('music-player-view').hidden) $('mpLyricsCard').hidden = false;
  else $('lyricsPanel').hidden = false;
  $('lyricsBtn').textContent = t('watch.hideLyrics');
  if (lyricsForId === currentVideo.id) { // đã tải lời cho video này rồi
    if (lyricsSynced) startLyricsPolling();
    return;
  }
  if (lyricsLoading) return;
  lyricsLoading = true;
  lyricsForId = currentVideo.id;
  lyricsLines = []; lyricsPlain = ''; lyricsSynced = false;
  $('lyricsLines').innerHTML = '';
  $('lyricsRetryBtn').hidden = true;
  setLyricsStatus(`<div class="spinner"></div>${esc(t('lyrics.looking'))}`);
  $('lyricsHint').textContent = '';
  const { track, artist } = parseTrack(currentVideo.title, currentVideo.uploader);
  const data = await fetchLyrics(track, artist, currentVideo.duration);
  lyricsLoading = false;
  if (!lyricsOpen || !currentVideo || lyricsForId !== currentVideo.id) return; // đã đóng / đổi video
  if (!data) {
    setLyricsStatus(t('lyrics.notFound'));
    $('lyricsRetryBtn').hidden = false;
    return;
  }
  const synced = parseLRC(data.syncedLyrics || '');
  if (synced.length) {
    lyricsLines = synced; lyricsSynced = true;
    setLyricsStatus('');
    $('lyricsHint').textContent = t('lyrics.tapHint');
  } else if (data.plainLyrics) {
    lyricsPlain = data.plainLyrics; lyricsSynced = false;
    setLyricsStatus(t('lyrics.plainOnly'));
  } else {
    setLyricsStatus('No lyrics found for this track — try another one.');
    $('lyricsRetryBtn').hidden = false;
    return;
  }
  renderLyrics();
  if (lyricsSynced) startLyricsPolling();
}
function closeLyrics() {
  lyricsOpen = false;
  stopLyricsPolling();
  $('lyricsPanel').hidden = true;
  $('mpLyricsCard').hidden = true;
  $('lyricsBtn').textContent = t('watch.lyrics');
  $('lyricsHint').textContent = '';
}

// ---------- Bước 4 — Chất lượng + Tải xuống ----------
// Android v2.2.0 (screenshots 06-download-video / 07-downloading): quality
// lock, download sheet với radio theo chất lượng, trang Downloads có tab
// Videos/Music + thanh tiến độ đỏ.
// iOS reality — nói thẳng, không giả vờ giống Android:
//  * Không có engine tải ExoPlayer (stream liên tục + resume), không có
//    folder picker, không mux video+audio. <a download> bị Safari/WKWebView
//    bỏ qua (đúng bài học ở tai-anh-4k), nên file mở trong tab mới và người
//    dùng long-press để Save to Files — giống cách tai-anh-4k đã làm.
//  * Piped /streams trả videoStreams/audioStreams tách riêng; có video chỉ
//    có 360p muxed, không có audioStreams, không có contentLength (kiểm tra
//    thật ngày 2026-11-15: Rick Astley chỉ có 360p MP4 + LBRY). Sheet phải
//    hiển thị đúng những gì Piped trả, không bịa ra 2160p.
//  * Piped /streams từng trả SignInConfirmNotBot từ IP của VM (YouTube chặn
//    truy cập ẩn danh) — code thử lần lượt từng instance và báo lỗi rõ ràng.
// YT IFrame API (docs chính thức): getAvailableQualityLevels(),
// getPlaybackQuality(), setPlaybackQuality(level). Levels hợp lệ:
// 'hd2160','hd1440','hd1080','hd720','large','medium','small','tiny'.
const QUALITY_OPTIONS = [
  { label: 'Auto', level: 'auto' },
  { label: '2160p', sub: '4K', level: 'hd2160' },
  { label: '1440p', sub: '2K', level: 'hd1440' },
  { label: '1080p', sub: 'Full HD', level: 'hd1080' },
  { label: '720p', sub: 'HD', level: 'hd720' },
  { label: '480p', sub: '', level: 'large' },
  { label: '360p', sub: '', level: 'medium' },
  { label: 'Audio only', sub: 'Download only', level: 'audio' },
];
const QUALITY_LABEL = { hd2160: '2160p', hd1440: '1440p', hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p' };
let qualityLock = store.get('qualityLock', 'auto'); // 'auto' | YT level | 'audio'
let qualityAvailable = []; // levels YT báo là có cho video đang phát
let downloads = store.get('downloads', []); // [{id,title,uploader,thumbnail,quality,format,size,kind,at,url,status}]
let dlTab = 'video'; // tab đang xem trong Saved > Downloads
let dlSheetVideo = null; // video đang mở sheet tải
let dlSheetOptions = []; // [{kind:'video'|'audio', label, sub, format, size, url}]
let dlSelected = null; // index trong dlSheetOptions
let dlFetching = false;

function fmtSize(bytes) {
  if (!bytes || bytes <= 0) return t('download.sizeUnknown');
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, u = 0;
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u++; }
  return `${n >= 100 ? Math.round(n) : n.toFixed(2).replace(/\.?0+$/, '')} ${units[u]}`;
}
function qualityLabelFor(level) {
  if (level === 'auto') return t('quality.auto');
  if (level === 'audio') return t('quality.audioOnly');
  return QUALITY_LABEL[level] || level;
}
// Gợi ý Auto từ kết nối (chỉ gợi ý hiển thị, không ép chất lượng).
function autoQualityHint() {
  const c = navigator.connection;
  if (!c) return t('quality.autoNote');
  const type = c.effectiveType || '';
  const dl = c.downlink;
  let sug = '1080p';
  if (type === 'slow-2g' || type === '2g' || (dl && dl < 1.5)) sug = '360p';
  else if (type === '3g' || (dl && dl < 5)) sug = '480p';
  else if (dl && dl < 10) sug = '720p';
  if (!type && !dl) return t('quality.autoNote');
  return t('quality.suggests', { conn: type || dl + ' Mbps', sug });
}
function applyQualityLock(target) {
  if (!target || qualityLock === 'auto' || qualityLock === 'audio') return;
  try { target.setPlaybackQuality(qualityLock); } catch { /* player chưa sẵn sàng */ }
}
function refreshQualityLabel() {
  const btn = $('qualityBtn');
  if (!btn) return;
  let label = qualityLabelFor(qualityLock);
  try {
    if (player && player.getAvailableQualityLevels) {
      qualityAvailable = player.getAvailableQualityLevels() || [];
    }
    if (qualityLock === 'auto' && player && player.getPlaybackQuality) {
      const eff = player.getPlaybackQuality();
      if (eff && QUALITY_LABEL[eff]) label = t('quality.subAuto', { q: QUALITY_LABEL[eff] });
    }
  } catch { /* bỏ qua */ }
  btn.textContent = `⚙️ ${label}`;
}
function openQualitySheet() {
  const sheet = $('qualitySheet');
  $('qualityAutoNote').textContent = autoQualityHint();
  $('qualityList').innerHTML = QUALITY_OPTIONS.map((o) => {
    const unavailable = o.level !== 'auto' && o.level !== 'audio'
      && qualityAvailable.length && !qualityAvailable.includes(o.level);
    const selected = qualityLock === o.level;
    const label = o.level === 'auto' ? t('quality.auto') : o.level === 'audio' ? t('quality.audioOnly') : o.label;
    const sub = o.level === 'auto' ? t('quality.letDecide') : o.level === 'audio' ? t('quality.noVideo')
      : (o.sub === '4K' ? t('quality.sub2160') : o.sub === '2K' ? t('quality.sub1440') : o.sub === 'Full HD' ? t('quality.sub1080') : o.sub === 'HD' ? t('quality.sub720') : o.sub);
    return `<button class="quality-row${selected ? ' selected' : ''}${unavailable ? ' unavailable' : ''}" data-level="${o.level}" ${unavailable ? 'disabled' : ''}>
      <span class="dl-radio">${selected ? '●' : '○'}</span>
      <span class="dl-row-text"><span class="dl-row-title">${esc(label)}</span>
      <span class="dl-row-sub">${esc(sub)}${unavailable ? ' · ' + t('quality.notAvailable') : ''}</span></span>
    </button>`;
  }).join('');
  sheet.hidden = false;
}
function closeQualitySheet() { $('qualitySheet').hidden = true; }
function setQuality(level) {
  qualityLock = level;
  store.set('qualityLock', level);
  if (level === 'audio') {
    toast(t('quality.audioNote'));
  } else {
    applyQualityLock(player);
    const p = shortsCurrentId && shortsPlayers.get(shortsCurrentId);
    if (p) applyQualityLock(p);
  }
  refreshQualityLabel();
  closeQualitySheet();
  toast(level === 'auto' ? t('quality.autoSet') : t('quality.locked', { label: qualityLabelFor(level) }));
}

// ---------- Tải xuống ----------
async function fetchStreamLinks(id) {
  // Thử lần lượt từng instance Piped; /streams có thể trả lỗi
  // SignInConfirmNotBot tùy IP (YouTube chặn truy cập ẩn danh).
  let lastErr;
  for (const base of INSTANCES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${base}/streams/${id}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);
      if (data && ((data.videoStreams || []).length || (data.audioStreams || []).length)) return data;
      throw new Error('No streams in response');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Could not get download links');
}
function buildDownloadOptions(data) {
  const opts = [];
  // Video: khử trùng theo quality, giữ bitrate cao nhất, ưu tiên MP4.
  const byQuality = new Map();
  for (const s of data.videoStreams || []) {
    const q = String(s.quality || '').trim();
    if (!/^\d+p$/.test(q)) continue; // bỏ LBRY / HLS — không phải file tải
    const h = parseInt(q, 10);
    const prev = byQuality.get(q);
    const score = (s.bitrate || 0) + (String(s.format || '').includes('MP4') || String(s.mimeType || '').includes('mp4') ? 1 : 0);
    if (!prev || score > prev._score) byQuality.set(q, { ...s, _score: score, _h: h });
  }
  const videos = [...byQuality.values()].sort((a, b) => b._h - a._h);
  for (const s of videos) {
    const fmt = String(s.format || s.mimeType || '').replace('MPEG_4', 'MP4').replace('video/', '').toUpperCase();
    const hasAudio = s.videoOnly === false;
    opts.push({
      kind: 'video', label: s.quality,
      sub: `${s.quality === '2160p' ? t('quality.sub2160') : s.quality === '1440p' ? t('quality.sub1440') : s.quality === '1080p' ? t('quality.sub1080') : s.quality === '720p' ? t('quality.sub720') : ''} · ${fmtSize(s.contentLength)} · ${fmt || 'MP4'} · ${hasAudio ? t('download.videoAudio') : t('download.videoOnly')}`,
      format: fmt || 'MP4', size: s.contentLength || 0, url: s.url,
    });
  }
  // Audio: giữ bitrate cao nhất cho mỗi format.
  const byFmt = new Map();
  for (const s of data.audioStreams || []) {
    const fmt = String(s.format || s.mimeType || '').replace('audio/', '').toUpperCase();
    const prev = byFmt.get(fmt);
    if (!prev || (s.bitrate || 0) > (prev.bitrate || 0)) byFmt.set(fmt, s);
  }
  for (const s of [...byFmt.values()].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))) {
    const fmt = String(s.format || s.mimeType || '').replace('audio/', '').toUpperCase();
    opts.push({
      kind: 'audio', label: `Audio · ${s.bitrate ? Math.round(s.bitrate / 1000) + ' kbps' : 'best quality'}`,
      sub: `${fmtSize(s.contentLength)} · ${fmt || 'M4A'} · ${t('quality.audioOnly')}`,
      format: fmt || 'M4A', size: s.contentLength || 0, url: s.url,
    });
  }
  return opts;
}
function openDownloadSheet(video) {
  const v = video || currentVideo;
  if (!v || !videoId(v)) { toast(t('toast.openFirst')); return; }
  dlSheetVideo = { id: videoId(v), title: v.title || '', uploader: v.uploaderName || v.uploader || '', thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${videoId(v)}/hqdefault.jpg` };
  dlSheetOptions = [];
  dlSelected = null;
  $('downloadThumb').src = dlSheetVideo.thumbnail;
  $('downloadSheetTitle').textContent = dlSheetVideo.title;
  $('downloadSheetChannel').textContent = dlSheetVideo.uploader;
  $('downloadStatus').innerHTML = `<div class="spinner"></div>${esc(t('download.gettingLinks'))}`;
  $('downloadList').innerHTML = '';
  $('downloadGoBtn').disabled = true;
  $('downloadGoBtn').textContent = t('download.go');
  $('downloadCopyBtn').hidden = true;
  $('downloadRetryBtn').hidden = true;
  $('downloadSheet').hidden = false;
  loadDownloadOptions();
}
function closeDownloadSheet() { $('downloadSheet').hidden = true; }
async function loadDownloadOptions() {
  if (!dlSheetVideo || dlFetching) return;
  dlFetching = true;
  try {
    const data = await fetchStreamLinks(dlSheetVideo.id);
    dlSheetOptions = buildDownloadOptions(data);
    dlFetching = false;
    if (!dlSheetOptions.length) {
      $('downloadStatus').textContent = t('download.noStreams');
      $('downloadRetryBtn').hidden = false;
      return;
    }
    $('downloadStatus').textContent = '';
    renderDownloadOptions();
  } catch (e) {
    dlFetching = false;
    const msg = String(e && e.message || e);
    $('downloadStatus').textContent = msg.includes('SignInConfirmNotBot') || msg.includes('403')
      ? t('download.noLinksBlocked')
      : t('download.noLinks');
    $('downloadRetryBtn').hidden = false;
  }
}
function renderDownloadOptions() {
  $('downloadList').innerHTML = dlSheetOptions.map((o, i) =>
    `<button class="dl-row${dlSelected === i ? ' selected' : ''}" data-i="${i}">
      <span class="dl-radio">${dlSelected === i ? '●' : '○'}</span>
      <span class="dl-row-text"><span class="dl-row-title">${esc(o.label)}</span>
      <span class="dl-row-sub">${esc(o.sub)}</span></span>
    </button>`).join('');
  const sel = dlSelected != null ? dlSheetOptions[dlSelected] : null;
  const go = $('downloadGoBtn');
  go.disabled = !sel;
  go.textContent = sel ? `${t('download.go')} ${sel.label}${sel.size ? ' · ' + fmtSize(sel.size) : ''}` : t('download.go');
}
function recordDownload(opt) {
  const rec = {
    id: dlSheetVideo.id, title: dlSheetVideo.title, uploader: dlSheetVideo.uploader,
    thumbnail: dlSheetVideo.thumbnail, quality: opt.label, format: opt.format,
    size: opt.size || 0, kind: opt.kind, at: Date.now(), url: opt.url, status: 'opened',
  };
  downloads = [rec, ...downloads.filter((d) => !(d.id === rec.id && d.quality === rec.quality))].slice(0, 50);
  store.set('downloads', downloads);
}
function startDownload() {
  const opt = dlSelected != null ? dlSheetOptions[dlSelected] : null;
  if (!opt || !dlSheetVideo) return;
  recordDownload(opt);
  const safeTitle = (dlSheetVideo.title || 'video').replace(/[\\/:*?"<>|]/g, '').slice(0, 80) || 'video';
  const ext = (opt.format || 'mp4').toLowerCase().includes('webm') ? 'webm' : opt.kind === 'audio' ? 'm4a' : 'mp4';
  const filename = `${safeTitle} [${opt.label}].${ext}`;
  // <a download> bị Safari/WKWebView bỏ qua với link cross-origin — thử
  // trước, rồi mở tab mới kèm hướng dẫn long-press (đúng cách tai-anh-4k).
  try {
    const a = document.createElement('a');
    a.href = opt.url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch { /* rơi xuống mở tab */ }
  window.open(opt.url, '_blank', 'noopener');
  $('downloadStatus').innerHTML = t('download.openedNote');
  $('downloadCopyBtn').hidden = false;
  toast(t('download.opened'));
  renderDownloads();
}
function copyDownloadLink() {
  const opt = dlSelected != null ? dlSheetOptions[dlSelected] : null;
  if (!opt) return;
  navigator.clipboard?.writeText(opt.url).then(() => toast(t('download.linkCopied'))).catch(() => toast(opt.url));
}

// ---------- Saved > Downloads (screenshot 07) ----------
function renderDownloads() {
  const list = downloads.filter((d) => d.kind === dlTab || (dlTab === 'video' && d.kind !== 'audio'));
  const countV = downloads.filter((d) => d.kind !== 'audio').length;
  const countA = downloads.filter((d) => d.kind === 'audio').length;
  $('dlCountVideos').textContent = countV ? String(countV) : '';
  $('dlCountMusic').textContent = countA ? String(countA) : '';
  $('dlTabVideos').classList.toggle('active', dlTab === 'video');
  $('dlTabMusic').classList.toggle('active', dlTab === 'audio');
  const el = $('downloadsList');
  if (!downloads.length) {
    el.innerHTML = `<p class="meta">${esc(t('download.noDownloads'))}</p>`;
    return;
  }
  if (!list.length) {
    el.innerHTML = `<p class="meta">${esc(dlTab === 'audio' ? t('download.noMusicDownloads') : t('download.noVideoDownloads'))}</p>`;
    return;
  }
  el.innerHTML = list.map((d, i) => {
    const idx = downloads.indexOf(d);
    return `<div class="dl-item">
      <img src="${esc(d.thumbnail || '')}" alt="" loading="lazy" referrerpolicy="no-referrer">
      <div class="dl-item-text">
        <div class="dl-item-title">${esc(d.title)}</div>
        <div class="meta">${esc(d.uploader)} · ${esc(d.quality)}${d.size ? ' · ' + fmtSize(d.size) : ''} · ${timeAgo(d.at)}</div>
        <div class="dl-item-status">${d.status === 'opened' ? esc(t('download.openedStatus')) : esc(d.status || '')}</div>
        <div class="dl-progress"><div style="width:100%"></div></div>
      </div>
      <div class="dl-item-actions">
        <button class="pill" data-dl-open="${idx}">${esc(t('saved.open'))}</button>
        <button class="pill" data-dl-remove="${idx}">${esc(t('saved.remove'))}</button>
      </div>
    </div>`;
  }).join('');
}

// ---------- Library > Storage ----------
async function renderStorage() {
  const el = $('storageInfo');
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const used = est.usage || 0, quota = est.quota || 0;
      el.textContent = quota
        ? t('library.storageUsedQuota', { used: fmtSize(used), quota: fmtSize(quota) })
        : t('library.storageUsed', { used: fmtSize(used) });
      const settingsEl = $('settingsStorageInfo');
      if (settingsEl) settingsEl.textContent = el.textContent;
    } else {
      el.textContent = t('library.storageUnavailable');
      const settingsEl = $('settingsStorageInfo');
      if (settingsEl) settingsEl.textContent = el.textContent;
    }
  } catch {
    el.textContent = t('library.storageUnavailable');
    const settingsEl = $('settingsStorageInfo');
    if (settingsEl) settingsEl.textContent = el.textContent;
  }
}

// ---------- Like / Dislike / Save / Subscribe (local only, like Android's offline state) ----------
function likeMetaFor(v) {
  return { id: videoId(v), title: v.title, uploader: v.uploaderName || v.uploader || '', thumbnail: v.thumbnail || '', duration: v.duration };
}
function toggleLike(id, video) {
  if (!id) return;
  if (liked.has(id)) {
    liked.delete(id); delete likedMeta[id];
    toast(t('toast.likedRemoved'));
  } else {
    liked.add(id);
    if (video) likedMeta[id] = likeMetaFor(video);
    disliked.delete(id);
    toast(t('toast.likedAdded'));
  }
  store.set('liked', [...liked]);
  store.set('likedMeta', likedMeta);
  store.set('disliked', [...disliked]);
  if (currentVideo && currentVideo.id === id) syncWatchButtons();
  const heart = $('mpLikeBtn');
  if (heart) { heart.textContent = liked.has(id) ? '♥' : '♡'; heart.classList.toggle('liked', liked.has(id)); }
}
function toggleDislike(id) {
  if (!id) return;
  if (disliked.has(id)) disliked.delete(id);
  else { disliked.add(id); liked.delete(id); delete likedMeta[id]; }
  store.set('disliked', [...disliked]);
  store.set('liked', [...liked]);
  store.set('likedMeta', likedMeta);
  if (currentVideo && currentVideo.id === id) syncWatchButtons();
}
function toggleSave(video) {
  const id = videoId(video);
  if (!id) return;
  if (savedVideos[id]) { delete savedVideos[id]; toast(t('toast.savedRemoved')); }
  else { savedVideos[id] = likeMetaFor(video); toast(t('toast.savedAdded')); }
  store.set('savedVideos', savedVideos);
  if (currentVideo && currentVideo.id === id) syncWatchButtons();
}
function toggleSubscribe(channel, meta) {
  if (!channel) return;
  if (subscribed.has(channel)) {
    subscribed.delete(channel);
    delete subMeta[channel];
    toast(t('toast.unsubscribed', { name: channel }));
  } else {
    subscribed.add(channel);
    subMeta[channel] = Object.assign({ avatar: '', channelId: '', subscribedAt: Date.now() }, meta || {});
    toast(t('toast.subscribed', { name: channel }));
  }
  store.set('subscribed', [...subscribed]);
  store.set('subMeta', subMeta);
  if (currentVideo && currentVideo.uploader === channel) syncWatchButtons();
  renderLibrarySubs();
  updateChannelHeadSubBtn();
}

// ---------- Bước 5 — Settings + SponsorBlock + Subscriptions ----------
// Android v2.2.0 Settings (SettingsScreen.kt): Appearance & Theme
// (Liquid Glass toggle, theme System/Dark/Light/AMOLED), General
// Modification switches, SponsorBlock with per-category actions, Storage,
// About. Only switches that actually do something in this web app are
// included — no fake toggles.
let appSettings = Object.assign({ glass: true, theme: 'system', bgPlayback: true, autoplayNext: true }, store.get('settings', {}));
// SponsorBlock (Android SponsorBlock.kt): categories + defaults.
// Android defaults: sponsor=Skip(Auto), selfpromo/interaction=Ask,
// intro/outro/preview=Show, music_offtopic/filler=Off. This web build
// only does Auto-skip (checkbox = skip automatically); Ask/Show are not
// implemented, so defaults here are ON for sponsor/intro/outro, OFF else.
const SB_CATEGORIES = [
  { key: 'sponsor', label: 'Sponsor', color: '#00d400' },
  { key: 'intro', label: 'Intro', color: '#00ffff' },
  { key: 'outro', label: 'Outro and credits', color: '#0202ed' },
  { key: 'selfpromo', label: 'Self-promotion', color: '#ffff00' },
  { key: 'interaction', label: 'Like and subscribe reminder', color: '#cc00ff' },
  { key: 'music_offtopic', label: 'Non-music part of a music video', color: '#ff9900' },
];
let sbSettings = Object.assign(
  { enabled: true, cats: { sponsor: true, intro: true, outro: true, selfpromo: false, interaction: false, music_offtopic: false } },
  store.get('sbSettings', {}));
const sbCache = new Map();   // videoId -> [{start, end, category, label}] (seconds)
const sbFetching = new Set();
let sbLastSkip = null;       // {key, at} — tránh toast trùng khi seek chưa kịp
const SB_API = 'https://sponsor.ajay.app/api/skipSegments';
async function fetchSB(id) {
  if (!id || sbCache.has(id) || sbFetching.has(id)) return;
  const cats = SB_CATEGORIES.filter((c) => sbSettings.cats[c.key]).map((c) => c.key);
  if (!sbSettings.enabled || !cats.length) { sbCache.set(id, []); return; }
  sbFetching.add(id);
  try {
    const url = `${SB_API}?videoID=${encodeURIComponent(id)}&categories=${encodeURIComponent(JSON.stringify(cats))}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.status === 404) { sbCache.set(id, []); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const segs = (Array.isArray(data) ? data : []).map((s) => ({
      start: s.segment[0], end: s.segment[1], category: s.category,
      label: t('sb.' + (s.category === 'music_offtopic' ? 'musicOfftopic' : s.category)),
    })).filter((s) => s.end - s.start >= 1 && sbSettings.cats[s.category])
      .sort((a, b) => a.start - b.start);
    sbCache.set(id, segs);
  } catch { sbCache.set(id, []); } // offline / API lỗi: phát bình thường, không báo lỗi
  finally { sbFetching.delete(id); }
}
function checkSbFor(p, id) {
  if (!p || !id || !sbSettings.enabled) return;
  const segs = sbCache.get(id);
  if (!segs || !segs.length) return;
  let t = 0;
  try { t = p.getCurrentTime(); } catch { return; }
  const seg = segs.find((s) => t >= s.start && t < s.end - 0.2);
  if (!seg) return;
  const key = `${id}:${seg.start}`;
  if (sbLastSkip && sbLastSkip.key === key && Date.now() - sbLastSkip.at < 3000) return;
  sbLastSkip = { key, at: Date.now() };
  try { p.seekTo(seg.end + 0.1, true); } catch { /* ignore */ }
  toast(t('sb.skipped', { label: seg.label.toLowerCase() }));
}
// Một tick chung 250ms cho lời bài hát + SponsorBlock (không tạo timer
// thứ hai tranh nhau đọc getCurrentTime). Tự dừng khi không còn player.
let playbackTimer = null;
function playbackTick() {
  try { if (lyricsSynced && lyricsOpen) updateLyricsHighlight(); } catch { /* ignore */ }
  if (sbSettings.enabled) {
    if (player && currentVideo) checkSbFor(player, currentVideo.id);
    if (shortsCurrentId) {
      const sp = shortsPlayers.get(shortsCurrentId);
      if (sp && sp !== player) checkSbFor(sp, shortsCurrentId);
    }
  }
  if (!player && !shortsCurrentId) stopPlaybackTick();
}
function ensurePlaybackTick() { if (!playbackTimer) playbackTimer = setInterval(playbackTick, 250); }
function stopPlaybackTick() { if (playbackTimer) { clearInterval(playbackTimer); playbackTimer = null; } }

// ---------- Subscriptions (local, no Google login) ----------
// `subscribed` (Set tên kênh, đã có từ v1) giữ nguyên để tương thích;
// `subMeta` thêm avatar + channelId để mở được video của kênh đó.
let subMeta = store.get('subMeta', {}); // name -> {avatar, channelId, subscribedAt}
function channelIdFromUrl(url) {
  const m = String(url || '').match(/\/channel\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}
function renderLibrarySubs() {
  const el = $('librarySubs');
  if (!el) return;
  const subs = [...subscribed];
  el.innerHTML = subs.length ? subs.map((name) => {
    const m = subMeta[name] || {};
    const avatar = m.avatar
      ? `<img class="sub-avatar-img" src="${esc(m.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : `<span class="sub-avatar">${esc(name.charAt(0).toUpperCase())}</span>`;
    return `<div class="sub-row" data-sub="${esc(name)}">${avatar}<span class="sub-name">${esc(name)}</span><button class="pill sub-unsub" data-unsub="${esc(name)}">${esc(t('library.unsubscribe'))}</button></div>`;
  }).join('') : `<p class="meta">${esc(t('library.noSubs'))}</p>`;
}
function updateChannelHeadSubBtn() {
  const btn = $('channelHeadSubBtn');
  if (!btn) return;
  const name = $('channelHeadName').textContent;
  btn.textContent = name && subscribed.has(name) ? t('watch.subscribed') : t('watch.subscribe');
}
async function openChannel(name) {
  closeLibrary(); closeSaved(); closeShorts();
  $('channelHead').hidden = false;
  $('channelHeadAvatar').src = (subMeta[name] && subMeta[name].avatar) || '';
  $('channelHeadName').textContent = name;
  $('channelHeadMeta').textContent = t('common.channel');
  updateChannelHeadSubBtn();
  window.scrollTo({ top: 0 });
  spinner(t('status.loadingChannel'));
  grid.innerHTML = '';
  let items = [];
  const cid = subMeta[name] && subMeta[name].channelId;
  if (cid) {
    try {
      const data = await piped(`/channel/${cid}`);
      items = (data.relatedStreams || []).filter((v) => videoId(v));
    } catch { /* rơi xuống tìm theo tên kênh */ }
  }
  if (!items.length) {
    try {
      const data = await piped(`/search?q=${encodeURIComponent(name)}&filter=videos`);
      items = (data.items || []).filter((v) => {
        const u = (v.uploaderName || v.uploader || '').toLowerCase();
        const n = name.toLowerCase();
        return videoId(v) && (u === n || u.includes(n) || n.includes(u) || (cid && (v.uploaderUrl || '').includes(cid)));
      });
    } catch { /* ignore */ }
  }
  if (!items.length) { showFeed([]); showStatus(t('status.noVideosChannel', { name })); return; }
  showFeed(items.slice(0, 24));
}
async function fetchSubscribedVideos() {
  const out = [];
  const seen = new Set();
  for (const name of [...subscribed].slice(0, 3)) {
    try {
      const cid = subMeta[name] && subMeta[name].channelId;
      const data = await piped(`/search?q=${encodeURIComponent(name)}&filter=videos`);
      for (const v of data.items || []) {
        const id = videoId(v);
        if (!id || seen.has(id)) continue;
        const u = (v.uploaderName || v.uploader || '').toLowerCase();
        if (u === name.toLowerCase() || u.includes(name.toLowerCase()) || (cid && (v.uploaderUrl || '').includes(cid))) {
          seen.add(id); out.push(v);
        }
      }
    } catch { /* kênh này lỗi: thử kênh sau */ }
  }
  return out;
}

// ---------- Settings (Bước 5) ----------
function applySettings() {
  document.body.classList.toggle('no-glass', !appSettings.glass);
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-amoled');
  if (appSettings.theme === 'dark') document.body.classList.add('theme-dark');
  else if (appSettings.theme === 'light') document.body.classList.add('theme-light');
  else if (appSettings.theme === 'amoled') document.body.classList.add('theme-amoled');
  // System = không class: CSS prefers-color-scheme tự quyết.
  syncSettingsUI();
}
function renderSbCategories() {
  $('sbCategories').innerHTML = SB_CATEGORIES.map((c) =>
    `<label class="settings-row sb-row"><span><span class="sb-dot" style="background:${c.color}"></span><span class="settings-title">${esc(t('sb.' + (c.key === 'music_offtopic' ? 'musicOfftopic' : c.key)))}</span><span class="settings-sub">${esc(t('settings.sbCatSub'))}</span></span><span class="switch"><input type="checkbox" data-sb-cat="${c.key}" ${sbSettings.cats[c.key] ? 'checked' : ''} ${sbSettings.enabled ? '' : 'disabled'}><span class="slider"></span></span></label>`).join('');
}
function syncSettingsUI() {
  $('glassToggle').checked = !!appSettings.glass;
  $('bgPlaybackToggle').checked = !!appSettings.bgPlayback;
  $('autoplayNextToggle').checked = !!appSettings.autoplayNext;
  document.querySelectorAll('#themeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.theme === appSettings.theme));
  $('sbToggle').checked = !!sbSettings.enabled;
  $('settingsQualitySub').textContent = t('settings.playbackQualitySub', { label: qualityLabelFor(qualityLock) });
  renderSbCategories();
}
function openSettings() {
  if ($('watch').classList.contains('open')) closeVideo(true);
  if (!$('music-player-view').hidden) closeMusicPlayer(true);
  closeShorts();
  hideAllSections();
  $('settings-view').hidden = false;
  $('settingsStorageInfo').textContent = $('storageInfo').textContent;
  document.querySelectorAll('.bottom-nav-btn').forEach((b) => b.classList.remove('active'));
  window.scrollTo({ top: 0 });
}
function closeSettings() {
  if ($('settings-view').hidden) return;
  $('settings-view').hidden = true;
  $('home').classList.remove('hidden');
  $('chips').classList.remove('hidden');
  setActiveTab('home');
}
function clearCache() {
  // Only cache keys — liked / saved / downloads / subscriptions stay.
  ['history', 'prefWords', 'shortsSeen'].forEach((k) => { try { localStorage.removeItem('ytxtube:' + k); } catch { /* ignore */ } });
  history = []; prefWords = {}; shortsSeen = new Set();
  renderStorage();
  toast(t('toast.cacheCleared'));
}

// ---------- Sự kiện ----------
grid.addEventListener('click', (e) => {
  const menu = e.target.closest('[data-menu]');
  if (menu) { e.stopPropagation(); toast(t('common.moreOptions')); return; }
  const card = e.target.closest('.card');
  if (card) openVideo(card.dataset.id);
});
$('relatedGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openVideo(card.dataset.id);
});
$('libraryHistory').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openVideo(card.dataset.id);
});
$('libraryLiked').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openVideo(card.dataset.id);
});
$('savedGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openVideo(card.dataset.id);
});
$('backBtn').addEventListener('click', () => closeVideo(true));
$('commentsFab').addEventListener('click', () => {
  const c = document.querySelector('.comments');
  if (window.innerWidth < 900) c.classList.toggle('drawer-open');
  else c.scrollIntoView({ behavior: 'smooth' });
});
$('homeBtn').addEventListener('click', (e) => { e.preventDefault(); openHome(); });
$('searchToggleBtn').addEventListener('click', () => {
  const row = $('searchRow');
  row.hidden = !row.hidden;
  if (!row.hidden) $('searchInput').focus();
});
$('searchBtn').addEventListener('click', () => doSearch($('searchInput').value));
$('searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(e.target.value); });
$('historyBtn').addEventListener('click', openLibrary);
$('likeBtn').addEventListener('click', () => { if (currentVideo) toggleLike(currentVideo.id, currentVideo); });
$('dislikeBtn').addEventListener('click', () => { if (currentVideo) toggleDislike(currentVideo.id); });
$('saveBtn').addEventListener('click', () => { if (currentVideo) toggleSave(currentVideo); });
$('downloadBtn').addEventListener('click', () => openDownloadSheet(currentVideo));
$('qualityBtn').addEventListener('click', openQualitySheet);
$('qualityCloseBtn').addEventListener('click', closeQualitySheet);
$('qualityList').addEventListener('click', (e) => {
  const row = e.target.closest('[data-level]');
  if (row && !row.disabled) setQuality(row.dataset.level);
});
$('downloadCloseBtn').addEventListener('click', closeDownloadSheet);
$('downloadGoBtn').addEventListener('click', startDownload);
$('downloadCopyBtn').addEventListener('click', copyDownloadLink);
$('downloadRetryBtn').addEventListener('click', () => {
  $('downloadRetryBtn').hidden = true;
  $('downloadStatus').innerHTML = '<div class="spinner"></div>Getting download links…';
  loadDownloadOptions();
});
$('downloadList').addEventListener('click', (e) => {
  const row = e.target.closest('.dl-row');
  if (!row) return;
  dlSelected = Number(row.dataset.i);
  renderDownloadOptions();
});
// Quality + Download sheets: tap the backdrop area (the sheet itself,
// outside its content) closes it — same pattern as the comments drawer.
['downloadSheet', 'qualitySheet'].forEach((id) => {
  $(id).addEventListener('click', (e) => { if (e.target === $(id)) $(id).hidden = true; });
});
$('mpDownloadBtn').addEventListener('click', () => openDownloadSheet(currentMusic ? currentMusic.video : currentVideo));
$('shortsQualityBtn').addEventListener('click', openQualitySheet);
$('dlTabVideos').addEventListener('click', () => { dlTab = 'video'; renderDownloads(); });
$('dlTabMusic').addEventListener('click', () => { dlTab = 'audio'; renderDownloads(); });
$('downloadsList').addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-dl-open]');
  const removeBtn = e.target.closest('[data-dl-remove]');
  if (openBtn) {
    const d = downloads[Number(openBtn.dataset.dlOpen)];
    if (d && d.url) window.open(d.url, '_blank', 'noopener');
  } else if (removeBtn) {
    downloads.splice(Number(removeBtn.dataset.dlRemove), 1);
    store.set('downloads', downloads);
    renderDownloads();
    toast(t('toast.downloadRemoved'));
  }
});
$('clearCacheBtn').addEventListener('click', clearCache);
$('subscribeBtn').addEventListener('click', () => {
  if (currentVideo) toggleSubscribe(currentVideo.uploader, {
    avatar: currentVideo.uploaderAvatar || '',
    channelId: channelIdFromUrl(currentVideo.uploaderUrl || ''),
  });
});
// ---------- Sự kiện Settings + Subscriptions (Bước 5) ----------
$('settingsBtn').addEventListener('click', openSettings);
$('settingsBackBtn').addEventListener('click', closeSettings);
$('glassToggle').addEventListener('change', (e) => {
  appSettings.glass = e.target.checked;
  store.set('settings', appSettings);
  applySettings();
  toast(appSettings.glass ? t('toast.glassOn') : t('toast.glassOff'));
});
$('bgPlaybackToggle').addEventListener('change', (e) => {
  appSettings.bgPlayback = e.target.checked;
  store.set('settings', appSettings);
  toast(appSettings.bgPlayback ? t('toast.bgOn') : t('toast.bgOff'));
});
$('autoplayNextToggle').addEventListener('change', (e) => {
  appSettings.autoplayNext = e.target.checked;
  store.set('settings', appSettings);
});
$('themeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-theme]');
  if (!b) return;
  appSettings.theme = b.dataset.theme;
  store.set('settings', appSettings);
  applySettings();
});
$('langSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  setLanguage(b.dataset.lang);
});
$('sbToggle').addEventListener('change', (e) => {
  sbSettings.enabled = e.target.checked;
  store.set('sbSettings', sbSettings);
  if (!sbSettings.enabled) sbCache.clear();
  syncSettingsUI();
  toast(sbSettings.enabled ? t('sb.on') : t('sb.off'));
});
$('sbCategories').addEventListener('change', (e) => {
  const cb = e.target.closest('[data-sb-cat]');
  if (!cb) return;
  sbSettings.cats[cb.dataset.sbCat] = cb.checked;
  store.set('sbSettings', sbSettings);
  sbCache.clear(); // category set changed — refetch segments for new videos
});
$('settingsQualityBtn').addEventListener('click', openQualitySheet);
$('settingsClearCacheBtn').addEventListener('click', clearCache);
$('channelHeadSubBtn').addEventListener('click', () => {
  const name = $('channelHeadName').textContent;
  if (name) toggleSubscribe(name, subMeta[name]);
});
$('librarySubs').addEventListener('click', (e) => {
  const unsub = e.target.closest('[data-unsub]');
  if (unsub) { toggleSubscribe(unsub.dataset.unsub); return; }
  const row = e.target.closest('[data-sub]');
  if (row) openChannel(row.dataset.sub);
});
$('moreBtn').addEventListener('click', () => {
  const d = $('watchDesc');
  const expanded = d.textContent === d.dataset.full;
  d.textContent = expanded ? (d.dataset.full.length > 180 ? d.dataset.full.slice(0, 180) + '…' : d.dataset.full) : d.dataset.full;
  $('moreBtn').textContent = expanded ? t('watch.more') : t('watch.less');
});
$('shareBtn').addEventListener('click', async () => {
  if (!currentVideo) return;
  const url = `https://www.youtube.com/watch?v=${currentVideo.id}`;
  if (navigator.share) {
    try { await navigator.share({ title: currentVideo.title, url }); return; }
    catch { /* người dùng huỷ chia sẻ: rơi xuống copy */ }
  }
  try { await navigator.clipboard.writeText(url); toast(t('toast.linkCopied')); }
  catch { toast(url); }
});

// ---------- Sự kiện Nhạc + Lời (Bước 3) ----------
$('musicNavBtn').addEventListener('click', openMusic);
$('musicSearchBtn').addEventListener('click', () => doMusicSearch($('musicSearchInput').value));
$('musicSearchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') doMusicSearch(e.target.value); });
$('musicGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const v = musicList.find((x) => videoId(x) === card.dataset.id);
  if (v) openMusicPlayer(v, musicList);
});
[['musicRecent', null], ['musicLiked', null]].forEach(([boxId]) => {
  $(boxId).addEventListener('click', (e) => {
    const card = e.target.closest('.shelf-card');
    if (!card) return;
    const id = card.dataset.id;
    const fromLiked = likedMeta[id];
    const v = musicList.find((x) => videoId(x) === id)
      || (fromLiked ? { id, title: fromLiked.title, uploader: fromLiked.uploader, thumbnail: fromLiked.thumbnail, duration: fromLiked.duration } : null)
      || { id, title: '', uploader: '' };
    openMusicPlayer(v, musicList.length ? musicList : [v]);
  });
});
// Now Playing controls (Android screenshot 04).
$('mpBackBtn').addEventListener('click', () => closeMusicPlayer(true));
$('mpMenuBtn').addEventListener('click', () => toast(t('common.moreOptions')));
$('mpLikeBtn').addEventListener('click', () => {
  if (currentMusic) toggleLike(videoId(currentMusic.video), currentMusic.video);
});
$('mpPlayBtn').addEventListener('click', () => {
  if (!player) return;
  try { if (playerPlaying) player.pauseVideo(); else player.playVideo(); } catch { /* ignore */ }
});
$('mpPrevBtn').addEventListener('click', () => playMusicAt(currentMusic ? currentMusic.index - 1 : -1));
$('mpNextBtn').addEventListener('click', () => playMusicAt(currentMusic ? currentMusic.index + 1 : -1));
$('mpShuffleBtn').addEventListener('click', () => {
  mpShuffle = !mpShuffle;
  $('mpShuffleBtn').classList.toggle('liked', mpShuffle);
  toast(mpShuffle ? t('toast.shuffleOn') : t('toast.shuffleOff'));
});
$('mpRepeatBtn').addEventListener('click', () => {
  mpRepeat = !mpRepeat;
  $('mpRepeatBtn').classList.toggle('liked', mpRepeat);
  toast(mpRepeat ? t('toast.repeatOn') : t('toast.repeatOff'));
});
$('mpSeek').addEventListener('change', (e) => {
  if (!player) return;
  try {
    const dur = player.getDuration() || 0;
    player.seekTo((Number(e.target.value) / 100) * dur, true);
  } catch { /* ignore */ }
});
$('mpLyricsBtn').addEventListener('click', () => {
  if (lyricsOpen) closeLyrics(); else openLyrics();
});
$('mpLyricsCloseBtn').addEventListener('click', closeLyrics);
$('mpQueueBtn').addEventListener('click', () => {
  if (!currentMusic) return;
  toast(t('music.queueToast', { n: currentMusic.queue.length, s: currentMusic.queue.length === 1 ? '' : 's', i: currentMusic.index + 1 }));
});
// Mini player (Android v2.2.0).
$('miniPlayBtn').addEventListener('click', () => {
  if (!player) return;
  try { if (playerPlaying) player.pauseVideo(); else player.playVideo(); } catch { /* ignore */ }
});
$('miniNextBtn').addEventListener('click', miniNext);
$('miniCloseBtn').addEventListener('click', () => {
  stopPlayer();
  hideMiniPlayer();
  if (mpTimer) { clearInterval(mpTimer); mpTimer = null; }
  currentMusic = null;
  currentVideo = null;
});
$('lyricsBtn').addEventListener('click', () => {
  if (lyricsOpen) closeLyrics(); else openLyrics();
});
$('lyricsCloseBtn').addEventListener('click', closeLyrics);
$('lyricsRetryBtn').addEventListener('click', () => {
  lyricsForId = null; // ép tải lại từ đầu
  openLyrics();
});
// Chạm vào câu hát: nhảy tới đúng giây đó (YT.Player.seekTo, đã ghi trong docs).
['lyricsLines', 'mpLyricsLines'].forEach((boxId) => {
  $(boxId).addEventListener('click', (e) => {
    const line = e.target.closest('.lyrics-line');
    if (!line || !player) return;
    try { player.seekTo(Number(line.dataset.time) / 1000, true); player.playVideo(); } catch { /* bỏ qua */ }
  });
});

// ---------- Sự kiện tab dưới + Shorts ----------
$('shortsNavBtn').addEventListener('click', openShorts);
$('homeNavBtn').addEventListener('click', openHome);
$('libraryNavBtn').addEventListener('click', openLibrary);
$('savedNavBtn').addEventListener('click', openSaved);
$('shortsBackBtn').addEventListener('click', closeShorts);
$('shortsMuteTopBtn').addEventListener('click', toggleShortsMute);
$('shortsRefreshBtn').addEventListener('click', () => loadShorts(true));
$('shortsSearchBtn').addEventListener('click', () => {
  closeShorts();
  $('searchRow').hidden = false;
  $('searchInput').focus();
});
$('shortsCommentsClose').addEventListener('click', () => { $('shortsCommentsDrawer').hidden = true; });
$('shortsFeed').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'like') {
      if (!id) return;
      const v = shortsList.find((x) => videoId(x) === id);
      toggleLike(id, v);
      btn.classList.toggle('liked', liked.has(id));
    } else if (action === 'dislike') {
      if (!id) return;
      toggleDislike(id);
      btn.classList.toggle('liked', disliked.has(id));
    } else if (action === 'comment') {
      if (id) openShortsComments(id);
    } else if (action === 'download') {
      const v = shortsList.find((x) => videoId(x) === id);
      if (v) openDownloadSheet(v);
    } else if (action === 'share') {
      if (!id) return;
      const url = `https://www.youtube.com/shorts/${id}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Shorts', url }); return; } catch { /* huỷ: rơi xuống copy */ }
      }
      try { await navigator.clipboard.writeText(url); toast(t('shorts.linkCopied')); }
      catch { toast(url); }
    } else if (action === 'subscribe') {
      if (btn.dataset.channel) {
        toggleSubscribe(btn.dataset.channel);
        btn.textContent = subscribed.has(btn.dataset.channel) ? t('watch.subscribed') : t('watch.subscribe');
      }
    }
    return;
  }
  // Chạm vào vùng video (không phải nút): bật/tắt tiếng.
  const slide = e.target.closest('.shorts-slide');
  if (slide) toggleShortsMute();
});
// Gần cuối feed Shorts thì tải thêm (cuộn vô hạn trong feed dọc).
$('shortsFeed').addEventListener('scroll', () => {
  const f = $('shortsFeed');
  if (f.scrollHeight - f.scrollTop - f.clientHeight < 600 && !shortsLoading) loadShorts();
}, { passive: true });

// Cuộn vô hạn: gần cuối trang thì vẽ thêm 12 thẻ.
window.addEventListener('scroll', () => {
  if ($('watch').classList.contains('open')) return;
  if (!$('shorts-view').hidden) return;
  if (window.innerHeight + window.scrollY > document.body.scrollHeight - 900 && rendered < feed.length) renderBatch();
}, { passive: true });

// ---------- Khởi động ----------
(function init() {
  applySettings(); // theme / Liquid Glass / toggles from localStorage
  applyI18n(); // language from localStorage / device, live re-render (no reload)
  $('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) loadCategory(CATEGORIES[Number(chip.dataset.i)]);
  });
  $('musicChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.music-chip');
    if (chip) loadMusic(MUSIC_CATEGORIES[Number(chip.dataset.i)]);
  });
  loadTrending();
})();
