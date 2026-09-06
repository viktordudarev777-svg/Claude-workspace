import os, json, subprocess, time, imageio_ffmpeg
from playwright.sync_api import sync_playwright
EXE="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
FF=imageio_ffmpeg.get_ffmpeg_exe()
TL=json.load(open("build/timeline.json")); TOTAL=TL["total"]
FPS=30; N=int(round((TOTAL+0.35)*FPS))
os.makedirs("out",exist_ok=True)
cmd=[FF,"-y","-hide_banner","-loglevel","error","-f","image2pipe","-framerate",str(FPS),"-i","-",
     "-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-r",str(FPS),
     "-movflags","+faststart","build/video_silent.mp4"]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
t0=time.time()
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path=EXE,args=["--no-sandbox","--disable-lcd-text","--force-color-profile=srgb","--hide-scrollbars","--disable-gpu"])
    pg=b.new_page(viewport={"width":1080,"height":1920},device_scale_factor=1)
    pg.goto("file://"+os.path.abspath("build/scene.html"))
    pg.wait_for_function("document.fonts.status==='loaded'",timeout=30000); pg.wait_for_timeout(400)
    for i in range(N):
        pg.evaluate("t=>window.render(t)", i/FPS)
        p.stdin.write(pg.screenshot(type="jpeg",quality=94))
        if i%150==0: print(f"{i}/{N}  {time.time()-t0:.0f}s",flush=True)
    b.close()
p.stdin.close(); p.wait()
print("frames",N,"done in",round(time.time()-t0),"s")
