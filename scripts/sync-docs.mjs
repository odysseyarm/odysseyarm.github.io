#!/usr/bin/env node
// Copies the developer docs from odysseyarm/odyssey into this site.
//
//   odyssey docs/sdk/  →  src/content/docs/developers/  →  odysseyarm.com/developers/
//
// Only the directories in PUBLISH are copied: odyssey's docs/contributing/
// stays on GitHub.
//
// Where the docs come from, first match wins:
//   1. ODYSSEY_DOCS_DIR=/path/to/odyssey/docs
//   2. ../odyssey/docs, when the odyssey repo is checked out next to this one
//   3. a shallow clone of github.com/odysseyarm/odyssey at ODYSSEY_REF, or at
//      master when ODYSSEY_REF is unset or names a branch odyssey does not have.
//      CI sets ODYSSEY_REF to the site branch being built, so a site branch and
//      an odyssey branch with the same name preview their docs together.
//
// The pages are GitHub-flavored Markdown that must also read well on GitHub
// (odyssey's docs/README.md lists the conventions). Each one becomes an MDX
// page here:
//   - "# Title" becomes the page title; <!-- order: N -->, <!-- sidebar-label: … -->
//     and <!-- description: … --> become front matter
//   - GitHub alerts (> [!NOTE] …) become Starlight asides
//   - <!-- tabs: key --> … <!-- /tabs --> becomes synced tabs, split at **Label** lines
//   - <!-- cards --> lists become link cards, <!-- steps --> lists become steps
//   - ![alt](./images/x.svg "caption") lines become inline, themable SVG figures
//   - links to other published pages become site URLs; anything else in the
//     odyssey repo becomes a GitHub link
//
// It fails when no pages were found, so the site is never published with
// empty developer docs; set ALLOW_EMPTY_DOCS=1 to build anyway.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'odysseyarm/odyssey';
const DEFAULT_REF = 'master';
let REF = process.env.ODYSSEY_REF || DEFAULT_REF;

/** odyssey docs/<key> is published at /<value>/ */
const PUBLISH = { sdk: 'developers' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'src/content/docs');

async function findSource() {
	if (process.env.ODYSSEY_DOCS_DIR) return path.resolve(process.env.ODYSSEY_DOCS_DIR);
	const sibling = path.resolve(root, '../odyssey/docs');
	if (existsSync(sibling)) return sibling;

	const cache = path.join(root, 'node_modules/.cache/odyssey');
	await rm(cache, { recursive: true, force: true });
	await mkdir(path.dirname(cache), { recursive: true });
	const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
	if (REF !== DEFAULT_REF) {
		const found = execFileSync('git', ['ls-remote', '--heads', `https://github.com/${REPO}.git`, REF], {
			encoding: 'utf8',
		}).trim();
		if (!found) {
			console.log(`sync-docs: ${REPO} has no branch "${REF}"; using ${DEFAULT_REF}`);
			REF = DEFAULT_REF;
		}
	}
	git('clone', '--depth=1', '--filter=blob:none', '--sparse', '--branch', REF,
		`https://github.com/${REPO}.git`, cache);
	git('-C', cache, 'sparse-checkout', 'set', 'docs');
	return path.join(cache, 'docs');
}

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

// ------------------------------------------------------------------ links

/** Site URL for a docs-relative .md path, or undefined if it isn't published. */
function siteUrl(docsPath) {
	const [section, ...rest] = docsPath.split('/');
	const base = PUBLISH[section];
	if (!base) return undefined;
	const slug = rest.join('/').replace(/\.md$/, '').replace(/(^|\/)(index|README)$/i, '').toLowerCase();
	return `/${base}/${slug}${slug ? '/' : ''}`;
}

function githubUrl(repoPath, hash = '') {
	return `https://github.com/${REPO}/blob/${REF}/${repoPath}${hash}`;
}

/** Rewrites a link target found in docs/<fileRel>. */
function rewriteTarget(target, fileRel) {
	if (/^([a-z]+:|#|\/)/i.test(target)) return target;
	const [file, hash] = target.split('#');
	const anchor = hash ? `#${hash}` : '';
	const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(fileRel), file));
	if (resolved.startsWith('../')) {
		return githubUrl(path.posix.normalize(path.posix.join('docs', resolved)), anchor);
	}
	if (resolved.endsWith('.md')) return (siteUrl(resolved) ?? githubUrl(`docs/${resolved}`)) + anchor;
	return target;
}

// ------------------------------------------------------------- MDX output

// [Starlight aside type, title, icon]. Starlight has no "important" type, so
// IMPORTANT is a note with its own icon; docs.css colors it by its label.
const ALERTS = {
	NOTE: ['note', 'Note'],
	TIP: ['tip', 'Tip'],
	IMPORTANT: ['note', 'Important', 'comment'],
	WARNING: ['caution', 'Warning'],
	CAUTION: ['danger', 'Caution'],
};

const TAB_ICONS = {
	'C#': 'seti:c-sharp',
	Python: 'seti:python',
	'C++': 'seti:cpp',
	'C and C++': 'seti:c',
	C: 'seti:c',
	Rust: 'seti:rust',
	Godot: 'seti:godot',
};

const jsx = (value) => `{${JSON.stringify(value)}}`;

/** Escapes text so MDX reads it as Markdown, outside `code spans`. */
function escapeProse(line) {
	return line
		.split(/(`+[^`]*`+)/)
		.map((part, i) => (i % 2 ? part : part.replace(/[{}]/g, '\\$&').replace(/</g, '&lt;')))
		.join('');
}

function rewriteLinks(line, fileRel) {
	return line.replace(/\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (_, target, title) =>
		`](${rewriteTarget(target, fileRel)}${title})`);
}

class Page {
	constructor(fileRel) {
		this.fileRel = fileRel;
		this.components = new Set();
		this.imports = [];
		this.diagrams = 0;
	}

	use(name) {
		this.components.add(name);
	}

	/** Converts a list of body lines (front matter and title already removed). */
	convert(lines) {
		const out = [];
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];

			// Fenced code: copied verbatim.
			const fence = line.match(/^(\s*)(`{3,}|~{3,})/);
			if (fence) {
				const close = new RegExp(`^\\s*${fence[2][0]}{${fence[2].length},}\\s*$`);
				out.push(line);
				i++;
				while (i < lines.length && !close.test(lines[i])) out.push(lines[i++]);
				if (i < lines.length) out.push(lines[i++]);
				continue;
			}

			const block = line.match(/^<!--\s*(tabs|cards|steps)(?::\s*([\w-]+))?\s*-->\s*$/);
			if (block) {
				const end = new RegExp(`^<!--\\s*/${block[1]}\\s*-->\\s*$`);
				const inner = [];
				i++;
				while (i < lines.length && !end.test(lines[i])) inner.push(lines[i++]);
				if (i >= lines.length) throw new Error(`docs/${this.fileRel}: <!-- ${block[1]} --> is never closed`);
				i++;
				out.push(...this[block[1]](inner, block[2]));
				continue;
			}

			// Any other HTML comment line is dropped.
			if (/^\s*<!--.*-->\s*$/.test(line)) {
				i++;
				continue;
			}

			const alert = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/);
			if (alert) {
				const inner = [];
				i++;
				while (i < lines.length && /^>/.test(lines[i])) inner.push(lines[i++].replace(/^>\s?/, ''));
				const [type, title, icon] = ALERTS[alert[1]];
				this.use('Aside');
				out.push(`<Aside type="${type}" title="${title}"${icon ? ` icon="${icon}"` : ''}>`, '', ...this.convert(inner), '', '</Aside>');
				continue;
			}

			const image = line.match(/^!\[([^\]]*)\]\((\S+?\.svg)(?:\s+"([^"]*)")?\)\s*$/);
			if (image && !/^[a-z]+:/i.test(image[2])) {
				const name = `Diagram${this.diagrams++}`;
				this.imports.push(`import ${name} from ${JSON.stringify(image[2])};`);
				out.push(`<figure class="oa-figure">`);
				out.push(`<div class="oa-diagram"><${name} aria-label=${jsx(image[1])} /></div>`);
				if (image[3]) out.push(`<figcaption>${jsx(image[3])}</figcaption>`);
				out.push(`</figure>`);
				i++;
				continue;
			}

			if (/^\s*(import|export)\s/.test(line)) {
				throw new Error(`docs/${this.fileRel}: a line may not start with "import" or "export" (MDX reads it as code)`);
			}
			out.push(escapeProse(rewriteLinks(line, this.fileRel)));
			i++;
		}
		return out;
	}

	tabs(lines, key) {
		const tabs = [];
		let inFence = false;
		for (const line of lines) {
			if (/^\s*(`{3,}|~{3,})/.test(line)) inFence = !inFence;
			const label = !inFence && line.match(/^\*\*(.+)\*\*\s*$/);
			if (label) tabs.push({ label: label[1], lines: [] });
			else if (tabs.length) tabs.at(-1).lines.push(line);
		}
		if (!tabs.length) throw new Error(`docs/${this.fileRel}: tabs need **Label** lines`);
		this.use('Tabs');
		this.use('TabItem');
		const out = [key ? `<Tabs syncKey="${key}">` : '<Tabs>'];
		for (const tab of tabs) {
			const icon = TAB_ICONS[tab.label];
			out.push(`<TabItem label=${jsx(tab.label)}${icon ? ` icon="${icon}"` : ''}>`, '');
			out.push(...this.convert(tab.lines), '', '</TabItem>');
		}
		out.push('</Tabs>');
		return out;
	}

	cards(lines) {
		this.use('CardGrid');
		this.use('LinkCard');
		const out = ['<CardGrid>'];
		for (const line of lines) {
			if (!line.trim()) continue;
			const m = line.match(/^[-*]\s+\[([^\]]+)\]\(([^)\s]+)\)(?::\s*(.*))?$/);
			if (!m) throw new Error(`docs/${this.fileRel}: card lines look like "- [Title](./page.md): description"`);
			const description = m[3] ? ` description=${jsx(m[3])}` : '';
			out.push(`<LinkCard title=${jsx(m[1])} href=${jsx(rewriteTarget(m[2], this.fileRel))}${description} />`);
		}
		out.push('</CardGrid>');
		return out;
	}

	steps(lines) {
		this.use('Steps');
		return ['<Steps>', '', ...this.convert(lines), '', '</Steps>'];
	}
}

function toMdx(source, fileRel) {
	let frontMatter = '';
	let body = source;
	const fm = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (fm) {
		frontMatter = fm[1];
		body = source.slice(fm[0].length);
	}

	const meta = {};
	body = body.replace(/^<!--\s*(order|sidebar-label|description):\s*(.*?)\s*-->\s*\n/gm, (_, key, value) => {
		meta[key] = value;
		return '';
	});

	const extra = [];
	if (!/^title:/m.test(frontMatter)) {
		const h1 = body.match(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m);
		if (!h1) throw new Error(`docs/${fileRel}: add a "# Title" heading or a title in front matter`);
		extra.push(`title: ${JSON.stringify(h1[1])}`);
		body = body.replace(h1[0], '');
	}
	if (meta.description && !/^description:/m.test(frontMatter)) {
		extra.push(`description: ${JSON.stringify(meta.description)}`);
	}
	if ((meta.order || meta['sidebar-label']) && !/^sidebar:/m.test(frontMatter)) {
		extra.push('sidebar:');
		if (meta.order) extra.push(`  order: ${Number(meta.order)}`);
		if (meta['sidebar-label']) extra.push(`  label: ${JSON.stringify(meta['sidebar-label'])}`);
	}
	if (!/^editUrl:/m.test(frontMatter)) {
		extra.push(`editUrl: https://github.com/${REPO}/edit/${REF}/docs/${fileRel}`);
	}

	const page = new Page(fileRel);
	const converted = page.convert(body.replace(/^\s*\n/, '').split('\n'));
	const imports = [...page.imports];
	if (page.components.size) {
		imports.unshift(`import { ${[...page.components].sort().join(', ')} } from '@astrojs/starlight/components';`);
	}
	const fmOut = [frontMatter, ...extra].filter(Boolean).join('\n');
	return `---\n${fmOut}\n---\n\n${imports.length ? imports.join('\n') + '\n\n' : ''}${converted.join('\n').trim()}\n`;
}

// ------------------------------------------------------------------ main

const source = await findSource();
let count = 0;
for (const [section, base] of Object.entries(PUBLISH)) {
	const from = path.join(source, section);
	const to = path.join(contentDir, base);
	console.log(`sync-docs: ${from} → src/content/docs/${base}/`);
	await rm(to, { recursive: true, force: true });
	if (!existsSync(from)) continue;
	for await (const file of walk(from)) {
		const rel = path.relative(source, file).split(path.sep).join('/');
		const inSection = path.relative(from, file).split(path.sep).join('/');
		if (path.basename(rel).toLowerCase() === 'readme.md') continue;
		if (rel.endsWith('.md')) {
			const dest = path.join(to, inSection.replace(/\.md$/, '.mdx'));
			await mkdir(path.dirname(dest), { recursive: true });
			await writeFile(dest, toMdx(await readFile(file, 'utf8'), rel));
			count++;
		} else if (/\.(svg|png|jpe?g|gif|webp|avif)$/i.test(rel)) {
			const dest = path.join(to, inSection);
			await mkdir(path.dirname(dest), { recursive: true });
			await cp(file, dest); // diagrams and other images the pages use
		}
	}
}
console.log(`sync-docs: ${count} pages`);
if (count === 0 && !process.env.ALLOW_EMPTY_DOCS) {
	console.error(
		`sync-docs: no pages found in ${source}/{${Object.keys(PUBLISH).join(',')}}. ` +
			'The developer docs would be missing from the site. Set ALLOW_EMPTY_DOCS=1 to build anyway.',
	);
	process.exit(1);
}
