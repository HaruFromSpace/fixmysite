// Starts the real server on a free port and talks to it over HTTP.
// None of these cases need the internet: they all stop before a browser opens.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const { RULES } = require('../../src/check');
const { EXPLANATIONS } = require('../../src/explanations');

let server;
let base;

function freePort() {
    return new Promise((resolve, reject) => {
        const s = net.createServer().listen(0, () => {
            const { port } = s.address();
            s.close(() => resolve(port));
        });
        s.on('error', reject);
    });
}

test.before(async () => {
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [path.join(__dirname, '..', '..', 'server.js')], {
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('server did not start')), 10000);
        server.stdout.on('data', (d) => {
            if (String(d).includes('running')) {
                clearTimeout(timer);
                resolve();
            }
        });
        server.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
    });
});

test.after(() => {
    if (server) server.kill();
});

const post = (body, headers = { 'Content-Type': 'application/json' }) =>
    fetch(`${base}/api/check`, { method: 'POST', headers, body });

test('GET /api/rules lists every rule with its plain title', async () => {
    const res = await fetch(`${base}/api/rules`);
    assert.equal(res.status, 200);
    const rules = await res.json();
    assert.deepEqual(rules.map((r) => r.id), RULES);
    for (const r of rules) {
        assert.equal(r.title, EXPLANATIONS[r.id].title);
        assert.equal(r.who, EXPLANATIONS[r.id].who);
    }
});

test('the start page and the example report are served', async () => {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /html/);

    const example = await fetch(`${base}/example-report.json`);
    assert.equal(example.status, 200);
    const report = await example.json();
    assert.ok(Array.isArray(report.issues) && report.issues.length > 0);
});

test('POST /api/check asks for an address when none is given', async () => {
    for (const body of ['{}', '{"url":""}', '{"url":"   "}']) {
        const res = await post(body);
        assert.equal(res.status, 400);
        assert.deepEqual(await res.json(), { error: 'Enter a web address to check.' });
    }
});

test('POST /api/check copes with a missing or non-JSON body', async () => {
    const res = await post(undefined, {});
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'Enter a web address to check.' });
});

test('POST /api/check refuses private addresses with a friendly message', async () => {
    for (const url of ['localhost', 'http://127.0.0.1:22', 'http://169.254.169.254/', 'http://[::1]/']) {
        const res = await post(JSON.stringify({ url }));
        assert.equal(res.status, 400, url);
        assert.deepEqual(await res.json(), { error: 'Only public websites can be checked.' }, url);
    }
});

test('POST /api/check explains bad addresses without showing raw errors', async () => {
    const cases = {
        'ftp://example.com': 'Only http and https addresses can be checked.',
        'http://': 'That does not look like a web address.',
        'https://no-such-shop.invalid': 'Could not find a website at no-such-shop.invalid.',
    };
    for (const [url, error] of Object.entries(cases)) {
        const res = await post(JSON.stringify({ url }));
        assert.equal(res.status, 400, url);
        const body = await res.json();
        assert.deepEqual(body, { error }, url);
    }
});

test('a url that is not a string gets a friendly error, not a crash', async () => {
    for (const url of [42, ['a'], { href: 'x' }, true]) {
        const res = await post(JSON.stringify({ url }));
        assert.equal(res.status, 400, JSON.stringify(url));
        const body = await res.json();
        assert.equal(typeof body.error, 'string');
        assert.doesNotMatch(body.error, /TypeError|is not a function|at .*\.js/, JSON.stringify(url));
    }
});

test('broken JSON gets a plain error, not a stack trace', async () => {
    const res = await post('{"url":');
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.doesNotMatch(text, /SyntaxError|at .*node_modules|<pre>/);
});

test('broken JSON still comes back as JSON the page can show', async () => {
    const res = await post('{"url":');
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
});
