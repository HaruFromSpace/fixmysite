const form = document.getElementById('checkForm');
const input = document.getElementById('urlInput');
const button = document.getElementById('checkBtn');
const statusEl = document.getElementById('status');
const report = document.getElementById('report');
const template = document.getElementById('issueTemplate');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    report.hidden = true;
    report.innerHTML = '';
    statusEl.textContent = 'Checking. This takes about 10 seconds.';

    try {
        const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: input.value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Something went wrong.');
        showReport(data);
        statusEl.textContent = '';
    } catch (err) {
        statusEl.textContent = err.message;
    } finally {
        button.disabled = false;
    }
});

function showReport(data) {
    const heading = document.createElement('h2');
    const summary = document.createElement('p');
    summary.className = 'summary';

    if (data.issues.length === 0) {
        heading.textContent = 'No problems found';
        summary.textContent = `All ${data.rulesChecked} checks passed on ${data.title || data.url}.`;
        report.append(heading, summary);
    } else {
        const total = data.issues.reduce((n, i) => n + i.count, 0);
        heading.textContent = `${data.issues.length} of ${data.rulesChecked} checks found problems`;
        summary.textContent = `${total} places to fix on ${data.title || data.url}.`;
        report.append(heading, summary);
        for (const issue of data.issues) report.append(renderIssue(issue));
    }
    report.hidden = false;
    heading.tabIndex = -1;
    heading.focus();
}

function renderIssue(issue) {
    const node = template.content.cloneNode(true);
    const set = (cls, text) => { node.querySelector(cls).textContent = text; };
    set('.issue-title', issue.title);
    set('.issue-count', issue.count === 1 ? 'Found in 1 place' : `Found in ${issue.count} places`);
    set('.issue-who', issue.who);
    set('.issue-why', issue.why);
    set('.issue-fix', issue.fix);
    set('.issue-before', issue.before);
    set('.issue-after', issue.after);

    const list = node.querySelector('.issue-examples');
    for (const ex of issue.examples) {
        const li = document.createElement('li');
        const code = document.createElement('code');
        code.textContent = ex.html;
        li.append(code);
        list.append(li);
    }
    return node;
}
