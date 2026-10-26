const express = require('express');
const path = require('path');
const { checkPage } = require('./src/check');

const app = express();
const PORT = process.env.PORT || 3000;

// Each check starts a browser, so keep the number running at once small
const MAX_RUNNING = Number(process.env.MAX_RUNNING) || 2;
let running = 0;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/check', async (req, res) => {
    const url = (req.body && req.body.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Enter a web address to check.' });
    if (running >= MAX_RUNNING) {
        return res.status(503).json({ error: 'Busy checking other sites. Try again in a minute.' });
    }

    running++;
    try {
        res.json(await checkPage(url));
    } catch (err) {
        const message = err.message.startsWith('page.goto')
            ? 'The page did not load. Check the address and try again.'
            : err.message;
        res.status(400).json({ error: message });
    } finally {
        running--;
    }
});

app.listen(PORT, () => {
    console.log(`fixmysite running on http://localhost:${PORT}`);
});
