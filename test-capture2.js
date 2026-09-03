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
  
  const fileStream = fs.createWriteStream('test-output.webm');
  
  await page.exposeFunction('onAudioData', (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    fileStream.write(buffer);
  });
  
  await page.goto('https://example.com');
  
  await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    // Keep only audio
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
        console.error("NO AUDIO TRACK");
        return;
    }
    const audioStream = new MediaStream([audioTrack]);
    const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
    
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        // Convert to base64
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        window.onAudioData(btoa(binary));
      }
    };
    
    recorder.start(1000); // chunk every 1 second
  });
  
  console.log("Recording started...");
  await new Promise(r => setTimeout(r, 5000)); // Record for 5 seconds
  fileStream.end();
  await browser.close();
  console.log("Recording finished.");
})();
