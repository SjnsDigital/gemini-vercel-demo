import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright,expect
OUT=Path(os.environ.get('KIMSOLAR_TEST_OUTPUT','test-results'))
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':1500,'height':1100},accept_downloads=True,timezone_id='Asia/Ho_Chi_Minh')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#customers');expect(page.get_by_role('heading',name='Khách hàng & cơ hội')).to_be_visible()
 page.get_by_role('button',name='Thêm khách hàng',exact=True).click()
 dlg=page.get_by_role('dialog');dlg.get_by_label('Tên khách hàng / công ty').fill('Khách kiểm thử nội bộ');dlg.get_by_label('Số điện thoại',exact=True).fill('0900000000');dlg.get_by_label('Địa chỉ lắp đặt').fill('Địa chỉ minh họa');dlg.get_by_role('button',name='Lưu hồ sơ').click()
 expect(page.get_by_role('heading',name='Khách kiểm thử nội bộ')).to_be_visible()
 page.get_by_role('button',name='Sửa hồ sơ').click();dlg=page.get_by_role('dialog');dlg.get_by_label('Nhân viên phụ trách').fill('QA');dlg.get_by_label('Giai đoạn').select_option('Đang tư vấn');dlg.get_by_role('button',name='Lưu hồ sơ').click()
 page.get_by_label('Nội dung nhật ký').fill('Đã gọi, khách muốn khảo sát vào cuối tuần.');page.get_by_role('button',name='Lưu trao đổi').click();expect(page.get_by_text('Đã gọi, khách muốn khảo sát vào cuối tuần.')).to_be_visible()
 page.get_by_role('button',name='Tạo phiếu khảo sát').click();dlg=page.get_by_role('dialog');dlg.get_by_label('Ngày khảo sát',exact=True).fill('2026-10-29');dlg.get_by_label('Người khảo sát',exact=True).fill('QA');dlg.locator('summary').filter(has_text='Nhu cầu điện').click();dlg.get_by_label('Tiền điện trung bình (đ)').fill('2500000');dlg.locator('summary').filter(has_text='Mái & tiếp cận').click();dlg.get_by_label('Chiều dài mái (m)').fill('16');dlg.get_by_label('Chiều rộng mái (m)').fill('5');dlg.locator('summary').filter(has_text='Kết luận').click();dlg.get_by_label('Kết luận khảo sát').select_option('Đạt sơ bộ');dlg.get_by_role('button',name='Lưu khảo sát').click()
 expect(page.get_by_role('button',name='Mở phiếu khảo sát')).to_be_visible()
 data=json.loads(page.evaluate('localStorage.getItem("kimsolar.workspace.v2")'));assert data['customers'][0]['survey']['rl']=='16';assert data['customers'][0]['status']=='Đã khảo sát';assert len(data['customers'][0]['history'])==2
 page.get_by_label('Tìm khách hàng',exact=True).fill('0900000000');assert page.locator('tbody tr').count()==1;page.get_by_label('Tìm khách hàng',exact=True).fill('không tồn tại');expect(page.get_by_text('Chưa tìm thấy khách phù hợp')).to_be_visible()
 print('PASS customer create/edit/search, log, detailed survey save and persisted history',flush=True)
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#catalog');expect(page.get_by_role('heading',name='Mỗi lựa chọn, một tiêu chuẩn.')).to_be_visible()
 page.get_by_role('button',name='Thêm thiết bị',exact=True).click();dlg=page.get_by_role('dialog');dlg.get_by_label('Nhóm thiết bị').select_option('inv');dlg.get_by_label('Hãng',exact=False).fill('QA-BRAND');dlg.get_by_label('Model / mã sản phẩm').fill('QA-6KW');dlg.get_by_label('Giá bán (đ)').fill('15000000');dlg.get_by_label('Công suất biến tần (kW)').fill('6');dlg.get_by_label('Pha',exact=True).select_option('1');dlg.get_by_label('Đã xác minh giá & thông tin').check();dlg.get_by_role('button',name='Lưu thiết bị').click()
 card=page.locator('.record-product').filter(has=page.get_by_role('heading',name='QA-6KW',exact=True));expect(card).to_be_visible();expect(card.get_by_text('Đã xác minh',exact=True)).to_be_visible();card.get_by_role('button',name='Xem & chỉnh sửa').click();dlg=page.get_by_role('dialog');dlg.get_by_label('Giá bán (đ)').fill('16000000');dlg.get_by_role('button',name='Lưu thiết bị').click();expect(card.get_by_text('16.000.000 đ')).to_be_visible()
 page.get_by_label('Tìm thiết bị',exact=True).fill('QA-6KW');assert page.locator('.record-product').count()==1
 with page.expect_download() as download:page.get_by_role('button',name='Xuất CSV',exact=True).click()
 csvpath=OUT/'catalog-records-test.csv';download.value.save_as(str(csvpath))
 assert 'QA-6KW' in csvpath.read_text(encoding='utf-8-sig')
 print('PASS catalog create/edit/search/price verification and CSV export',flush=True)
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#care');expect(page.get_by_role('heading',name='Chăm sóc & bảo hành')).to_be_visible();page.get_by_role('button',name='Tiếp nhận yêu cầu',exact=True).click();dlg=page.get_by_role('dialog');dlg.get_by_label('Tiêu đề yêu cầu').fill('QA Kiểm tra sản lượng');dlg.get_by_label('Khách hàng',exact=True).select_option(label='Khách kiểm thử nội bộ · 0900000000');dlg.get_by_label('Mức ưu tiên').select_option('Cao');dlg.get_by_label('Lịch xử lý / bảo trì').fill('2026-10-30');dlg.get_by_label('Serial / mã hệ thống').fill('TEST-001');dlg.get_by_role('button',name='Lưu yêu cầu').click();expect(page.get_by_role('button',name='QA Kiểm tra sản lượng',exact=True)).to_be_visible();page.get_by_label('Trạng thái QA Kiểm tra sản lượng').select_option('Đang xử lý');page.get_by_role('button',name='QA Kiểm tra sản lượng',exact=True).click();dlg=page.get_by_role('dialog');expect(dlg.get_by_label('Trạng thái',exact=True)).to_have_value('Đang xử lý');dlg.get_by_label('Kết quả xử lý / hướng dẫn cho khách').fill('Đã kiểm tra theo lịch.');dlg.get_by_label('Trạng thái',exact=True).select_option('Đã giải quyết');dlg.get_by_role('button',name='Lưu yêu cầu').click();page.get_by_label('Lọc phiếu hỗ trợ').select_option('Đã giải quyết');expect(page.get_by_role('button',name='QA Kiểm tra sản lượng',exact=True)).to_be_visible()
 print('PASS support create, customer link, priority, serial, status history, resolution and filter',flush=True)
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#settings');expect(page.get_by_role('heading',name='Mọi thứ, theo cách của bạn.')).to_be_visible();page.get_by_role('button',name='Dữ liệu & sao lưu Xuất, nhập và khôi phục').click()
 with page.expect_download() as ev:page.get_by_role('button',name='Tải bản sao lưu',exact=False).click()
 backup=OUT/'records-test-backup.json';ev.value.save_as(str(backup));saved=json.loads(backup.read_text());assert saved['app']=='kimsolar-workspace' and len(saved['db']['customers'])==1 and len(saved['db']['tickets'])==1
 with page.expect_download() as ev:page.get_by_role('button',name='Xuất toàn bộ danh mục').click()
 csvpath=OUT/'settings-products-test.csv';ev.value.save_as(str(csvpath))
 page.locator('input[type=file][accept=".csv,text/csv"]').set_input_files(str(csvpath));expect(page.get_by_text('XEM TRƯỚC • CHƯA ÁP DỤNG')).to_be_visible();page.get_by_role('button',name='Gộp danh mục CSV').click()
 page.locator('input[type=file][accept="application/json,.json"]').set_input_files(str(backup));expect(page.get_by_text('XEM TRƯỚC • CHƯA ÁP DỤNG')).to_be_visible();page.get_by_role('button',name='Khôi phục bản đã chọn').click();assert page.evaluate('localStorage.getItem("kimsolar.beforeRestore")')
 data=json.loads(page.evaluate('localStorage.getItem("kimsolar.workspace.v2")'));assert len(data['customers'])==1 and data['customers'][0]['survey']['rl']=='16' and len(data['tickets'])==1 and len(data['products'])==32
 page.locator('input[type=file][accept="application/json,.json"]').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"app":"bad"}'});expect(page.get_by_role('alert')).to_contain_text('không phải bản sao lưu')
 print('PASS full backup export, CSV import preview/merge, JSON restore preview/safety copy, invalid JSON rejection',flush=True)
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#catalog');page.get_by_label('Tìm thiết bị',exact=True).fill('QA-6KW');card=page.locator('.record-product').filter(has=page.get_by_role('heading',name='QA-6KW',exact=True));card.get_by_role('button',name='Xem & chỉnh sửa').click();page.once('dialog',lambda d:d.accept());page.get_by_role('dialog').get_by_role('button',name='Xóa thiết bị').click();expect(page.get_by_text('Chưa có thiết bị phù hợp')).to_be_visible()
 assert not errors,errors
 print('PASS catalog delete and zero pageerrors across business views',flush=True)
 page.screenshot(path=str(OUT/'records-end.png'),full_page=True)
 b.close()
