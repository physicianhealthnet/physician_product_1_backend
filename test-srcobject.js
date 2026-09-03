import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });
  const page = await browser.newPage();
  const fileStream = fs.createWriteStream('test-srcobject.webm');
  
  await page.exposeFunction('onMediaData', (base64Chunk) => {
    const buffer = Buffer.from(base64Chunk, 'base64');
    fileStream.write(buffer);
  });
  
  const url = `https://alpha.jitsi.net/test-room-srcobject#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.type('AI Scribe Bot');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 5000));
  
  await page.evaluate(async () => {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const combinedTracks = [];
    
    // Find the large video element
    const videoEl = document.getElementById('largeVideo');
    if (videoEl && videoEl.srcObject) {
        const videoTracks = videoEl.srcObject.getVideoTracks();
        combinedTracks.push(...videoTracks);
    }
    
    // Mix all audio
    document.querySelectorAll('audio, video').forEach(el => {
        if (el.srcObject) {
            try {
                const source = audioCtx.createMediaElementSource(el);
                source.connect(dest);
                source.connect(audioCtx.destination);
            } catch (e) {}
        }
    });
    
    combinedTracks.push(...dest.stream.getAudioTracks());
    
    const combinedStream = new MediaStream(combinedTracks);
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
