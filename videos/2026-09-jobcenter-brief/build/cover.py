import os
from playwright.sync_api import sync_playwright
EXE="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=EXE,args=["--no-sandbox","--disable-lcd-text","--force-color-profile=srgb","--hide-scrollbars"])
    pg=b.new_page(viewport={"width":1080,"height":1920},device_scale_factor=1)
    pg.goto("file://"+os.path.abspath("build/scene.html"))
    pg.wait_for_function("document.fonts.status==='loaded'",timeout=30000); pg.wait_for_timeout(400)
    pg.evaluate("""()=>{
      window.render(2.0);
      document.getElementById('subs').style.display='none';
      document.querySelector('.prog').style.display='none';
      const c=document.querySelector('.scene[data-s="cover"]');
      c.style.opacity=1; c.style.transform='scale(1.06)';
      document.getElementById('art').style.top='420px';
      document.getElementById('art').style.height='1100px';
      document.querySelector('.footer').style.top='auto';
      document.querySelector('.footer').style.bottom='120px';
      document.querySelector('.footer').style.justifyContent='center';
    }""")
    pg.wait_for_timeout(150)
    pg.screenshot(path="out/cover_1080x1920.png")
    b.close()
print("cover ok")
