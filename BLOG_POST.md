# Konnn's Cinema — Xem phim, xem chung với bạn bè, tất cả trong một trang

![Trang chủ Konnn's Cinema](./screenshots/00-hero.png)
*Trang chủ Konnn's Cinema*

## Giới thiệu

Mình vừa hoàn thiện **Konnn's Cinema** — một trang xem phim online, làm ra để dùng thật chứ không chỉ để "cho có". Không quảng cáo nhấp nháy, không popup, giao diện sạch, và có một tính năng mình khá tâm đắc: **xem phim chung với bạn bè theo thời gian thực**, dù mỗi người một nơi.

Bài viết này giới thiệu nhanh những gì trang web làm được, để mọi người ghé qua dùng thử.

## Vì sao lại làm cái này?

Các web xem phim "chùa" hiện có thường giao diện rối, quảng cáo dày đặc, và gần như không có cách nào để cùng xem với người khác ngoài việc gọi video call song song rồi tự bấm play canh giờ. Mình muốn có một chỗ:

- Xem phim **sạch, nhanh, không quảng cáo**.
- Có thể **rủ bạn bè vào xem chung**, vừa xem vừa chat như đang ngồi cùng phòng khách.
- Dùng được luôn, không cần đăng ký tài khoản rườm rà.

![Trang chủ với các hàng đề xuất phim](./screenshots/01-homepage.png)
*Trang chủ: phim thịnh hành, mới cập nhật, và đề xuất theo thể loại yêu thích*

## Những tính năng chính

**🎬 Kho phim đa dạng** — phim lẻ, phim bộ, anime, có nhiều server để chọn, server này lỗi thì chuyển server khác ngay.

**👥 Xem Phim Chung (Watch Together)** — đây là tính năng mình thích nhất. Chỉ cần tạo phòng, gửi mã 6 ký tự cho bạn bè, cả nhóm sẽ xem đồng bộ tuyệt đối: ai bấm pause, tua, hay chuyển tập, mọi người trong phòng đều thấy ngay lập tức. Có sẵn khung chat, và cả bình luận bay ngang qua màn hình kiểu "danmaku" cho vui.

![Phòng Watch Together với chat và reactions](./screenshots/04-watch-party.png)
*Xem Phim Chung: đồng bộ phát, chat real-time, bình luận trôi nổi trên video*

**🌐 Song ngữ Việt/Anh** — chuyển đổi ngôn ngữ ngay trong giao diện.

**▶️ Trình phát mượt** — hỗ trợ Picture-in-Picture, đổi tốc độ phát, phím tắt tiện lợi, chế độ rạp chiếu thu gọn mọi thứ để tập trung vào phim.

![Trình phát video](./screenshots/03-player.png)
*Trình phát video với đầy đủ tùy chọn*

**📌 Lưu lịch sử & Yêu thích** — xem dở tập nào, lần sau vào lại đúng chỗ đó, không cần tài khoản vẫn nhớ. Phim thích thì bấm tim để lưu vào danh sách riêng.

**🔍 Tìm kiếm & lọc nâng cao** — lọc theo thể loại, quốc gia, năm phát hành, sắp xếp theo nhiều tiêu chí.

**🍿 Thông tin chi tiết kiểu "vé xem phim"** — trang chi tiết phim thiết kế như một tấm vé, kèm diễn viên, đạo diễn, và với anime thì có luôn số tập, điểm đánh giá, studio sản xuất, lịch chiếu.

![Trang chi tiết phim thiết kế kiểu vé xem phim](./screenshots/02-movie-detail.png)
*Trang chi tiết phim: thiết kế "vé xem phim", thông tin diễn viên, danh sách tập*

## Cách dùng nhanh

1. Vào trang chủ, lướt qua các mục đề xuất hoặc dùng ô tìm kiếm.
2. Bấm vào phim muốn xem → chọn server → chọn tập.
3. Muốn rủ bạn xem chung: bật "Xem Phim Chung" ở thanh bên → tạo phòng → gửi mã cho bạn bè.
4. Xem xong tập nào, lần sau quay lại sẽ tự nhớ tiến độ.

## Vài phím tắt hữu ích khi xem

| Phím | Chức năng |
|---|---|
| `Space` | Play / Pause |
| `F` | Toàn màn hình |
| `M` | Tắt/bật tiếng |
| `←` / `→` | Tua lùi / tiến |

## Đôi lời về công nghệ (cho ai tò mò)

Trang được xây bằng Next.js 16 và React 19, tính năng xem chung chạy qua Firebase Realtime Database để đồng bộ tức thời, video phát qua HLS. Có cả một phần thử nghiệm dùng WebGPU để tăng chất lượng hình ảnh ngay trên trình duyệt. Nếu bạn là dev và tò mò về kiến trúc bên trong, mình sẽ viết một bài riêng đi sâu hơn — bài này chủ yếu để giới thiệu cho mọi người dùng thử.

## Dùng thử ngay

Nếu bạn đang tìm một chỗ xem phim gọn gàng, không quảng cáo, và đặc biệt là có thể rủ bạn bè xem chung dù ở xa nhau — thử Konnn's Cinema xem sao. Góp ý hay báo lỗi gì cứ để lại cho mình nhé!

*Dự án phục vụ mục đích học tập, phi thương mại. Toàn bộ nội dung phim lấy từ API của bên thứ ba, trang không lưu trữ file phim nào.*
