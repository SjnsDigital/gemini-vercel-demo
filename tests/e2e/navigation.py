import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

base=os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/'
out=Path(os.environ.get('KIMSOLAR_TEST_OUTPUT','test-results'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[];failed=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failed.append((r.status,r.url)) if r.status>=400 else None)
    page.goto(base)
    expect(page.locator('.mobile-top-brand')).to_be_visible()
    assert page.locator('.mobile-top-brand img').evaluate('(i)=>i.naturalWidth')==720
    assert page.locator('.hero-photo').evaluate('(i)=>i.naturalWidth')>0
    page.get_by_role('button',name='Mở tìm kiếm',exact=True).click()
    expect(page.get_by_role('textbox',name='Tìm kiếm toàn bộ')).to_be_focused()
    page.get_by_role('textbox',name='Tìm kiếm toàn bộ').fill('FELICITY')
    expect(page.locator('.search-dropdown')).to_be_visible()
    page.get_by_role('button',name='Đóng tìm kiếm').click()
    page.get_by_role('button',name='Lưu trên máy',exact=True).click()
    expect(page.get_by_role('heading',name='Giữ một bản sao, luôn chủ động.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Mở toàn bộ chức năng').click()
    expect(page.locator('.sidebar')).to_have_attribute('aria-hidden','false')
    page.keyboard.press('Escape')
    expect(page.locator('.sidebar')).to_have_attribute('aria-hidden','true')
    print('PASS official brand, mobile search/focus, direct backup and accessible menu',flush=True)
    for route in ['overview','calculator','lookup','plans','quotes','customers','care','catalog','knowledge','settings']:
        page.goto(base+'#'+route)
        expect(page.locator('h1').first).to_be_visible()
        for width in [360,390,768,1280]:
            page.set_viewport_size({'width':width,'height':900})
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width)
        print('PASS route/responsive',route,flush=True)
    page.set_viewport_size({'width':1512,'height':1080});page.goto(base)
    page.screenshot(path=str(out/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(out/'mobile.png'),full_page=True)
    assert not failed,failed
    assert not errors,errors
    print('PASS all loaded assets and zero JavaScript errors')
    browser.close()
