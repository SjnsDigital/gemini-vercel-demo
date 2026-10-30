"""Browser regression for compact money, specialist tools and editable quote images."""
import base64
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('KIMSOLAR_TEST_URL', 'http://127.0.0.1:5173').rstrip('/') + '/'
OUT = Path(os.environ.get('KIMSOLAR_TEST_OUTPUT', 'test-results/smart'))
OUT.mkdir(parents=True, exist_ok=True)
# Tiny synthetic PNG fixture; no customer photograph or company asset is embedded.
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1sAAAAASUVORK5CYII=')
KEY = 'kimsolar.workspace.v2'


def database(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)


def analyze(page, text):
    if page.get_by_role('button', name='Mở trợ lý nghiệp vụ', exact=True).count():
        page.get_by_role('button', name='Mở trợ lý nghiệp vụ', exact=True).click()
    page.get_by_label('Yêu cầu trợ lý nghiệp vụ', exact=True).fill(text)
    page.get_by_role('button', name='Phân tích yêu cầu', exact=True).click()
    result = page.get_by_role('region', name='Kết quả trợ lý', exact=True)
    expect(result).to_be_visible()
    return result


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, timezone_id='Asia/Ho_Chi_Minh', accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '#calculator')
    bill = page.get_by_label('Hóa đơn trung bình tháng', exact=True)
    bill.fill('2.2')
    expect(bill.locator('..')).to_contain_text('2.200.000')
    bill.fill('không hợp lệ')
    expect(bill).to_have_attribute('aria-invalid', 'true')
    expect(page.get_by_role('button', name='Tạo báo giá', exact=True)).to_be_disabled()
    bill.fill('2')
    expect(bill.locator('..')).to_contain_text('2.000.000')
    bill.fill('2tr2')
    expect(bill.locator('..')).to_contain_text('2.200.000')
    page.get_by_role('button', name='Tạo báo giá', exact=True).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_be_visible()
    price = dialog.get_by_label('Đơn giá hạng mục 1', exact=True)
    price.fill('2.2')
    expect(price.locator('..')).to_contain_text('2.200.000')
    price.fill('bad')
    dialog.get_by_role('button', name='Lưu bản nháp', exact=True).click()
    expect(dialog).to_be_visible()
    assert not (database(page) or {}).get('quotes')
    price.fill('2.2')
    dialog.get_by_label('Tên khách hàng / Công ty', exact=True).fill('QA Bảng giá thông minh')
    dialog.get_by_label('Điện thoại khách hàng', exact=True).fill('0900000000')
    row = dialog.locator('.ks-editor-table tbody tr').first
    row.locator('summary').filter(has_text='Ảnh, bảo hành & thông số').click()
    row.get_by_label('Thay ảnh hạng mục 1', exact=True).set_input_files({'name': 'qa-device.png', 'mimeType': 'image/png', 'buffer': PNG})
    uploaded = row.locator('.ks-row-image-preview img')
    expect(uploaded).to_have_attribute('src', re.compile('^data:image/webp'))
    row.get_by_role('button', name='Nhớ vào danh mục', exact=True).click()
    remembered = database(page)
    assert any(str(product.get('image', '')).startswith('data:image/webp') for product in remembered['products'])
    row.get_by_label('Thông số hạng mục 1', exact=True).fill('Thông số kiểm thử, không phải dữ liệu thương mại.')
    dialog.get_by_role('button', name='Lưu bản nháp', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    saved = database(page)['quotes'][0]
    assert saved['rows'][0]['price'] == 2200000
    assert saved['plan']['input']['monthlyBill'] == 2200000
    assert saved['rows'][0]['image'].startswith('data:image/webp')
    original_image = saved['rows'][0]['image']
    page.reload()
    page.locator('.ks-quote-number').first.click()
    dialog = page.get_by_role('dialog')
    expect(dialog.locator('.ks-q-print-image img').first).to_have_attribute('src', original_image)
    assert dialog.locator('.ks-q-print-table thead th').count() >= 8
    with page.expect_download(timeout=90000) as event:
        dialog.get_by_role('button', name='PDF A4', exact=True).click()
    pdf = OUT / 'smart-quote.pdf'
    event.value.save_as(str(pdf))
    assert pdf.stat().st_size > 10000
    page.screenshot(path=str(OUT / 'quote-desktop.png'))
    dialog.get_by_role('button', name='Tạo phiên bản mới', exact=True).click()
    dialog = page.get_by_role('dialog')
    row = dialog.locator('.ks-editor-table tbody tr').first
    row.locator('summary').filter(has_text='Ảnh, bảo hành & thông số').click()
    row.get_by_role('button', name='Bỏ ảnh', exact=True).click()
    dialog.get_by_role('button', name='Lưu bản nháp', exact=True).click()
    quotes = database(page)['quotes']
    assert len(quotes) == 2 and quotes[0]['rows'][0]['image'] == ''
    assert quotes[1]['rows'][0]['image'] == original_image
    print('PASS compact money, invalid edit guards, quote image upload/catalog memory/PDF/reload/immutable revision', flush=True)

    # Fresh workspace proves previews do not mutate records before a chosen action.
    other = browser.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Asia/Ho_Chi_Minh')
    smart = other.new_page()
    smart.on('pageerror', lambda error: errors.append(str(error)))
    smart.goto(BASE + '#overview')
    result = analyze(smart, 'Nhắc gọi khách Nam ngày mai')
    assert not (database(smart) or {}).get('tasks')
    result.get_by_role('button', name='Thêm vào lịch việc', exact=True).click()
    data = database(smart)
    assert len(data['tasks']) == 1 and 'Nam' in data['tasks'][0]['title']
    tomorrow = smart.evaluate("new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000))")
    assert data['tasks'][0]['date'] == tomorrow
    result = analyze(smart, 'Tính hóa đơn 2.2tr mái 12x8 3 pha hòa lưới')
    result.get_by_role('button', name='Mở kết quả tính', exact=True).click()
    expect(smart.get_by_label('Hóa đơn trung bình tháng', exact=True).locator('..')).to_contain_text('2.200.000')
    result = analyze(smart, 'Thêm Anh Nam 0901234567 tiền điện 2.2tr')
    assert not database(smart)['customers']
    result.get_by_role('button', name='Điền hồ sơ khách', exact=True).click()
    customer_dialog = smart.get_by_role('dialog')
    expect(customer_dialog.get_by_label('Tên khách hàng / công ty', exact=False)).to_have_value('Anh Nam')
    expect(customer_dialog.get_by_label('Số điện thoại', exact=True)).to_have_value('0901234567')
    customer_dialog.get_by_role('button', name='Lưu hồ sơ', exact=True).click()
    assert len(database(smart)['customers']) == 1
    result = analyze(smart, 'Thiết bị thiếu giá')
    expect(result).to_contain_text(re.compile('giá', re.I))
    result = analyze(smart, 'Làm điều chưa hỗ trợ xyz')
    assert result.locator('.agent-workbench-result-actions button').count() == 0
    print('PASS specialist assistant previews, dated task execution, configuration command, customer prefill and unsupported request fallback', flush=True)

    for width in [360, 390, 768, 1280]:
        smart.set_viewport_size({'width': width, 'height': 900})
        for route in ['overview', 'calculator', 'quotes', 'customers', 'care', 'catalog', 'settings']:
            smart.goto(BASE + '#' + route)
            expect(smart.locator('h1').first).to_be_visible()
            assert smart.evaluate('document.documentElement.scrollWidth <= innerWidth'), (route, width)
    smart.set_viewport_size({'width': 390, 'height': 844})
    smart.goto(BASE + '#overview')
    analyze(smart, 'Nhắc gọi khách Nam ngày mai')
    # Calculator styles must not turn dashboard energy rows into its three-column table.
    assert smart.locator('.energy-comparison .comparison-row').first.evaluate('(e)=>getComputedStyle(e).display') == 'block'
    assert smart.locator('.comparison-label').first.evaluate('(e)=>e.getBoundingClientRect().width') > 200
    smart.screenshot(path=str(OUT / 'assistant-mobile.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('.ks-quote-number').first.click()
    expect(page.get_by_role('dialog')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT / 'quote-mobile.png'))
    assert not errors, errors
    print('PASS desktop/mobile360–1280px and zero JavaScript errors', flush=True)
    browser.close()
