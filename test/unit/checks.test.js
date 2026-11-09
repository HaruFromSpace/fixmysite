// Runs the real checks in Chromium on small pages, one rule at a time.
// Each rule gets pages it must flag and pages it must leave alone,
// so a check that fires on good markup shows up here too.
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { runChecks, RULES } = require('../../src/check');

let browser;
test.before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
});
test.after(async () => {
    if (browser) await browser.close();
});

const page = (body, lang = 'en') =>
    `<!doctype html><html${lang ? ` lang="${lang}"` : ''}><head><meta charset="utf-8"><title>Test</title></head><body>${body}</body></html>`;

async function check(html) {
    const p = await browser.newPage();
    try {
        await p.setContent(html, { waitUntil: 'load' });
        return await runChecks(p);
    } finally {
        await p.close();
    }
}

const IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

// Pages each rule must flag, and pages it must not
const CASES = {
    'color-contrast': {
        bad: {
            'light grey on white': '<p style="color:#aaa;background:#fff">Free shipping</p>',
            'grey just under 4.5 to 1': '<p style="color:#777;background:#fff">Free shipping</p>',
            'large text under 3 to 1': '<h1 style="font-size:32px;color:#bbb;background:#fff">Sale</h1>',
            'white on yellow button': '<button style="color:#fff;background:#ffd700;border:0">Buy now</button>',
        },
        good: {
            'dark grey on white': '<p style="color:#595959;background:#fff">Free shipping</p>',
            'large text at 3 to 1 or more': '<h1 style="font-size:32px;color:#949494;background:#fff">Sale</h1>',
            'white on dark blue': '<p style="color:#fff;background:#003366">Free shipping</p>',
            'hidden text': '<p style="display:none;color:#eee;background:#fff">Hidden</p>',
        },
    },
    'image-alt': {
        bad: {
            'no alt': `<img src="${IMG}">`,
            'role="img" with no name': `<img src="${IMG}" role="img">`,
        },
        good: {
            'descriptive alt': `<img src="${IMG}" alt="Red sneaker">`,
            'empty alt for decoration': `<img src="${IMG}" alt="">`,
            'role="presentation"': `<img src="${IMG}" role="presentation">`,
            'aria-label': `<img src="${IMG}" aria-label="Red sneaker">`,
            'aria-hidden': `<img src="${IMG}" aria-hidden="true">`,
        },
    },
    label: {
        bad: {
            'input with nothing': '<input type="email">',
            'label pointing at the wrong id': '<label for="mail">Email</label><input id="email" type="email">',
            'textarea with nothing': '<textarea></textarea>',
        },
        good: {
            'label with for': '<label for="email">Email</label><input id="email" type="email">',
            'input wrapped in label': '<label>Email <input type="email"></label>',
            'aria-label': '<input type="search" aria-label="Search the shop">',
            'aria-labelledby': '<span id="q">Search</span><input aria-labelledby="q">',
            'title attribute': '<input type="text" title="Postcode">',
            'hidden input': '<input type="hidden" name="token" value="x">',
            'submit button': '<input type="submit" value="Send">',
            // axe-core counts a placeholder as a name, so this passes even though
            // the explanation tells people not to rely on it
            'placeholder only': '<input type="email" placeholder="Email">',
        },
    },
    'html-has-lang': {
        bad: { 'no lang on html': page('<p>Hello</p>', null) },
        good: { 'lang="en"': page('<p>Hello</p>', 'en'), 'lang="de"': page('<p>Hallo</p>', 'de') },
    },
    // Ready for when link-name is added to RULES
    'link-name': {
        bad: {
            'icon-only link': '<a href="/cart"><svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg></a>',
            'empty link': '<a href="/"></a>',
            'image link without alt': `<a href="/"><img src="${IMG}"></a>`,
        },
        good: {
            'text link': '<a href="/cart">Cart</a>',
            'icon link with aria-label': '<a href="/cart" aria-label="Cart"><svg aria-hidden="true" width="16" height="16"></svg></a>',
            'image link with alt': `<a href="/"><img src="${IMG}" alt="Home"></a>`,
        },
    },
    'button-name': {
        bad: {
            'icon-only button': '<button type="button"><svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg></button>',
            'empty button': '<button type="button"></button>',
            'button with only a space': '<button type="button"> </button>',
        },
        good: {
            'text button': '<button type="button">Add to cart</button>',
            'icon button with aria-label': '<button type="button" aria-label="Add to wishlist"><svg aria-hidden="true" width="16" height="16"></svg></button>',
            'input button with value': '<input type="button" value="Search">',
        },
    },
};

function asPage(html) {
    return html.startsWith('<!doctype') ? html : page(html);
}

for (const rule of RULES) {
    const cases = CASES[rule];
    if (!cases) continue;
    for (const [name, html] of Object.entries(cases.bad)) {
        test(`${rule} flags: ${name}`, async () => {
            const report = await check(asPage(html));
            assert.ok(report.issues.some((i) => i.rule === rule), `expected ${rule} to find a problem`);
        });
    }
    for (const [name, html] of Object.entries(cases.good)) {
        test(`${rule} leaves alone: ${name}`, async () => {
            const report = await check(asPage(html));
            const issue = report.issues.find((i) => i.rule === rule);
            assert.equal(issue, undefined, issue && `unexpected ${rule}: ${JSON.stringify(issue.examples)}`);
        });
    }
}

test('a clean page has no issues', async () => {
    const report = await check(page(`
        <h1>Summer sale</h1>
        <p style="color:#222;background:#fff">Free shipping over 50 euros</p>
        <img src="${IMG}" alt="Red sneaker">
        <form><label for="e">Email</label><input id="e" type="email"><button>Sign up</button></form>`));
    assert.deepEqual(report.issues, []);
    assert.equal(report.rulesChecked, RULES.length);
});

test('the report has the fields the page and the CLI use', async () => {
    const report = await check(page(`<img src="${IMG}">`));
    assert.equal(report.title, 'Test');
    assert.equal(typeof report.url, 'string');
    assert.ok(!Number.isNaN(Date.parse(report.checkedAt)));
    const issue = report.issues.find((i) => i.rule === 'image-alt');
    for (const field of ['title', 'who', 'why', 'fix', 'before', 'after']) {
        assert.ok(issue[field], `issue.${field} is empty`);
    }
    assert.equal(issue.count, 1);
    assert.match(issue.examples[0].html, /^<img/);
    assert.equal(typeof issue.examples[0].selector, 'string');
});

test('count includes every match, but only 5 examples are kept', async () => {
    const report = await check(page(`<img src="${IMG}">`.repeat(8)));
    const issue = report.issues.find((i) => i.rule === 'image-alt');
    assert.equal(issue.count, 8);
    assert.equal(issue.examples.length, 5);
});

test('example markup is never longer than 300 characters', async () => {
    const attrs = Array.from({ length: 200 }, (_, i) => `data-a${i}="value-${i}"`).join(' ');
    const report = await check(page(`<img src="${IMG}" ${attrs}>`));
    const issue = report.issues.find((i) => i.rule === 'image-alt');
    assert.ok(issue.examples[0].html.length <= 300, `got ${issue.examples[0].html.length} characters`);
});

test('only the listed rules run, not all of axe-core', async () => {
    // A button with no text breaks axe's button-name rule, which we do not run
    const report = await check(page('<button></button><marquee>old</marquee>'));
    for (const issue of report.issues) assert.ok(RULES.includes(issue.rule), issue.rule);
});

test('checks still run on a page that requires Trusted Types', async () => {
    const html = `<!doctype html><html><head><meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="require-trusted-types-for 'script'">
        <title>Strict</title></head><body><img src="${IMG}"></body></html>`;
    const report = await check(html);
    assert.ok(report.issues.some((i) => i.rule === 'image-alt'));
    assert.ok(report.issues.some((i) => i.rule === 'html-has-lang'));
});

test('running the checks twice on one page gives the same result', async () => {
    const p = await browser.newPage();
    try {
        await p.setContent(page(`<img src="${IMG}"><input>`), { waitUntil: 'load' });
        const first = await runChecks(p);
        const second = await runChecks(p);
        assert.deepEqual(second.issues, first.issues);
    } finally {
        await p.close();
    }
});
