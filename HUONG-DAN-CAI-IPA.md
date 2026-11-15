# Hướng dẫn cài IPA YTXTube iOS — iPhone 12 Pro Max, iOS 27

> Áp dụng cho Apple ID **miễn phí**: IPA ký kiểu này hết hạn sau **7 ngày**,
> tối đa **3 app** sideload cùng lúc. Hết 7 ngày thì mở SideStore/ESign bấm
> ký lại (không cần xoá app). **TrollStore không chạy được trên iOS 27**,
> nên không dùng cách đó.

## Chuẩn bị

- File `YTXTubeiOS-unsigned.ipa` (lấy từ GitHub Actions — xem README, Cách B)
  hoặc IPA đã ký từ máy Mac (Cách A).
- iPhone đã cài **SideStore** (khuyên dùng) hoặc **ESign** / **AltStore**.
- Apple ID miễn phí + mật khẩu ứng dụng nếu tài khoản bật 2FA.
- iPhone và máy tính (nếu dùng AltStore) chung Wi-Fi, hoặc chỉ cần iPhone
  nếu dùng SideStore.

## Cách 1 — SideStore (khuyên dùng)

1. Mở **SideStore** trên iPhone → đăng nhập Apple ID miễn phí của bạn.
2. Chuyển file IPA vào iPhone (AirDrop từ máy tính, hoặc tải về từ Safari/Files).
3. Trong SideStore: **My Apps → + → chọn file IPA** → chờ ký và cài đặt.
4. Mở app **YTXTube iOS** ngoài Màn hình chính, dùng như bình thường.
5. Sau 7 ngày: mở SideStore → **My Apps** → bấm **Refresh** để gia hạn
   (iPhone cần mở SideStore trong lúc gia hạn; nên gia hạn trước khi hết hạn).

## Cách 2 — ESign

1. Mở **ESign** → mục chứng chỉ: dùng chứng chỉ Apple ID miễn phí của bạn
   (ESign tự tạo khi bạn đăng nhập Apple ID trong app).
2. **Import** file IPA vào ESign → chọn chứng chỉ → **Sign** → **Install**.
3. Vào **Cài đặt → Cài đặt chung → Quản lý thiết bị** → tin cậy chứng chỉ
   Apple ID của bạn, rồi mở app.

## Cách 3 — AltStore

1. Cài **AltServer** trên máy tính, cắm iPhone, cài **AltStore** lên iPhone.
2. Mở AltStore → **My Apps → +** → chọn file IPA → chờ cài.
3. Gia hạn: mở AltStore khi iPhone và máy tính chung Wi-Fi, AltStore tự
   gia hạn trước khi hết hạn 7 ngày.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| `Unable to install / Could not install` | Xoá app cũ cùng Bundle ID (`com.vux.ytxtubeios`) rồi cài lại; kiểm tra còn slot trong 3 app miễn phí không. |
| Hết hạn 7 ngày, app xám không mở được | Mở SideStore/AltStore → Refresh / Re-sign, không cần xoá app. |
| SideStore đăng nhập lỗi `-80045` | Đổi Anisette server trong SideStore (Settings → Anisette), hoặc đăng xuất rồi đăng nhập lại Apple ID. |
| Mở app báo "Untrusted Developer" | Cài đặt → Cài đặt chung → Quản lý thiết bị → tin cậy Apple ID của bạn. |
| Video không phát / feed trống | Kiểm tra mạng (Wi-Fi/4G đều được), thử lại — máy chủ Piped miễn phí đôi khi bận. |

## Lưu ý

- Lần đầu mở app cần mạng để tải feed từ Piped và phát video từ YouTube.
- App không yêu cầu đăng nhập Google, không thu thập dữ liệu.
