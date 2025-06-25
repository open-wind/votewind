import asyncio
import uuid
from playwright.async_api import async_playwright
import os
import subprocess

LONG = -0.14895
LAT = 50.83164
BASE_HOST = "http://localhost:3000" 
BASE_HOST = "https://votewind.org"
URL = f"{BASE_HOST}/{LONG}/{LAT}/animation/"

FRAME_DIR = str(uuid.uuid1())
VIDEO_NAME = f'animation_{LONG}_{LAT}.mp4'
WIDTH = 440
HEIGHT = 440
FRAME_RATE = 24
DURATION = 20  # seconds
TOTAL_FRAMES = FRAME_RATE * DURATION

async def record_frames():
    if not os.path.exists(FRAME_DIR):
        os.makedirs(FRAME_DIR)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=[f"--window-size={WIDTH},{HEIGHT}"])
        context = await browser.new_context(
            viewport={'width': WIDTH, 'height': HEIGHT},
            device_scale_factor=2,
            user_agent="Mozilla/5.0 (X11; Linux ARM64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
        )
        page = await context.new_page()
        await page.goto(URL, wait_until='networkidle')

        await page.wait_for_function("() => window.renderingReady === true")

        # Capture frame-by-frame
        for i in range(TOTAL_FRAMES):
            print("Generating frame", i, "/", TOTAL_FRAMES)
            path = os.path.join(FRAME_DIR, f"frame-{i:04d}.png")
            await page.screenshot(path=path)
            await page.evaluate("rotateStepByStep(1)")  # Advance 1 frame
            # Wait for render frame
            await page.evaluate("""() => {
                return new Promise(resolve => requestAnimationFrame(resolve));
            }""")

        await browser.close()

def compile_video():
    cmd = [
        'ffmpeg',
        '-y',
        '-r', str(FRAME_RATE),
        '-f', 'image2',
        '-i', f'{FRAME_DIR}/frame-%04d.png',
        '-vcodec', 'libx264',
        '-pix_fmt', 'yuv420p',
        VIDEO_NAME
    ]
    subprocess.run(cmd)
    print(f'✅ Video saved as {VIDEO_NAME}')

if __name__ == '__main__':
    asyncio.run(record_frames())
    compile_video()
