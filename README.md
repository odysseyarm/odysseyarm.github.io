# odysseyarm.com

The Odyssey website: the front page, news, downloads, product guides and the
developer documentation. It is built with [Astro](https://astro.build), the docs
under `/docs` use [Starlight](https://starlight.astro.build), and content is
edited in [Keystatic](https://keystatic.com).

## Editing the site (no code needed)

Go to **https://odysseyarm.com/keystatic** and log in with Keystatic Cloud.
(Ask a developer to invite you to the `odysseyarm/website` project.)

| To change… | Open |
|---|---|
| The strip across the top of every page | **Announcement banner**. Tick *Show the banner* to turn it on. |
| The front page | **Front page**. Sections can be added, removed and dragged into a new order. |
| The text on the downloads page | **Downloads page**. The download buttons themselves update automatically when a new Odyssey Desktop release is published. |
| The menu, contact details, footer | **Site settings** |
| News | **Blog posts**. Tick *Draft* to save a post without publishing it. |
| How-to guides for customers | **Product guides**. They appear under *Using Odyssey* in the docs. |

Pressing **Save** on the `main` branch publishes: the live site updates in
about two minutes.

**To try a change before it goes live**, work on a branch:

1. In the branch menu at the top left of Keystatic, create a new branch. Name it
   with lowercase letters, numbers and dashes only, such as `spring-banner`.
2. Edit and press **Save**. Saves go to your branch, not the live site.
3. About two minutes after saving, press **Preview** (top right of the page you
   are editing) to see the site as saved on your branch. Save again and refresh
   the preview to see further changes.
4. When it looks right, open a pull request from the branch (Keystatic links to
   GitHub for this) and merge it. That publishes the change.

Preview shows what was last *saved*, not unsaved edits.

The SDK and contributor docs (`/docs/sdk`, `/docs/contributing`) are not edited
here; see below.

## Where things live

| Path | What |
|---|---|
| `keystatic.config.ts` | Every field editors see in Keystatic |
| `src/content/site/*.yaml` | Banner, front page, downloads page and site settings (written by Keystatic) |
| `src/content/blog/` | News posts (written by Keystatic) |
| `src/content/docs/docs/` | Pages under `/docs`. `guides/` is written by Keystatic; `index.mdx` is the docs home |
| `src/content/docs/docs/{sdk,contributing}/` | **Generated.** Copied from [`odysseyarm/odyssey`](https://github.com/odysseyarm/odyssey/tree/master/docs) `docs/` by `scripts/sync-docs.mjs`; edit them there |
| `src/assets/uploads/`, `src/assets/blog/` | Pictures uploaded in Keystatic |
| `src/pages/` | Front page, news, downloads, and the Keystatic editor page |
| `src/components/home/` | One component per front page section type in Keystatic |
| `src/components/`, `src/layouts/` | Header, footer, banner and page layout |
| `src/styles/tokens.css` | Brand colors, shared with the docs |
| `src/styles/site.css` | Type, buttons, spacing and the scroll reveal animation |
| `src/lib/releases.ts` | Reads the Odyssey Desktop downloads from GitHub releases |
| `public/_redirects` | Redirects, including old URLs from the previous site |

## Design notes

The look follows the advisors' Gamma mock-up (charcoal and orange, two-tone
headings, the same section order) with a calmer, Apple-like finish: a
translucent sticky header, larger tighter headings, more space between
sections and rounded images. Fonts are Inter, self-hosted.

Anything with a `data-reveal` attribute fades in and rises 20px when it
scrolls into view (1s, `cubic-bezier(0.22, 1, 0.36, 1)`, the mock-up's timing);
blocks that appear together start 90ms apart. The script is at the bottom of
`src/layouts/Base.astro`. Visitors who ask for reduced motion see no animation.

Styling is plain CSS: shared variables in `tokens.css`, everything else scoped
to the component that uses it.

## Developing

Requires Node 22.23.4 or newer (`.nvmrc`).

```sh
npm install
npm run dev
```

`npm run dev` copies the developer docs in first. It uses `../odyssey/docs` when
the odyssey repository is checked out next to this one, otherwise it clones it;
set `ODYSSEY_DOCS_DIR` to point somewhere else, or `ODYSSEY_REF` to clone a
branch other than `master`. Run `npm run sync-docs` again after editing them.

While `npm run dev` runs, http://127.0.0.1:4321/keystatic edits the files on
disk directly, without logging in.

| Command | |
|---|---|
| `npm run build` | Build the site into `dist/` |
| `npm run check` | Type-check |
| `npm run preview` | Build, then serve `dist/` the way Cloudflare does (redirects included) |

## Hosting

The site is static files served by Cloudflare (`wrangler.jsonc`).
`.github/workflows/site.yml` builds every push and pull request and:

- deploys the default branch to production,
- uploads every other branch pushed here (including Keystatic branches) as a
  preview at its own `workers.dev` URL, shown in the run summary and commented
  on the branch's open pull request,
- rebuilds when `odysseyarm/odyssey` changes its docs or publishes a release
  (its `docs-site.yml` workflow sends the event), and once a day as a fallback.

### One-time setup

1. **Cloudflare**: create an API token with the *Edit Cloudflare Workers*
   template and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
   secrets on this repository. The first deploy creates the `odysseyarm-site`
   Worker. Then add `odysseyarm.com` to it under *Settings → Domains & Routes*
   and stop serving the site from GitHub Pages.
2. **odysseyarm/odyssey**: add a `SITE_DISPATCH_TOKEN` secret there, a
   fine-grained token with *Contents: read and write* on this repository, so
   docs changes and releases trigger a rebuild.
3. **Keystatic Cloud** (project `odysseyarm/website`): add
   `https://odysseyarm.com` as the primary URL, plus the preview domain
   (`*.workers.dev` URL of the Worker) if editors should use previews.
