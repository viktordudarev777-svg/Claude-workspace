import sys, os, json
from playwright.sync_api import sync_playwright
EXE="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
times=[float(x) for x in sys.argv[1:]]
os.makedirs("build/preview", exist_ok=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=EXE, args=["--no-sandbox","--disable-lcd-text","--force-color-profile=srgb","--hide-scrollbars"])
    pg=b.new_page(viewport={"width":1080,"height":1920}, device_scale_factor=1)
    pg.goto("file://"+os.path.abspath("build/scene.html"))
    pg.wait_for_function("document.fonts.status==='loaded'", timeout=30000)
    pg.wait_for_timeout(400)
    for t in times:
        pg.evaluate("t=>window.render(t)", t)
        pg.screenshot(path=f"build/preview/f{t:06.2f}.png")
        print("frame", t)
    b.close()
