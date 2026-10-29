# Đưa Kim Solar lên web

Ứng dụng được đóng gói bằng Vite, React và JavaScript. Bản public là thư mục `dist/` sau khi build; không cần máy chủ Node chạy thường trực. Chức năng lưu trên trình duyệt hoạt động riêng trên từng thiết bị. Nếu cấu hình đồng bộ qua dịch vụ ngoài, chỉ coi là kết nối thành công sau khi đăng nhập và thử đọc/ghi thực tế.

## Kiểm tra trước khi triển khai

```sh
npm ci
npm test
npm run build
```

Mã public không chứa hồ sơ khách thật từ HTML nguồn. Chỉ danh mục sản phẩm và ảnh được chọn lọc mới được đưa vào bundle. Giá có nguồn chưa xác minh phải được rà soát trong ứng dụng trước khi phát hành báo giá.

## Vercel — phù hợp repository hiện tại

Đã có cấu hình `vercel.json`: framework **Vite**, lệnh build **npm run build**, thư mục đầu ra **dist**, lệnh cài **npm ci**. Vercel sẽ cấp HTTPS và địa chỉ miễn phí theo chính sách gói hiện tại của tài khoản.

Repository công khai `SjnsDigital/gemini-vercel-demo` đang ghi website `https://gemini-vercel-demo.vercel.app` trong mục About. Đây là địa chỉ được quan sát từ GitHub; chưa phải bằng chứng bản code mới đã được triển khai tại đó.

Nếu project Vercel đã kết nối repository này, vào project → Settings → Git để kiểm tra nhánh Production. Nên triển khai nhánh mới dưới dạng Preview trước; sau khi kiểm tra mới đưa commit đã kiểm tra sang nhánh Production. Không cần thay tên project hoặc tạo project trùng nếu kết nối hiện có vẫn hoạt động.

Nếu chưa kết nối: đăng nhập Vercel → Add New Project → chọn repository này → chọn framework Vite → kiểm tra các thiết lập ở trên → Deploy. Không đặt API key đặc quyền trong biến `VITE_*`, file JavaScript hoặc thư mục `public/`.

Với máy đã đăng nhập Vercel CLI, lệnh triển khai Preview:

```sh
npx vercel
```

Sau khi Preview đã được kiểm tra và chủ tài khoản muốn xuất bản Production:

```sh
npx vercel --prod
```

Các lệnh này cần xác thực Vercel và quyền mạng tới API của Vercel. Chưa chạy thành công trong phiên hiện tại; không có URL mới được khẳng định từ các lệnh này.

## Nền tảng miễn phí khác

Với Netlify Drop, có thể kéo thả thư mục `dist/` đã build vào trang triển khai của tài khoản. Không tải thư mục source hoặc `node_modules`. Các link phương án của ứng dụng dùng fragment trong URL nên không cần máy chủ lưu link. Nếu bật đường dẫn SPA không dùng fragment ở các phiên bản sau, thêm fallback `/index.html` theo hướng dẫn của nền tảng.

Với GitHub Pages, cần quyền bật Pages và cấu hình workflow hoặc nhánh publish; không chỉ có quyền đọc Git. Không suy ra quyền quản trị Pages từ việc clone thành công. Vite cần `base` phù hợp nếu xuất bản dưới đường dẫn con; Vercel hiện tại dùng gốc tên miền nên không cần đổi `base`.

## Trạng thái triển khai đã quan sát trong phiên này

- `git ls-remote origin HEAD` thành công qua HTTPS Git proxy có sẵn.
- `gh api repos/SjnsDigital/gemini-vercel-demo` trả `Forbidden` khi truy cập `api.github.com`.
- Trang GitHub của repository đọc được; có homepage Vercel ở trên. Trang checks của commit cũ không cung cấp kết quả Vercel cho phiên đọc hiện tại; đường dẫn deployments trả 404. Không xác nhận được Git integration đang hoạt động.
- Trang thiết kế tham khảo `doi-ai-truc-shop.vercel.app` bị proxy chặn với CONNECT HTTP 403 trước khi nhận nội dung trang.
- Không có metadata `.vercel`/`.netlify` trong checkout hoặc cấu hình đăng nhập tương ứng được phát hiện theo kiểm tra hiện diện, và không có tên biến xác thực Vercel/Netlify được cấu hình.

Những quan sát này tách biệt với kết quả build/kiểm thử code. Việc lưu domain vào bản nháp môi trường cũng không tự triển khai website. Cần quyền truy cập mạng đã được áp dụng và xác thực host usable, hoặc dùng kết nối Git/Vercel đã được chủ tài khoản xác nhận. Không cung cấp token trong chat; sử dụng phần nhập giá trị bảo mật của nền tảng/môi trường.
