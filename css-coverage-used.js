const puppeteer = require('puppeteer');
const fs = require('fs');

const mobile = puppeteer.KnownDevices['Moto G4'];

const credentials = require('./credentials');

const urls = require('./urls');

async function startBrowser() {
    const browser = await puppeteer.launch({
        headless: false // Change this for debug
    });
    const page = await browser.newPage();
    return { browser, page };
}

async function closeBrowser(browser) {
    return browser.close();
}

async function collectCss(device) {
    const { browser, page } = await startBrowser();
    if (device == 'm') {
        await page.emulate(mobile);
    } else {
        await page.setViewport({ width: 1280, height: 1024 });
    }

    const url = new URL(credentials.url);
    const host = url.host;

    await page.goto(credentials.url);
    await page.click(credentials.username_selector);
    await page.keyboard.type(credentials.username);
    await page.click(credentials.password_selector);
    await page.keyboard.type(credentials.password);
    await page.click(credentials.button_selector);

    for (let key of Object.keys(urls)) {
        try {

            await page.coverage.startCSSCoverage();
            await page.goto(urls[key]);
            const css_coverage = await page.coverage.stopCSSCoverage();

            let final_css_bytes = '';
            let total_bytes = 0;
            let used_bytes = 0;

            const dirpath = './result/' + host + '-' + key + '-' + device + '/';

            fs.mkdirSync(dirpath, { recursive: true });

            for (const entry of css_coverage) {
                final_css_bytes = "";

                total_bytes += entry.text.length;
                for (const range of entry.ranges) {
                    used_bytes += range.end - range.start - 1;
                    final_css_bytes += entry.text.slice(range.start, range.end) + '\n';
                }

                filename = entry.url.split('/').pop();

                fs.writeFile(dirpath + filename, final_css_bytes, error => {
                    if (error) {
                        console.log('Error creating file:', error);
                    } else {
                        console.log('File saved');
                    }
                });
            }

            await page.screenshot({ path: dirpath + 'screenshot.png' })
            console.log(`OK for url: ${urls[key]}`);
        } catch (err) {
            console.log(`An error occured on url: ${urls[key]}`);
        }
    }

    await closeBrowser(browser);
}

(async () => {

    try {
        await collectCss('m');
        await collectCss('l');
        console.log(`OK`);
    } catch (err) {
        console.log(`ERROR: ${err}`);
    }

    process.exit(1);
})();