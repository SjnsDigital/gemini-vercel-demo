import os
import json,time
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 config={'url':'https://new-project.supabase.co','key':'sb_publishable_test'}
 session={'projectUrl':'https://old-project.supabase.co','accessToken':'old-access-test','refreshToken':'old-refresh-test','expiresAt':int(time.time()*1000)+600000,'user':{'id':'test-user','email':'test@example.com'}}
 page.add_init_script('localStorage.setItem("kimsolar.cloud.config.v1",'+json.dumps(json.dumps(config))+');sessionStorage.setItem("kimsolar.cloud.session.v1",'+json.dumps(json.dumps(session))+');')
 def mock(route):
  url=route.request.url;requests.append(url)
  if '/auth/v1/token' in url: body={'access_token':'test-access','refresh_token':'test-refresh','expires_in':3600,'user':{'id':'test-user','email':'test@example.com'}}
  elif '/ks_members' in url:body=[{'workspace_id':'test-space','role':'viewer','ks_workspaces':{'id':'test-space','name':'Test viewer'}}]
  elif '/ks_workspace_state' in url:body=[{'workspace_id':'test-space','revision':1,'data':{},'updated_at':'2026-10-29T16:00:00Z'}]
  else:body={}
  route.fulfill(status=200,content_type='application/json',body=json.dumps(body),headers={'access-control-allow-origin':'*'})
 page.route('https://*.supabase.co/**',mock)
 page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/');page.goto(os.environ.get('KIMSOLAR_TEST_URL','http://127.0.0.1:5173').rstrip('/')+'/#settings');page.get_by_text('Kết nối dữ liệu đội nhóm (tùy chọn)',exact=True).click();page.get_by_role('button',name='Thiết lập đám mây',exact=True).click()
 expect(page.get_by_text('Cấu hình dự án đã thay đổi.',exact=False)).to_be_visible()
 assert requests==[],requests
 assert page.evaluate('sessionStorage.getItem("kimsolar.cloud.session.v1")') is None
 print('PASS mismatched-project restored session discarded before any request')
 page.get_by_label('Email nhân viên').fill('test@example.com');page.get_by_label('Mật khẩu',exact=True).fill('test-password-not-real');page.get_by_role('button',name='Đăng nhập & kiểm tra kết nối').click()
 expect(page.get_by_text('Tài khoản đã được xác thực',exact=True)).to_be_visible()
 saved=json.loads(page.evaluate('sessionStorage.getItem("kimsolar.cloud.session.v1")'));assert saved['projectUrl']==config['url']
 page.get_by_label('Không gian làm việc',exact=True).select_option('test-space')
 expect(page.get_by_role('button',name='Tải dữ liệu lên đám mây')).to_be_disabled()
 assert not errors,errors
 print('PASS mocked login binds project, membership selects viewer and disables write; not a live Supabase test')
 b.close()
