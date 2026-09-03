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
  await page.goto('https://example.com');
  
  try {
    const success = await page.evaluate(async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        return stream.active;
      } catch (e) {
        return e.message;
      }
    });
    console.log("Capture result:", success);
  } catch(e) {
    console.error(e);
  }
  await browser.close();
})();
