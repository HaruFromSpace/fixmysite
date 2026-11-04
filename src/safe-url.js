// Only let the checker visit public websites. Without this, anyone could ask
// the server to open localhost or something on the private network.
const dns = require('dns').promises;
const net = require('net');

function isPrivateIp(ip) {
    // URL.hostname keeps the brackets around IPv6 addresses, e.g. "[::1]"
    if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
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
    if (!net.isIPv6(ip)) return false;
    // Write it the short way, so 0:0:0:0:0:0:0:1 becomes ::1
    let lower;
    try {
        lower = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    } catch {
        return true; // e.g. a zone id like fe80::1%eth0. Refuse what we can't read.
    }
    // IPv4 inside IPv6. The URL parser turns ::ffff:127.0.0.1 into ::ffff:7f00:1
    const mapped = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mapped) {
        const hi = parseInt(mapped[1], 16);
        const lo = parseInt(mapped[2], 16);
        return isPrivateIp([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'));
    }
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
        addresses = await dns.lookup(url.hostname.replace(/^\[(.*)\]$/, '$1'), { all: true });
    } catch {
        throw userError(`Could not find a website at ${url.hostname}.`);
    }
    if (addresses.some((a) => isPrivateIp(a.address))) {
        throw userError('Only public websites can be checked.');
    }
    return url.toString();
}

module.exports = { checkUrl, isPrivateIp };
