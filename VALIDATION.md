# Kiểm tra bản 2.0 — 29/10/2026

Đã thực hiện trên Node 24, Chromium 154 và Python Playwright.

- Build production Vite thành công; JS ban đầu khoảng 84 KB gzip, các phần PDF/ảnh/QR/quản trị tải khi cần.
- Bộ kiểm tra tính toán và chia sẻ đạt: chuyển hóa đơn/kWh, tiền điện bậc thang, mái thiếu, pin thiếu, hòa lưới, chọn inverter, cân bằng điện sạc/xả, nhập không hợp lệ; URL Unicode, hạn link, dữ liệu hỏng và loại thông tin khách khỏi chia sẻ.
- E2E khách hàng, sửa/tìm, nhật ký, khảo sát và ảnh; danh mục, xác minh giá, xuất CSV; phiếu CSKH liên kết khách, serial, mức ưu tiên và lịch sử trạng thái.
- E2E sao lưu JSON, xem trước CSV/gộp, khôi phục JSON/bản an toàn trước khôi phục và từ chối file không đúng định dạng.
- E2E tính phương án → báo giá 13 dòng → sửa giá/tổng → tải PDF A4/PNG A4 → lưu bản chụp → tạo phiên bản tiếp theo.
- Phương án chưa khảo sát hoặc giá chưa xác minh không phát hành chính thức; phương án đã khảo sát và xác minh có thể phát hành; thay số tấm khác phương án chặn phát hành cho tới khi tính lại.
- QR thật, ảnh đúng 1080 px và mở link nén trong phiên trình duyệt độc lập; khách chỉ xem, không thấy thanh quản trị/hồ sơ nội bộ.
- Toàn bộ 10 màn hình production kiểm tra ở 360, 768, 1280 px: không tràn ngang trang và không có lỗi JavaScript pageerror. Trình xem bảng/báo giá có vùng cuộn riêng khi cần.
- Kiểm tra Supabase giả lập: phiên của dự án cũ không gửi token tới dự án mới; đăng nhập gắn đúng Project URL; vai trò viewer không có nút ghi hoạt động. Đây **không phải** kiểm thử backend Supabase thật.

Chưa có tài khoản/dự án Supabase thực tế để chạy schema và kiểm tra RLS trên máy chủ. Mã SQL và hướng dẫn triển khai được kèm theo; không mô tả cloud là đã vận hành sẵn.

Giá/datasheet/biểu giá và điều kiện khảo sát vẫn cần doanh nghiệp xác minh. Giao diện không được xem như cam kết sản lượng hoặc hồ sơ thiết kế kỹ thuật.

Nguồn cũ được giữ ở lịch sử Git. Không đưa hồ sơ khách thật trong file gốc lên bản public.


## Nâng cấp hình ảnh/mobile 2.1 — 30/10/2026

- Thay mô hình nhà SVG sai phối cảnh bằng ảnh minh họa mới; xuất WebP desktop/mobile, giữ ảnh gốc ngoài checkout.
- Logo Kim Solar chính thức giữ đúng tỷ lệ ở các điểm thương hiệu, PDF và ảnh1080.
- Icon ngữ nghĩa, màu tương phản; menu mobile và nút44px, chữ form16px; bỏ chuông thông báo giả và dấu xổ xuống ở nhãn không có menu.
- So sánh năng lượng trên dashboard dùng số tính toán thực của kịch bản; bỏ đồ thị mùa vụ được dựng sẵn.
- Kiểm tra tất cả10route Pages-base ở360/390/768/1280px, không tràn trang, khôngpageerror; logo, hero và ảnh danh mục có nội dung ảnh thật, không404.
- Nghiệp vụ khách/khảo sát/CSKH/danh mục/sao lưu và PDF/QR/chia sẻ tiếp tục qua kiểm thử trình duyệt. Chọn6ảnh khảo sát một lần đã được kiểm tra lưu đủ6.
- Bộ test assetpaths kiểm tra ảnh nguồn/ảnh trong bản sao lưu chuyển đổi giữa domainroot và prefixPages, giữ nguyên ảnh upload và URL bên ngoài.
