# fixmysite

Paste in a web address and fixmysite tells you what makes the page hard to use for people with disabilities, and how to fix each problem with a before and after example.

Most accessibility tools report things like "WCAG 1.4.3 color-contrast". That means nothing to someone running a small online shop. Since June 2025 the European Accessibility Act requires online shops in the EU to be accessible, and the [WebAIM Million 2026](https://webaim.org/projects/million/) report found problems on 95.9% of the top million home pages. Shop owners need answers they can act on.

![Report for a page with four problems](docs/screenshot.png)

## What it checks

The first version covers the four problems that show up most often:

- text that is too faint to read against its background
- images with no description for screen readers
- form fields with no label
- pages that don't say which language they are in

The checks come from [axe-core](https://github.com/dequelabs/axe-core). The explanations are my own, in `src/explanations.js`.

Automated checks find some problems, not all of them. A page that passes here can still be hard to use.

## Run it locally

You need Node.js 18 or newer.

```bash
git clone https://github.com/HaruFromSpace/fixmysite
cd fixmysite
npm install
npx playwright install chromium
npm start
```

Open http://localhost:3000.

From the terminal:

```bash
npm run check -- yourshop.com
```

## How it works

The server opens the page in a headless Chromium with Playwright, injects axe-core, runs only the four rules above and maps each result to a plain-language explanation. It refuses addresses on private networks and localhost, and runs at most two checks at once (`MAX_RUNNING`).

`test/fixture.html` is a small page with all four problems, for trying changes.

## Deploying

Any host that can run Node and Chromium works. On Render, use `npm install && npx playwright install --with-deps chromium` as the build command and `npm start` as the start command.

## Next

- more rules, one at a time, each with its own explanation
- German translations of the report
- checking several pages of a site in one go
- a report you can download and send to whoever built the site

## License

MIT
