import { launch, getStream } from 'puppeteer-stream';
import fs from 'fs';

import puppeteer from 'puppeteer';

const getExecutablePath = () => {
  const commonPaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return puppeteer.executablePath();
};

(async () => {
    const browser = await launch({
        headless: 'new',
        executablePath: getExecutablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    const page = await browser.newPage();
    const url = `https://alpha.jitsi.net/test-room-stream#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.keyboard.type('AI Scribe Bot');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 5000));

    const stream = await getStream(page, { audio: true, video: true, mimeType: 'video/webm' });
    const file = fs.createWriteStream('test-stream.webm');
    
    stream.pipe(file);

    console.log("Recording started with puppeteer-stream...");
    await new Promise(r => setTimeout(r, 10000));

    stream.destroy();
    file.end();
    await browser.close();
    console.log("Recording finished.");
})();
