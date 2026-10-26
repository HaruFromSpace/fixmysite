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

// Errors meant to be shown to the visitor as they are
function userError(message) {
    const err = new Error(message);
    err.userFacing = true;
    return err;
}

async function checkUrl(input) {
    let url;
    try {
        url = new URL(input.includes('://') ? input : `https://${input}`);
    } catch {
        throw userError('That does not look like a web address.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw userError('Only http and https addresses can be checked.');
    }

    let addresses;
    try {
        addresses = await dns.lookup(url.hostname, { all: true });
    } catch {
        throw userError(`Could not find a website at ${url.hostname}.`);
    }
    if (addresses.some((a) => isPrivateIp(a.address))) {
        throw userError('Only public websites can be checked.');
    }
    return url.toString();
}

module.exports = { checkUrl, isPrivateIp };
