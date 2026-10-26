#!/usr/bin/env node
// Usage: npm run check -- example.com
const { checkPage } = require('./check');

const target = process.argv[2];
if (!target) {
    console.log('usage: npm run check -- <url>');
    process.exit(1);
}

checkPage(target)
    .then((report) => {
        console.log(`${report.title || report.url}`);
        if (report.issues.length === 0) {
            console.log(`No problems found in the ${report.rulesChecked} checks.`);
            return;
        }
        for (const issue of report.issues) {
            console.log(`\n- ${issue.title} (${issue.count} found)`);
            console.log(`  Fix: ${issue.fix}`);
        }
    })
    .catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
