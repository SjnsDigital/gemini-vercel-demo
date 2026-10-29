import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json
out=Path(os.environ.get('KIMSOLAR_TEST_OUTPUT','test-results'))
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1100},accept_downloads=True,timezone_id='Asia/Ho_Chi_Minh');errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#calculator');page.get_by_role('button',name='Tạo báo giá',exact=True).click()
 dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
 assert dialog.locator('.ks-editor-table tbody tr').count()==13
 # Change an editable quote row and confirm arithmetic changes.
 before=dialog.locator('.ks-q-grand strong').inner_text()
 dialog.get_by_label('Đơn giá hạng mục 1',exact=True).fill('2800000')
 after=dialog.locator('.ks-q-grand strong').inner_text();assert before!=after
 dialog.get_by_label('Tên khách hàng / Công ty').fill('Khách kiểm thử báo giá')
 dialog.get_by_label('Điện thoại khách hàng').fill('0900000000')
 expect(dialog.get_by_role('button',name='Phát hành bản chốt')).to_be_disabled()
 # A real downloaded PDF and A4 PNG must include the rendered snapshot.
 with page.expect_download(timeout=90000) as ev:dialog.get_by_role('button',name='PDF A4',exact=True).click()
 pdf=out/'quote-e2e.pdf';ev.value.save_as(str(pdf));assert pdf.stat().st_size>10000
 with page.expect_download(timeout=90000) as ev:dialog.get_by_role('button',name='Ảnh A4',exact=True).click()
 png=out/'quote-e2e-a4.png';ev.value.save_as(str(png));assert png.stat().st_size>10000
 page.screenshot(path=str(out/'quote-preview.png'))
 dialog.get_by_role('button',name='Lưu bản nháp',exact=True).click();expect(page.get_by_role('dialog')).to_have_count(0)
 page.locator('.ks-quote-number').first.click();dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
 expect(dialog.get_by_role('button',name='Tạo phiên bản mới')).to_be_visible()
 dialog.get_by_role('button',name='Tạo phiên bản mới').click()
 dialog=page.get_by_role('dialog');expect(dialog.get_by_text('R2',exact=True)).to_be_visible()
 dialog.get_by_label('Đơn giá hạng mục 1',exact=True).fill('2900000')
 dialog.get_by_role('button',name='Lưu bản nháp',exact=True).click()
 assert page.locator('.ks-quote-number').count()==2
 print('PASS Calculator to quote:13 rows, total editing, draft guard, real PDF/PNG, saved snapshot and revision')
 # Share link and QR, then reopen as read-only guest in another context.
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#calculator');page.get_by_role('button',name='Link / QR / ảnh',exact=True).click()
 dialog=page.get_by_role('dialog');expect(dialog).to_be_visible()
 expect(dialog.get_by_alt_text('QR code mở phương án')).to_be_visible(timeout=30000)
 expect(dialog.get_by_alt_text('Ảnh tóm tắt phương án điện mặt trời 1080 pixel')).to_be_visible(timeout=30000)
 link=dialog.get_by_label('Liên kết chia sẻ phương án').input_value();assert '#share=' in link
 with page.expect_download(timeout=30000) as ev:dialog.get_by_role('button',name='Tải ảnh 1080px',exact=True).click()
 summary=out/'share-summary.png';ev.value.save_as(str(summary))
 from PIL import Image
 with Image.open(summary) as im:assert im.width==1080
 other=b.new_context(viewport={'width':390,'height':844});guest=other.new_page();guest.on('pageerror',lambda e:errors.append(str(e)))
 guest.goto(link);expect(guest.get_by_text('PHƯƠNG ÁN ĐƯỢC CHIA SẺ',exact=True)).to_be_visible(timeout=30000)
 expect(guest.get_by_text('Bản xem · Không chỉnh sửa',exact=True)).to_be_visible()
 assert guest.locator('.sidebar').count()==0
 guest.screenshot(path=str(out/'guest-share-mobile.png'),full_page=True)
 assert guest.evaluate('document.documentElement.scrollWidth <= innerWidth')
 # Verify formal issuance guard after explicit quote-level price review.
 dialog.get_by_role('button',name='Đóng chia sẻ',exact=True).click()
 page.get_by_label('Thông số đã được khảo sát thực tế',exact=True).check()
 page.get_by_role('button',name='Tạo báo giá',exact=True).click()
 dialog=page.get_by_role('dialog')
 dialog.get_by_label('Tên khách hàng / Công ty').fill('Khách xác minh')
 dialog.get_by_label('Điện thoại khách hàng').fill('0900000001')
 for checkbox in dialog.locator('input[type=checkbox]').all(): checkbox.check()
 expect(dialog.get_by_role('button',name='Phát hành bản chốt')).to_be_enabled()
 dialog.get_by_label('Số lượng hạng mục 1',exact=True).fill('9')
 expect(dialog.get_by_role('button',name='Phát hành bản chốt')).to_be_disabled()
 dialog.get_by_label('Số lượng hạng mục 1',exact=True).fill('10')
 dialog.get_by_role('button',name='Phát hành bản chốt').click()
 expect(page.get_by_role('dialog')).to_have_count(0)
 # Mobile editor stays within viewport, while the A4 paper scrolls within its own preview.
 mobile=b.new_context(viewport={'width':390,'height':844});mp=mobile.new_page();mp.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#calculator')
 mp.get_by_role('button',name='Tạo báo giá',exact=True).click()
 expect(mp.get_by_role('dialog')).to_be_visible()
 assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
 mp.screenshot(path=str(out/'quote-editor-mobile.png'))
 print('PASS surveyed plan and explicit price review enable issue; changed PV quantity blocks issue until recalculated; mobile editor has no page overflow')
 assert not errors,errors
 print('PASS actual share QR,1080px PNG,compressed link in independent browser context,read-only guest,no JS errors')
 (out/'share-test-link.txt').write_text(link)
 b.close()
