const fs = require('fs');
const { chromium } = require('playwright');
const { checkUrl, isPrivateIp } = require('./safe-url');
const { explain } = require('./explanations');

const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// The four problems that show up on most pages (WebAIM Million 2026).
// More rules can be added here one at a time.
const RULES = ['color-contrast', 'image-alt', 'label', 'html-has-lang'];

async function checkPage(input) {
    const url = await checkUrl(input);

    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        // Small containers have a tiny /dev/shm, which crashes Chromium
        args: ['--disable-dev-shm-usage', '--disable-gpu'],
    });
    try {
        // bypassCSP: some sites (YouTube, Google) block injected scripts with a strict
        // Content Security Policy, which would stop axe-core from loading
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, bypassCSP: true });
        const page = await context.newPage();

        // Block redirects or sub-requests into private networks too
        await page.route('**/*', async (route) => {
            const { hostname } = new URL(route.request().url());
            if (hostname === 'localhost' || isPrivateIp(hostname)) return route.abort();
            return route.continue();
        });

        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        return await runChecks(page);
    } finally {
        await browser.close();
    }
}

// Runs the rules on a page that is already open and builds the report
async function runChecks(page) {
    // evaluate() instead of a <script> tag, so pages that require Trusted Types still work
    await page.evaluate(AXE_SOURCE);

    const results = await page.evaluate(async (rules) => {
        return window.axe.run(document, {
            runOnly: { type: 'rule', values: rules },
            resultTypes: ['violations'],
        });
    }, RULES);

    return {
        url: page.url(),
        title: await page.title(),
        checkedAt: new Date().toISOString(),
        rulesChecked: RULES.length,
        issues: results.violations.map((v) => ({
            rule: v.id,
            ...explain(v.id),
            count: v.nodes.length,
            examples: v.nodes.slice(0, 5).map((n) => ({
                html: n.html.slice(0, 300),
                selector: n.target.join(' '),
            })),
        })),
    };
}

module.exports = { checkPage, runChecks, RULES };
