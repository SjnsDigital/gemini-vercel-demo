# Kết nối dữ liệu chung bằng Supabase

Ứng dụng hoạt động cục bộ khi chưa có backend. Màn hình Đồng bộ cung cấp kết nối thật tới Supabase, xác thực Email/Password, lưu/đọc dữ liệu và phát hiện xung đột phiên bản. Chưa có backend được tạo sẵn, chưa có tài khoản thật được cung cấp và chưa xác minh kết nối tại môi trường phát triển này.

## Chuẩn bị dự án

1. Tạo dự án Supabase theo gói phù hợp. Gói miễn phí có thể dùng để thử nghiệm, phụ thuộc hạn mức và điều kiện của nhà cung cấp.
2. Chạy toàn bộ `supabase/schema.sql` trong SQL Editor bằng quyền quản trị dự án. Script tạo bảng `ks_*`, các chính sách RLS và hai RPC có kiểm tra quyền.
3. Bật Email Auth, cấu hình site URL của bản triển khai, chính sách tạo tài khoản/xác nhận email. Tạo tài khoản nhân viên trong Supabase Dashboard theo chính sách doanh nghiệp.
4. Trong ứng dụng, mở Đồng bộ, nhập Project URL `https://<project-ref>.supabase.co` và **publishable key hoặc anon public key**. Đây là cấu hình public; tuyệt đối không dùng service_role hoặc `sb_secret_*` key.
5. Đăng nhập bằng tài khoản đã tạo. Tạo một không gian và chọn không gian đó. Người tạo trở thành quản trị viên.
6. Quản trị viên tải bộ dữ liệu cục bộ lên lần đầu. Các thiết bị khác đăng nhập tài khoản thành viên, chọn đúng không gian rồi đọc dữ liệu về.

Nếu môi trường áp dụng danh sách tên miền được phép truy cập, bổ sung chính xác `<project-ref>.supabase.co`. Không tắt TLS hay thay đổi proxy để vượt chính sách mạng.

## Thêm thành viên và quyền

Việc thêm thành viên được quản trị dự án thực hiện trong SQL Editor; ứng dụng chưa có màn hình mời thành viên. Lấy UUID tài khoản đã tạo từ Auth Users và UUID không gian từ bảng `ks_workspaces`. Dùng tham số đúng của dự án, không dùng email hoặc số điện thoại thay UUID:

```sql
insert into public.ks_members (workspace_id, user_id, role)
values (
  '<workspace-uuid>',
  '<auth-user-uuid>',
  'sales'
)
on conflict (workspace_id, user_id)
do update set role = excluded.role;
```

- `admin`: lưu dữ liệu làm việc, danh mục sản phẩm và cài đặt.
- `sales`, `technician`: lưu dữ liệu làm việc; RPC từ chối nếu danh mục sản phẩm/cài đặt khác bản trên máy chủ. Cần đọc bản mới nhất trước khi ghi nếu quản trị viên vừa đổi giá.
- `viewer`: chỉ đọc. RPC từ chối ghi dữ liệu.

RLS chặn tài khoản không thuộc không gian. Client không có quyền sửa trực tiếp các bảng; chỉ RPC được cấp quyền cập nhật. Audit đồng bộ ghi tài khoản, thời gian và phiên bản, không sao chép nội dung hồ sơ khách vào log.

## Cách đồng bộ

Đồng bộ hiện là **thủ công có xác nhận**, không tự động chạy nền:

- **Tải dữ liệu lên đám mây** ghi bộ dữ liệu cục bộ vào không gian dựa trên phiên bản vừa đọc. Máy chủ khóa hàng, so sánh revision rồi mới ghi. Nếu ai đó đã ghi phiên bản mới, thao tác bị từ chối và bản cục bộ không bị xóa.
- **Đọc bản mới nhất về máy** tải dữ liệu để xem trước. Sau xác nhận, ứng dụng giữ bản hiện tại tại khóa `kimsolar.backup.before-cloud.<timestamp>` trong localStorage rồi thay bằng bản đã chọn.
- Đây là thay bộ dữ liệu, chưa phải gộp thay đổi theo từng trường. Khi xung đột, xuất JSON hai phiên bản để đối chiếu, chọn/gộp theo nghiệp vụ rồi ghi lại dựa trên revision mới.
- Chọn không gian/đăng nhập thành công chưa có nghĩa dữ liệu đã đồng bộ. Chỉ sau phản hồi thành công của thao tác đọc/ghi mới hiển thị thời điểm đồng bộ đã xác nhận.
- Dữ liệu public chia sẻ cho khách do luồng chia sẻ riêng xử lý; không phát hành URL trực tiếp đến bảng dữ liệu chung.

Mật khẩu không được lưu. Access/refresh token chỉ giữ trong phiên trình duyệt (sessionStorage); publishable key và Project URL có thể lưu trong localStorage. Đăng xuất cố thu hồi phiên tại máy chủ rồi xóa phiên cục bộ; lỗi mạng khi thu hồi được hiển thị rõ.

## Kiểm tra trước khi dùng thật

Các bước sau cần dự án/tài khoản thực, chưa được ghi nhận là đã chạy thành công trong phiên phát triển:

1. Đăng nhập và tạo không gian bằng tài khoản A; kiểm tra A có vai trò admin.
2. Tài khoản B không là thành viên không được đọc/ghi bảng hoặc RPC của không gian A.
3. Thêm B với viewer: đọc được, ghi bị từ chối ở máy chủ.
4. Đổi B thành sales: ghi dữ liệu công việc được, thay sản phẩm/cài đặt bằng REST trực tiếp vẫn bị từ chối.
5. Hai thiết bị cùng đọc v1: thiết bị đầu ghi v2 thành công; thiết bị sau ghi với expected v1 bị báo xung đột, dữ liệu cục bộ còn nguyên.
6. Mất mạng khi ghi: UI báo lỗi, không báo đã đồng bộ. Khi có mạng, đọc phiên bản máy chủ trước khi thử lại để xử lý trường hợp máy chủ đã nhận nhưng trình duyệt chưa nhận phản hồi.
7. Đọc dữ liệu có xem trước/khôi phục hoạt động; xuất JSON dùng được; kiểm tra ảnh và dữ liệu lớn theo hạn mức Supabase/localStorage.

Mã SQL có giới hạn gói dữ liệu 10 MiB. Hình lớn nên được quản lý bằng object storage có chính sách truy cập riêng khi mở rộng; không nhét ảnh không giới hạn vào một bản JSON. Thiết lập sao lưu máy chủ và quy trình khôi phục phù hợp trước khi dùng dữ liệu khách thật.
