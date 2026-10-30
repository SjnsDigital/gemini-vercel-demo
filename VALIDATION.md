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

## Nâng cấp tương tác 2.2 — 30/10/2026

- `npm test`: năm file kiểm tra đều đạt, bổ sung so sánh bản chụp (không đổi giá theo danh mục hiện tại, xử lý giá thiếu/ROI, cảnh báo giả định khác nhau), ngày Việt Nam, lọc lịch hẹn và tìm kiếm không dấu.
- `npm run build:pages`: build production đúng prefix `/gemini-vercel-demo/`, JS khởi đầu khoảng95 KB gzip; PDF/QR và các trang nghiệp vụ tiếp tục tải khi cần.
- `tests/e2e/interactions.py` trên build Pages: mười SVG theo trang, mẹo mở/thu gọn, dừng/chạy và giảm chuyển động; menu thao tác nhanh tìm không dấu/Enter/Escape/trả focus; tạo lịch việc tương lai, sửa ngày, hoàn thành/mở lại, xóa/hoàn tác, nạp lại dữ liệu, mở đúng hồ sơ từ lịch gọi; cẩm nang tìm/lọc/mở chi tiết/xóa bộ lọc. Không lỗi JavaScript.
- `tests/e2e/navigation.py` trên build Pages: đủ10trang ở360/390/768/1280px, không tràn ngang, logo/hero/tài nguyên tải thành công, menu mobile và tìm kiếm đúng focus, sao lưu mở đúng tab.
- Máy tính production: nhóm mái/hệ thống ban đầu thu gọn trên điện thoại, nút chuyển nhóm mở đúng thông số; preset5triệu cập nhật số tính; sơ đồ ngày/đêm và chú giải theo số năng lượng hiện tại, không có dữ liệu giám sát giả.
- So sánh tích hợp: chọn2/3phương án, chặn lựa chọn thứ4, chênh lệch đúng bản A, cảnh báo khác hóa đơn/nắng; nút mở máy tính/tạo báo giá hoạt động; không tràn trang360/390/768px, không lỗiJS hoặc tải tài nguyên.
- Toàn bộ records và quotes E2E chạy lại trên build Pages đều đạt: CRUD/khảo sát/CSV/CSKH/sao lưu/khôi phục;13dòng báo giá, xuấtPDF/PNGA4, revision, QR1080, linkkhách độc lập, guardkhảo sát/giá và chặn sốtấm không đồng nhất.
- Kiểm tra chuyên biệt360px: điện thoại+84/0 được nhận là cùng số, liên kết gọi/Zalo đúng, tỷ lệngày ngoài0–100bị chặn; lọcCSKH bỏphiếuđãđóng, sắp xếpgiá không đẩygiáchưa có lênđầu.

Bằng chứng trình duyệt được lưu ngoài mã nguồn tại `/workspace/kimsolar-v22-validation/`. Không có backend AI hoặc giám sát điện thực tế mới; SVG là hướng dẫn và mô hình ước tính. Giới hạn Supabase thật và xác minh dữ liệu thương mại từ bản2.0/2.1 vẫn áp dụng.

## Nâng cấp nghiệp vụ 2.3 — 30/10/2026

- Bảy file unit test đều đạt: bổ sung parser tiền rút gọn và round-trip giá lưu, đơn vị riêng đ/kWh, bộ kỹ năng trợ lý cho 10 mục, ngày Việt Nam/ngày không tồn tại/tên khách Mai, cấu hình tiền–mái–pha, cảnh báo dữ liệu thật và tác vụ không hỗ trợ.
- Production Pages build thành công; JS khởi đầu khoảng 106 KB gzip. Không thêm thư viện chat, khóa API hoặc dịch vụ mô hình AI giả lập.
- `smart_workspace.py`: `2.2`, `2`, `2tr2` hiểu đúng; giá không hợp lệ chặn lưu/xuất/tạo báo giá. Ảnh dòng báo giá tải lên, nhớ vào danh mục, lưu/reload và tách biệt giữa các phiên bản. PDF thật; trợ lý xem trước rồi mới thêm lịch, điền cấu hình hoặc mở form khách. Kiểm tra 360/390/768/1280 px và không lỗi JavaScript.
- `assistant_handoffs.py`: tiền nhập trực tiếp ở tra nhanh → máy tính → lưu; lệnh mở so sánh và tra cẩm nang áp dụng lại sau chỉnh tay; trợ lý thực sự đổi bộ lọc thiết bị và báo giá, mở editor mới; định mức nhập `2.2` lưu 2.200.000 đ; sao lưu tải file JSON đầy đủ.
- Toàn bộ quotes E2E chạy trên build Pages: 13 dòng, số tiền, PDF/PNG, phiên bản, khảo sát/xác minh giá, chặn cấu hình số tấm khác, QR thật và ảnh 1080, trang khách độc lập, mobile, không lỗi JavaScript.
- PDF được render xem trực tiếp các trang: đã sửa lỗi margin tính sẵn gây lệch/cắt logo và cột giá khi html-to-image chụp; cột hãng/tổng thanh toán và tương phản đã chỉnh. Trang có nhiều ảnh/thông số tự chia A4 theo độ dài, không cắt ngang dòng.
- Toàn bộ records E2E production đạt. Thử riêng tiền bán/giá nhập/khảo sát, chặn giá sai/trống, hồ sơ khách → cấu hình → CSKH đúng liên kết và không tự đánh dấu khảo sát đã kiểm tra. Catalog chấp nhận đường dẫn ảnh có prefix GitHub Pages khi sửa.
- Đơn giá điện có nhãn riêng: `2.2` = 2.200 đ/kWh; giá sai chặn tạo báo giá, số lưu và chuỗi giải thích đều được kiểm tra.
- Logo SVG nhúng đúng PNG nguồn, bộ lọc loại nền: kích thước tự nhiên 720×278, 152.377 pixel nền trong suốt, 45.688 pixel màu chính giữ nguyên, canvas xuất/đọc PNG thành công. Hiệu ứng tắt khi giảm chuyển động hoặc in. Hai kết quả logo tạo ảnh có nhiễu bị loại, không đưa vào build.
- `navigation.py`: đủ 10 trang tại 360/390/768/1280 px, ảnh/logo tải đúng, không lỗi tài nguyên hoặc JavaScript. `interactions.py`: các thao tác từ bản 2.2 tiếp tục đạt.

Bằng chứng được giữ ngoài source ở `/workspace/kimsolar-v23-validation/`. Ảnh/hồ sơ người dùng lưu trong trình duyệt và đi cùng sao lưu, không tự ghi lên tài nguyên công khai của mọi người. Trợ lý dùng kỹ năng nghiệp vụ cục bộ; giới hạn dữ liệu nguồn cần xác minh và backend Supabase chưa kiểm thử thật vẫn áp dụng.

Kiểm tra ảnh toàn trang còn phát hiện CSS `.comparison-row` của máy tính tác động dashboard sau khi tải trang tính. Đã giới hạn selector trong `.calculator-workspace`; bài smart E2E kiểm tra sau chuyển nhiều trang rằng hàng năng lượng dashboard giữ `display:block` và nhãn đủ chiều rộng, rồi chụp lại ảnh mobile.
