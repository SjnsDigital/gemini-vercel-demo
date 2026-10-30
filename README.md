# Kim Solar Workspace 2.3

Bản công khai: **https://sjnsdigital.github.io/gemini-vercel-demo/** — GitHub Pages, không cần đăng nhập Vercel.

Ứng dụng React 19 / Vite hỗ trợ kinh doanh và CSKH điện mặt trời. Giao diện mới hoàn toàn, font Be Vietnam Pro được lưu cùng ứng dụng; không phụ thuộc CDN. Liên hệ mặc định **0987000783 — Nhân Viên Kinh Doanh**.

## Chạy ứng dụng

Yêu cầu Node.js 22.12+; môi trường phát triển đã dùng Node 24.

```sh
npm ci
npm run dev
```

Build tĩnh để triển khai:

```sh
npm test
npm run build
npm run preview
```

Vercel đọc cấu hình `vercel.json`: framework Vite, build `npm run build`, output `dist`. Netlify có thể nhận nguyên thư mục `dist`. Xem `DEPLOYMENT.md` để phân biệt bản build với trạng thái xuất bản thực tế.

## Các luồng đã triển khai

- Tổng quan từ dữ liệu thật trong không gian: khách, phương án, báo giá, lịch gọi lại, công việc; không có doanh thu giả được cài sẵn.
- Tính phương án theo tiền/kWh, biểu giá sinh hoạt/kinh doanh/sản xuất, tỷ lệ ngày/đêm, khu vực, mái, pha, hybrid/hòa lưới, 5/10/16 kWh, pin tự tính/thủ công, tải dự phòng, vật tư, tăng giá điện và hoàn vốn. Bố trí mái và cân bằng điện có trực quan.
- Tra nhanh các mức hóa đơn; lưu và mở lại cấu hình; thư viện phương án có bản chụp kết quả.
- Báo giá: chọn khách, sửa dòng hàng/số lượng/giá, thêm/bớt dòng, VAT đã/chưa gồm, giảm giá, điều khoản, hai mẫu trình bày, PDF A4 và PNG A4 nhiều trang, lịch sử và tạo phiên bản mới. Bản đã lưu không bị sửa theo danh mục.
- Link tự chứa cấu hình được nén, QR thật, ảnh 1080 px và Web Share khi hệ điều hành hỗ trợ. Khách xem link có màn hình riêng. Không đưa hồ sơ khách, ghi chú nội bộ hoặc mật khẩu vào link. Link tự chứa có hạn xem nhưng không thể thu hồi hoặc ký xác thực; chưa có máy chủ link ngắn/theo dõi lượt xem.
- 31 bản ghi danh mục v2 từ file nguồn, gồm dòng hãng chờ bổ sung; ảnh sản phẩm được tự lưu. Quản lý model, thông số, giá nhập/bán, ảnh, bảo hành, xác minh, thêm/sửa/ngừng dùng/xóa; nhập/xuất CSV.
- Khách hàng: tìm/lọc, chống trùng số điện thoại, trạng thái, lịch gọi lại, nhật ký, khảo sát kỹ thuật và ảnh công trình.
- CSKH: phiếu hỗ trợ, người phụ trách, ưu tiên, serial, lịch xử lý, kết quả, bảo hành và lịch sử trạng thái.
- Cài đặt, bản sao JSON đầy đủ, xem trước nhập/khôi phục, sao lưu trước ghi đè, CSV gộp theo ID và khôi phục bản trước.
- Đồng bộ Supabase tùy chọn: đăng nhập thật, workspace và vai trò, tải lên/đọc về có xác nhận, khóa phiên bản tránh ghi đè và RLS. Xem `supabase/README.md` và `supabase/schema.sql`.

## Dữ liệu và những giới hạn cần hiểu

Ứng dụng dùng **lưu cục bộ** khi chưa cấu hình backend. Không có tài khoản dùng chung hoặc đồng bộ tự động được giả lập. Phần Supabase đã có mã tích hợp và schema, nhưng cần dự án cùng tài khoản thật để vận hành và kiểm chứng trên máy chủ. Không nhập secret/service_role key vào trình duyệt. Mật khẩu không được lưu. Phiên đăng nhập bị ràng buộc đúng Project URL.

Lưu cục bộ tách biệt theo trình duyệt và tên miền. Khi chuyển từ localhost/Preview sang domain chính, hãy xuất JSON rồi nhập ở tên miền mới. Trước khi xóa dữ liệu trình duyệt cần tải sao lưu. Ảnh khảo sát được thu nhỏ để hạn chế đầy dung lượng; lưu trữ đám mây có thể cần nâng cấp khi dữ liệu lớn.

Toàn bộ giá nguồn ban đầu **chưa được xác minh**. Báo giá nháp vẫn tạo được; phát hành chính thức phải xử lý kiểm tra về khách hàng, giá, model và khảo sát. Không tự coi 8.888.888 đ là giá thương mại đã duyệt. Biểu giá điện lấy từ dữ liệu người dùng cung cấp; cần cập nhật theo hóa đơn/quy định đang áp dụng. Dự báo nắng/khu vực là giả định có thể sửa, chưa phải tra cứu khí tượng chính thức. Kết quả chưa thay thế thiết kế kết cấu/điện theo datasheet và khảo sát thực tế.

Không nhúng hồ sơ thật trong HTML cũ hoặc bản PDF đặc tả vào bản public. Các dữ liệu gốc đầy đủ vẫn được giữ ở bộ phân tích riêng; ứng dụng public chỉ có danh mục sản phẩm đã lọc.

## Kiểm tra

`npm test` chạy các bộ kiểm tra tính toán và encode/decode chia sẻ, gồm trường hợp biên, bảo toàn điện sạc/xả, giá/model, hạn link và dữ liệu lỗi. `tests/e2e/` có các kịch bản Python Playwright kiểm tra luồng khách/khảo sát/CSKH/danh mục/sao lưu, báo giá/PDF/PNG/QR/link khách và bảo vệ phiên cloud.

Cần Python có Playwright và Chromium. Mặc định kiểm tra máy chủ dev cổng 5173; đặt `KIMSOLAR_TEST_URL` để kiểm tra bản production và `KIMSOLAR_TEST_OUTPUT` cho thư mục kết quả. Script cloud dùng phản hồi **giả lập** để kiểm tra session và vai trò; không phải bằng chứng backend Supabase thật đã hoạt động.

PDF báo giá được dựng từ cùng nội dung xem trước, chia trang A4 có chừa lề; JS tạo ảnh/PDF/QR được tải khi cần. Link chia sẻ thường có thể dài hơn 2.000 ký tự, vì không có dịch vụ link ngắn được cấu hình; một số ứng dụng nhắn tin có giới hạn riêng.

## Cấu trúc

`src/App.jsx` và `styles.css`: khung ứng dụng, dashboard, tra nhanh, thư viện, màn khách; `src/views/`: các nghiệp vụ; `src/lib/calculator.js`: bộ tính thuần; `src/lib/share.js`: ảnh/link; `src/lib/seed.js`: dữ liệu ban đầu; `src/components/CloudSync.jsx`: tích hợp Supabase; `public/assets/products/`: ảnh tự lưu; `supabase/`: schema và hướng dẫn backend.

## Bản 2.1 — hình ảnh, nhận diện và thao tác mobile

Logo Kim Solar chính thức từ tài liệu nguồn được giữ đúng tỷ lệ, dùng ở menu, header điện thoại, màn khách, PDF và ảnh chia sẻ. Hình nhà SVG cũ đã được bỏ; ảnh minh họa mới được xuất WebP và có bản 720 px riêng cho điện thoại (khoảng66 KB). Ảnh là minh họa, không tuyên bố công trình đã thi công.

Thanh điều hướng mobile có Tổng quan/Tính toán/Báo giá/Khách hàng/Thêm. Menu ẩn không giữ focus bàn phím; có tìm kiếm mobile, truy cập đúng hồ sơ/model từ kết quả tìm, sao lưu mở thẳng trang dữ liệu. Các menu/nghiệp vụ vẫn dùng được không cần đăng nhập. Kết nối Supabase là tùy chọn nâng cao trong cài đặt; không phải điều kiện mở website.

Bản build Pages: `npm run build:pages`. Xuất bản nguyên thư mục `dist-pages` lên nhánh `gh-pages`; cần `.nojekyll`. Dữ liệu và đường dẫn ảnh đã hỗ trợ prefix `/gemini-vercel-demo/`, kể cả ảnh trong bản sao lưu cũ. Nhánh `main` và website Vercel cũ không bị thay đổi bởi luồng phát hành Pages.

Bản public không có hồ sơ khách thật được cài sẵn. Dữ liệu nhập trên một trình duyệt vẫn là dữ liệu riêng của trình duyệt đó; không tự công khai lên GitHub Pages.

## Bản 2.2 — tương tác trực tiếp và thao tác gọn

- Mười trang có hình SVG riêng theo vai trò, mẹo mở/thu gọn và nút dừng chuyển động. Đây là hướng dẫn sử dụng, không phải dịch vụ AI từ máy chủ. SVG không cần thư viện hoạt ảnh hoặc tải ảnh ngoài; tôn trọng cài đặt giảm chuyển động.
- Nút tia chớp trên header hoặc Ctrl/⌘ K mở menu thao tác nhanh. Tìm không dấu, Enter mở kết quả đầu; Escape đóng và trả focus.
- Bảng việc hỗ trợ ngày hẹn, sửa, hoàn thành/mở lại, xóa/hoàn tác và lọc đến hạn/tất cả/đã xong. Lịch gọi lại mở đúng khách hàng; ngày theo múi giờ Việt Nam.
- Màn tính có sơ đồ điện ngày/đêm tương tác theo kết quả tính hiện tại. Dữ liệu là ước tính ngày điển hình; không phải dữ liệu giám sát thời gian thực. Trên điện thoại các nhóm thông số được thu gọn, có điều hướng đến từng nhóm.
- So sánh tối đa ba bản chụp phương án theo công suất, đầu tư, sản lượng, tiết kiệm, hoàn vốn và lưu trữ. Hiển thị chênh lệch với bản A, cảnh báo đầu vào khác nhau, không xếp hạng giá rẻ là tốt nhất. Thiếu giá hoặc dữ liệu không hợp lệ thì không suy diễn hoàn vốn.
- Hàng đợi khách cần liên hệ/hẹn khảo sát, CSKH quá hạn/hôm nay/ưu tiên cao; sắp xếp thiết bị theo hãng hoặc giá, giá chưa có nằm cuối. Chuẩn hóa số gọi/Zalo và chống trùng số địa phương với +84.
- Cẩm nang có chủ đề lọc nhanh, tìm không dấu, nội dung thu gọn và sao chép gợi ý.

Kiểm tra tương tác bổ sung: `tests/e2e/interactions.py`. Bộ test dữ liệu còn kiểm tra biên ngày Việt Nam, hàng đợi đến hạn và bảo toàn dữ liệu bản chụp khi so sánh. Xuất bản tĩnh tiếp tục dùng GitHub Pages với tên miền hiện tại và không yêu cầu đăng nhập.

## Bản 2.3 — trợ lý nghiệp vụ, nhập gọn và báo giá

Trợ lý của cả 10 mục hỗ trợ bộ kỹ năng riêng, chạy ngay trên trình duyệt, không cần API hoặc đăng nhập. Yêu cầu được phân tích thành thông tin xem trước; người dùng chọn nút thực hiện để mở tác vụ hoặc thêm việc. Đây là bộ xử lý nghiệp vụ đã lập trình, không phải mô hình hội thoại tự do được huấn luyện riêng.

Có thể dùng những câu như “Tính hóa đơn 2.2tr mái 12x8 3 pha hòa lưới”, “Nhắc gọi khách ngày mai”, dán tên/số điện thoại/tiền điện để điền hồ sơ; tra model và giá, rà soát bản nháp, mở hàng đợi quá hạn, so sánh bản lưu, giải thích chủ đề tư vấn và tải bản sao lưu. Thông tin thiếu được ghi rõ, không tự xác minh giá, xác nhận khảo sát hoặc phát hành/gửi báo giá.

Các ô tiền dùng chung quy tắc nhập gọn: 2 và 2.2 tương ứng 2.000.000 đ và 2.200.000 đ; 2tr2, 500k, 1ty5 hoặc số đồng đầy đủ cũng dùng được. Số không đơn vị nhỏ hơn 1000 được hiểu theo đơn vị ghi ở ô; số từ1000 trở lên giữ là đồng. Thêm “đ” để nhập số đồng nhỏ rõ ràng. Riêng đơn giá điện đ/kWh dùng nghìn đồng: 2.2 → 2.200 đ. Mọi ô đều hiển thị số đồng được hiểu; giá sai/trống không được dùng để lưu, tạo hoặc xuất tài liệu hợp lệ.

Tra nhanh có ô tiền tùy chọn tính ngay; hồ sơ khách chuyển trực tiếp sang phương án với tiền điện, mái, tỷ lệ ngày và pha đã ghi, đồng thời giữ liên kết khách khi tạo báo giá. Lệnh cẩm nang/so sánh và tìm hồ sơ áp dụng được lặp lại sau khi chỉnh tay.

Báo giá A4 có ảnh thiết bị, hãng/model, thông số/bảo hành, khối tổng tiền, hiệu quả tham khảo, điều khoản và chữ ký. Ảnh được thêm/thay/bỏ ngay ở từng dòng; lưu nháp giữ ảnh trong bản chụp, nút “Nhớ vào danh mục” chủ động dùng ảnh cho báo giá về sau. Bản cũ không bị thay đổi khi tạo phiên bản tiếp theo. Dữ liệu/ảnh lưu trên trình duyệt hiện tại và đi cùng file sao lưu JSON, không tự thay tài nguyên công khai của mọi người truy cập.

Logo nguồn được giữ nguyên hình/chữ/màu, render nền trong suốt bằng SVG, có hiệu ứng sáng nhẹ khi tương tác; hiệu ứng tắt khi giảm chuyển động hoặc xuất tài liệu. PDF/PNG được dựng với lề/chiều rộng cố định và tách trang tránh cắt dòng; đã kiểm tra trực tiếp các trang xuất.

Kiểm tra mới: `tests/e2e/smart_workspace.py` và `assistant_handoffs.py`, ngoài các bài kiểm tra hiện có. Giữ khóa lưu trữ `kimsolar.workspace.v2` và định dạng backup v1 để dùng tiếp dữ liệu cũ.
