const test = require('node:test');
const assert = require('node:assert/strict');
const { checkUrl, isPrivateIp } = require('../../src/safe-url');

test('isPrivateIp blocks private and special IPv4 ranges', () => {
    const blocked = [
        '0.0.0.0', '10.0.0.1', '127.0.0.1', '127.255.255.255',
        '100.64.0.1', '100.127.255.255', // carrier-grade NAT
        '169.254.169.254', // cloud metadata service
        '172.16.0.1', '172.31.255.255',
        '192.168.1.1',
        '224.0.0.1', '255.255.255.255',
    ];
    for (const ip of blocked) assert.equal(isPrivateIp(ip), true, ip);
});

test('isPrivateIp lets public IPv4 addresses through, including ones next to private ranges', () => {
    const allowed = ['8.8.8.8', '1.1.1.1', '100.63.255.255', '100.128.0.1', '172.15.0.1', '172.32.0.1', '192.167.1.1', '169.253.0.1', '223.255.255.255'];
    for (const ip of allowed) assert.equal(isPrivateIp(ip), false, ip);
});

test('isPrivateIp handles IPv6', () => {
    for (const ip of ['::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'FE80::ABCD']) {
        assert.equal(isPrivateIp(ip), true, ip);
    }
    for (const ip of ['2001:4860:4860::8888', '2606:4700::1111']) {
        assert.equal(isPrivateIp(ip), false, ip);
    }
});

test('isPrivateIp sees through IPv4-mapped IPv6 addresses', () => {
    assert.equal(isPrivateIp('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateIp('::ffff:192.168.0.10'), true);
    assert.equal(isPrivateIp('::FFFF:10.1.2.3'), true);
    assert.equal(isPrivateIp('::ffff:8.8.8.8'), false);
});

async function rejectsWith(input, message) {
    await assert.rejects(checkUrl(input), (err) => {
        assert.equal(err.userFacing, true, 'error should be safe to show the visitor');
        assert.equal(err.message, message);
        return true;
    });
}

test('checkUrl refuses things that are not web addresses', async () => {
    await rejectsWith('http://', 'That does not look like a web address.');
    await rejectsWith('https://exa mple.com', 'That does not look like a web address.');
});

test('checkUrl only accepts http and https', async () => {
    for (const input of ['ftp://example.com', 'file:///etc/passwd', 'javascript://alert(1)', 'data://text/plain,hi']) {
        await rejectsWith(input, 'Only http and https addresses can be checked.');
    }
});

test('checkUrl refuses localhost and private addresses', async () => {
    for (const input of [
        'localhost',
        'http://localhost:3000',
        'http://127.0.0.1',
        'http://0.0.0.0',
        'http://10.0.0.5/admin',
        'http://192.168.1.1',
        'http://169.254.169.254/latest/meta-data',
        'http://[::1]/',
        'http://[::ffff:127.0.0.1]/',
        'http://[0:0:0:0:0:0:0:1]/',
        'http://[fd00::1]/',
        'http://2130706433/', // 127.0.0.1 written as one number
        'http://0x7f.0.0.1/', // 127.0.0.1 in hex
    ]) {
        await rejectsWith(input, 'Only public websites can be checked.');
    }
});

test('checkUrl adds https:// when the scheme is missing', async () => {
    assert.equal(await checkUrl('8.8.8.8'), 'https://8.8.8.8/');
    assert.equal(await checkUrl('8.8.8.8/shop?page=2'), 'https://8.8.8.8/shop?page=2');
});

test('checkUrl keeps http, ports, paths and queries as given', async () => {
    assert.equal(await checkUrl('http://1.1.1.1:8080/a/b?x=1#top'), 'http://1.1.1.1:8080/a/b?x=1#top');
});

test('checkUrl gives a friendly message when the site does not exist', async () => {
    // .invalid is reserved and never resolves
    await rejectsWith('https://no-such-shop.invalid', 'Could not find a website at no-such-shop.invalid.');
});

test('isPrivateIp reads IPv6 written the long way or in upper case', () => {
    assert.equal(isPrivateIp('0:0:0:0:0:0:0:1'), true);
    assert.equal(isPrivateIp('0000:0000:0000:0000:0000:0000:0000:0000'), true);
    assert.equal(isPrivateIp('FD00::1'), true);
    assert.equal(isPrivateIp('fe80::1%eth0'), true);
});

test('isPrivateIp reads IPv4-mapped addresses in the hex form', () => {
    assert.equal(isPrivateIp('::ffff:7f00:1'), true); // 127.0.0.1
    assert.equal(isPrivateIp('::ffff:c0a8:101'), true); // 192.168.1.1
    assert.equal(isPrivateIp('0:0:0:0:0:ffff:a00:1'), true); // 10.0.0.1
    assert.equal(isPrivateIp('::ffff:808:808'), false); // 8.8.8.8
});

// check.js blocks redirects and sub-requests with isPrivateIp(new URL(...).hostname),
// and URL.hostname keeps the brackets around IPv6 addresses
test('isPrivateIp works on URL hostnames, the way the browser guard calls it', () => {
    for (const url of ['http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]:8080/', 'http://127.1/', 'http://0177.0.0.1/']) {
        assert.equal(isPrivateIp(new URL(url).hostname), true, url);
    }
    assert.equal(isPrivateIp(new URL('http://[2606:4700::1111]/').hostname), false);
    assert.equal(isPrivateIp(new URL('https://example.com/').hostname), false);
});

test('isPrivateIp returns false for host names, which checkUrl resolves first', () => {
    assert.equal(isPrivateIp('example.com'), false);
    assert.equal(isPrivateIp(''), false);
});
