# Phát hành công khai Kim Solar 2.2

Địa chỉ chính của bản mới: **https://sjnsdigital.github.io/gemini-vercel-demo/**.

Bản 2.2 dùng GitHub Pages cho repository công khai. Truy cập ứng dụng không yêu cầu tài khoản GitHub hoặc Vercel. Nhánh gh-pages chỉ chứa build tĩnh; main được giữ nguyên.

## Lệnh build

```sh
npm ci
npm test
npm run build:pages
```

Xuất bản toàn bộ nội dung dist-pages, thêm .nojekyll; cấu hình Pages source branch gh-pages, path /. Vite base và đường dẫn ảnh phải là /gemini-vercel-demo/. Giữ file mã nguồn ở kimsolar-workspace-v2, không đưa node_modules hoặc hồ sơ khách thật vào nhánh public.

## Bằng chứng cần phân biệt

- Build/client/browser test nội bộ chứng minh chức năng và đường dẫn tài nguyên.
- API GitHub Pages phải xác nhận public:true, status built và đúng commit artifact được phát hành.
- Nếu proxy môi trường chặn sjnsdigital.github.io, đó là hạn chế máy kiểm tra; không được diễn đạt là website yêu cầu đăng nhập. Public:true không phải bằng chứng đã kiểm thử từng thao tác trên máy chủ thực; cần đối chiếu với test client và artifact.
- Link Vercel Preview cũ có Deployment Protection; không dùng nó làm địa chỉ public của bản mới.

Kết nối Supabase tùy chọn vẫn cần dự án và tài khoản của doanh nghiệp; website và các luồng cục bộ không phụ thuộc đăng nhập đó. Không tắt bảo vệ dữ liệu Supabase để làm website public.

## Cập nhật bản 2.2

Cập nhật bằng commit fast-forward trên nhánh gh-pages hiện hữu, không tạo lại cấu hình Pages và không force-push. Chỉ phát hành build Pages đã qua kiểm thử; ghi nhận SHA nguồn, SHA artifact và xác nhận builds/latest đúng artifact. Nếu có phát hành đồng thời, push phải từ chối để kiểm tra lại trước khi cập nhật.

Bản 2.2 không thay khóa lưu trữ kimsolar.workspace.v2; dữ liệu trình duyệt đang có tiếp tục được dùng. So sánh dùng bản chụp đã lưu; chỉ mở lại máy tính mới áp dụng bảng giá hiện hành.
