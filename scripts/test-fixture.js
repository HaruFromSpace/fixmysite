// Runs every check on test/fixture.html. Fails if a rule finds nothing,
// so each new rule needs a broken example in the fixture.
// Also writes public/example-report.json for the "See an example report" button.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { runChecks, RULES } = require('../src/check');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    try {
        const page = await browser.newPage();
        const html = fs.readFileSync(path.join(__dirname, '..', 'test', 'fixture.html'), 'utf8');
        await page.setContent(html, { waitUntil: 'load' });
        const report = await runChecks(page);

        const found = new Set(report.issues.map((i) => i.rule));
        const missed = RULES.filter((r) => !found.has(r));
        for (const rule of RULES) console.log(`${found.has(rule) ? 'ok  ' : 'MISS'} ${rule}`);
        if (missed.length) {
            console.error(`\nNo problem found for: ${missed.join(', ')}. Add a broken example to test/fixture.html.`);
            process.exit(1);
        }

        report.url = 'https://example-shop.test/';
        report.title = 'Example shop';
        fs.writeFileSync(path.join(__dirname, '..', 'public', 'example-report.json'), JSON.stringify(report, null, 2) + '\n');
        console.log('\nWrote public/example-report.json');
    } finally {
        await browser.close();
    }
})();
