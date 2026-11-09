const test = require('node:test');
const assert = require('node:assert/strict');
const { RULES } = require('../../src/check');
const { explain, EXPLANATIONS } = require('../../src/explanations');

const FIELDS = ['title', 'who', 'why', 'fix', 'before', 'after'];

test('every rule that runs has a full plain-language explanation', () => {
    for (const rule of RULES) {
        assert.ok(EXPLANATIONS[rule], `${rule} is in RULES but has no entry in src/explanations.js`);
        for (const field of FIELDS) {
            const value = EXPLANATIONS[rule][field];
            assert.equal(typeof value, 'string', `${rule}.${field}`);
            assert.ok(value.trim().length > 0, `${rule}.${field} is empty`);
        }
    }
});

test('every explanation belongs to a rule that runs', () => {
    for (const rule of Object.keys(EXPLANATIONS)) {
        assert.ok(RULES.includes(rule), `${rule} is explained but not in RULES`);
    }
});

test('each rule is listed once', () => {
    assert.equal(new Set(RULES).size, RULES.length);
});

test('before and after examples are different', () => {
    for (const rule of RULES) {
        assert.notEqual(EXPLANATIONS[rule].before, EXPLANATIONS[rule].after, rule);
    }
});

test('explanations avoid developer words a shop owner would not know', () => {
    const jargon = /\b(axe|wcag|aria|dom|selector|violation|node)\b/i;
    for (const rule of RULES) {
        for (const field of ['title', 'who', 'why']) {
            assert.doesNotMatch(EXPLANATIONS[rule][field], jargon, `${rule}.${field}`);
        }
    }
});

test('explain() falls back to the rule id for a rule with no text', () => {
    const result = explain('some-new-rule');
    assert.equal(result.title, 'some-new-rule');
    for (const field of FIELDS.slice(1)) assert.equal(result[field], '');
});
