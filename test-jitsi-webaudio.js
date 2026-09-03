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
  
  const fileStream = fs.createWriteStream('test-webaudio.webm');
  
  await page.exposeFunction('onAudioData', (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    fileStream.write(buffer);
  });
  
  const url = `https://alpha.jitsi.net/test-room-webaudio#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.type('AI Scribe Bot');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  
  await page.evaluate(async () => {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    
    // Periodically poll for new audio/video elements
    setInterval(() => {
        document.querySelectorAll('audio, video').forEach(el => {
            if (!el._captured) {
                el._captured = true;
                // Cross origin is fine because we are on alpha.jitsi.net
                try {
                    const source = audioCtx.createMediaElementSource(el);
                    source.connect(dest);
                    source.connect(audioCtx.destination);
                    console.log("Captured media element!");
                } catch (e) {
                    console.error("Error capturing element", e);
                }
            }
        });
    }, 1000);
    
    const recorder = new MediaRecorder(dest.stream, { mimeType: 'audio/webm' });
    
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        window.onAudioData(btoa(binary));
      }
    };
    recorder.start(1000);
  });
  
  console.log("Recording started...");
  // I will just let it record for 10 seconds, during this time I will not join myself but we'll see if it generates a file.
  await new Promise(r => setTimeout(r, 10000));
  fileStream.end();
  await browser.close();
  console.log("Recording finished.");
})();
