// Only let the checker visit public websites. Without this, anyone could ask
// the server to open localhost or something on the private network.
const dns = require('dns').promises;
const net = require('net');

function isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        return (
            a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            a >= 224
        );
    }
    const lower = ip.toLowerCase();
    if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice(7));
    return (
        lower === '::' ||
        lower === '::1' ||
        lower.startsWith('fc') ||
        lower.startsWith('fd') ||
        lower.startsWith('fe80')
    );
}

async function checkUrl(input) {
    let url;
    try {
        url = new URL(input.includes('://') ? input : `https://${input}`);
    } catch {
        throw new Error('That does not look like a web address.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only http and https addresses can be checked.');
    }

    let addresses;
    try {
        addresses = await dns.lookup(url.hostname, { all: true });
    } catch {
        throw new Error(`Could not find a website at ${url.hostname}.`);
    }
    if (addresses.some((a) => isPrivateIp(a.address))) {
        throw new Error('Only public websites can be checked.');
    }
    return url.toString();
}

module.exports = { checkUrl, isPrivateIp };
