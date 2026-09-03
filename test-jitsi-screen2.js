import puppeteer from 'puppeteer';

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
  const url = `https://alpha.jitsi.net/test-room-debug2#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Try to type "Bot" and press Enter
  await page.keyboard.type('AI Bot');
  await page.keyboard.press('Enter');
  
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: 'jitsi-headless2.png' });
  await browser.close();
})();
