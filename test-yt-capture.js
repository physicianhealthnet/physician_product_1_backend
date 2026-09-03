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
      '--window-size=1280,720'
    ]
  });
  const page = await browser.newPage();
  const fileStream = fs.createWriteStream('test-yt.webm');
  
  await page.exposeFunction('onAudioData', (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    fileStream.write(buffer);
  });
  
  await page.goto('https://www.youtube.com/watch?v=aqz-KE-bpKQ', { waitUntil: 'domcontentloaded' });
  
  await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audioTrack = stream.getAudioTracks()[0];
    const audioStream = new MediaStream([audioTrack]);
    const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
    
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
  await new Promise(r => setTimeout(r, 10000));
  fileStream.end();
  await browser.close();
  console.log("Recording finished.");
})();
