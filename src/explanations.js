// Plain-language versions of the axe-core rules we run.
// Written for shop owners, not developers.
const EXPLANATIONS = {
    'color-contrast': {
        title: 'Some text is hard to read',
        who: 'People with low vision, older visitors, and anyone reading on a phone in sunlight.',
        why: 'The text colour is too close to the background colour.',
        fix: 'Make the text darker or the background lighter. Normal text needs a contrast ratio of at least 4.5 to 1. Large text needs 3 to 1.',
        before: '<p style="color: #999; background: #fff">Free shipping over 50 euros</p>',
        after: '<p style="color: #595959; background: #fff">Free shipping over 50 euros</p>',
    },
    'image-alt': {
        title: 'Images have no description',
        who: 'Blind visitors using a screen reader. It reads the file name or skips the image.',
        why: 'The image has no alt text.',
        fix: 'Add an alt attribute that says what the image shows. For pure decoration, use an empty alt="" so screen readers skip it.',
        before: '<img src="red-shoe-42.jpg">',
        after: '<img src="red-shoe-42.jpg" alt="Red leather sneaker, side view">',
    },
    label: {
        title: 'Form fields have no label',
        who: 'Screen reader users hear "edit text" with no idea what to type. Voice control users cannot name the field.',
        why: 'The input has no label connected to it, so it has no name.',
        fix: 'Add a <label> with a for attribute that matches the input id. Placeholder text is not a good replacement because it disappears as soon as someone types.',
        before: '<input type="email">',
        after: '<label for="email">Email</label>\n<input type="email" id="email">',
    },
    'html-has-lang': {
        title: 'The page does not say which language it is in',
        who: 'Screen readers pick the wrong voice and pronounce every word badly.',
        why: 'The <html> tag has no lang attribute.',
        fix: 'Add the language code to the <html> tag, for example lang="de" for German or lang="en" for English.',
        before: '<html>',
        after: '<html lang="de">',
    },
    'link-name': {
        title: 'Some links do not say where they go',
        who: 'Screen reader users hear just "link" with no idea where it leads. Voice control users have no word to say to click it.',
        why: 'The link has no text inside it, often because it only holds an icon, like a cart or a social media logo.',
        fix: 'Put a few words inside the link. If the design only shows an icon, add an aria-label to the link that says where it goes, and hide the icon itself from screen readers.',
        before: '<a href="/cart"><svg>...</svg></a>',
        after: '<a href="/cart" aria-label="Shopping cart"><svg aria-hidden="true">...</svg></a>',
    },
    'button-name': {
        title: 'Some buttons do not say what they do',
        who: 'Screen reader users hear just "button" and have to guess what pressing it will do. Voice control users cannot name it to press it.',
        why: 'The button has no text inside it, usually because it only shows an icon, like a magnifying glass, a heart or a close cross.',
        fix: 'Put a short word inside the button. If the design only shows an icon, add an aria-label that says what the button does, and hide the icon from screen readers.',
        before: '<button><svg>...</svg></button>',
        after: '<button aria-label="Add to wishlist"><svg aria-hidden="true">...</svg></button>',
    },
};

function explain(ruleId) {
    return (
        EXPLANATIONS[ruleId] || {
            title: ruleId,
            who: '',
            why: '',
            fix: '',
            before: '',
            after: '',
        }
    );
}

module.exports = { explain, EXPLANATIONS };
