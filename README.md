# Raysons Shell Cast

The Shell Moulded Castings site for Raysons Group — a scroll-driven site covering the
foundry, its processes, its product range and enquiries.

Everything that ships lives in **`raysons-scrollyteller/`**. It is plain static
HTML, CSS and JavaScript: no framework, no bundler, no build step of its own. Open
any of its pages directly in a browser and it works.

## The pages

| File | Page |
|---|---|
| `index.html` | Overview — the scroll-scrubbed film |
| `About Us.html` | About — history, leadership, ISO 9001 certificate |
| `foundry.html` | Foundry — processes, capability, OEMs |
| `products.html` | Products — the casting catalogue |
| `enquire.html` | Enquiry form |

## Running it locally

Any static file server will do — the pages need to be served over HTTP rather than
opened from disk, because they fetch models and video.

```bash
npm run dev          # serves the repo at http://localhost:5173
```

Then open `http://localhost:5173/raysons-scrollyteller/`.

## How it deploys

`vercel.json` declares the build explicitly: `node build-site.mjs` copies
`raysons-scrollyteller/` into `dist/`, which is what gets served. There is nothing to
compile. The redirects in the same file send the retired first-generation URLs
(`/about.html`, `/technology.html`, …) to their replacements.

### Moving it to another host

`npm run package -- <base-url>` writes a `deploy/` folder containing only the files the
five pages actually reach — about 24 MB rather than the whole directory — and rewrites
the `canonical` and `og:` tags to the base URL you pass:

```bash
npm run package -- https://www.raysonsgroup.com/shell-cast
```

Upload the **contents** of `deploy/` to that path. Every reference in the site is
relative, so it runs from any subfolder without changes.

## Things worth knowing before you change anything

**It is a single-page application.** `spa.js` intercepts internal links, fetches the
next page, swaps its `<body>` and re-runs its scripts, so navigation never reloads. Two
consequences: page-specific CSS must be in the page's own `<head>` (the router
reconciles it on every hop), and any script that starts a render loop has to tear the
previous one down — see `window.__fobjDispose` in `foundry-object.js`.

**Paths are relative on purpose.** Nothing is root-absolute, which is what lets the site
sit in a subfolder. Please keep it that way.

**Grids use `minmax(0,1fr)`, not `1fr`.** A bare `1fr` has an automatic minimum equal to
the content's intrinsic width, which Safari honours and Chrome does not — it made the
page scroll sideways on iPhone while looking correct on desktop.

**Test on Safari, not just Chrome.** Every iOS browser is WebKit underneath, and several
bugs here were visible only there: Safari will not draw a `<video>` to a canvas unless
that video is in the document, and it has no `requestVideoFrameCallback`.

## The enquiry form

`enquire.html` posts to [Web3Forms](https://web3forms.com), which emails each submission
on. The destination is set by `ACCESS_KEY` near the bottom of that file — change the key
to change the inbox. If the request fails for any reason the form falls back to opening
the visitor's mail client with the enquiry filled in, and tells them to press send, so an
enquiry is never silently lost.

## Layout

```
raysons-scrollyteller/   the site
build-site.mjs           deploy build (copies the above into dist/)
build-deploy.mjs         makes a minimal upload folder for another host
vercel.json              build settings + legacy redirects
MOTION.md                motion and timing notes
SCROLLYTELLING.md        how the scroll engines work
```
