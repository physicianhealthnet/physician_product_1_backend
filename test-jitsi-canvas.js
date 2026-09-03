import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--window-size=1280,720'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  const fileStream = fs.createWriteStream('test-canvas.webm');
  
  await page.exposeFunction('onMediaData', (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    fileStream.write(buffer);
  });
  
  const url = `https://alpha.jitsi.net/test-room-canvas#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.type('AI Scribe Bot');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  
  await page.evaluate(async () => {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const videoStream = canvas.captureStream(30);
    
    setInterval(() => {
        const video = document.getElementById('largeVideo');
        if (video) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
            // Draw a black background with text if no video
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.fillText('Waiting for video...', 50, 50);
        }
    }, 1000 / 30);

    setInterval(() => {
        document.querySelectorAll('audio, video').forEach(el => {
            if (!el._capturedAudio) {
                el._capturedAudio = true;
                try {
                    const source = audioCtx.createMediaElementSource(el);
                    source.connect(dest);
                    source.connect(audioCtx.destination);
                } catch (e) {
                }
            }
        });
    }, 1000);
    
    const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
    ]);
    
    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp8,opus' });
    
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        window.onMediaData(btoa(binary));
      }
    };
    recorder.start(1000);
  });
  
  console.log("Recording started...");
  await new Promise(r => setTimeout(r, 10000));
  fileStream.end();
  await browser.close();
  console.log("Recording finished.");
})();
