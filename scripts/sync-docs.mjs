#!/usr/bin/env node
// Copies the developer docs from odysseyarm/odyssey (its docs/ directory) into
// src/content/docs/docs/, where Starlight publishes them under /docs/.
//
// Where the docs come from, first match wins:
//   1. ODYSSEY_DOCS_DIR=/path/to/odyssey/docs
//   2. ../odyssey/docs, when the odyssey repo is checked out next to this one
//   3. a shallow clone of github.com/odysseyarm/odyssey at ODYSSEY_REF, or at
//      master when ODYSSEY_REF is unset or names a branch odyssey does not have.
//      CI sets ODYSSEY_REF to the site branch being built, so a site branch and
//      an odyssey branch with the same name preview their docs together.
//
// It fails when no pages were found, so the site is never published with
// empty SDK docs; set ALLOW_EMPTY_DOCS=1 to build anyway.
//
// Pages there are plain Markdown that must also read well on GitHub, so this
// script turns them into Starlight pages:
//   - the first "# Heading" becomes the page title (unless front matter sets one)
//   - links to other .md files in docs/ become site URLs
//   - links to files outside docs/ become GitHub URLs
//   - "Edit page" points at the file in the odyssey repo
//   - README.md files are skipped
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'odysseyarm/odyssey';
const DEFAULT_REF = 'master';
let REF = process.env.ODYSSEY_REF || DEFAULT_REF;
const SECTIONS = ['sdk', 'contributing'];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/content/docs/docs');

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

/** "sdk/index.md" → "/docs/sdk/", "sdk/coordinate-systems.md" → "/docs/sdk/coordinate-systems/" */
function siteUrl(relPath) {
	const noExt = relPath.replace(/\.md$/, '');
	const slug = noExt.replace(/(^|\/)index$/, '').toLowerCase();
	return `/docs/${slug}${slug ? '/' : ''}`;
}

function rewriteLinks(body, fileRel) {
	const fileDir = path.posix.dirname(fileRel);
	let inFence = false;
	return body
		.split('\n')
		.map((line) => {
			if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
			if (inFence) return line;
			return line.replace(/\]\(([^)\s]+)\)/g, (match, target) => {
				if (/^([a-z]+:|#|\/)/i.test(target)) return match;
				const [file, hash] = target.split('#');
				const resolved = path.posix.normalize(path.posix.join(fileDir, file));
				const anchor = hash ? `#${hash}` : '';
				if (resolved.startsWith('../')) {
					// Outside docs/: link to the file on GitHub.
					const repoPath = path.posix.normalize(path.posix.join('docs', resolved));
					return `](https://github.com/${REPO}/blob/${REF}/${repoPath}${anchor})`;
				}
				if (resolved.endsWith('.md')) return `](${siteUrl(resolved)}${anchor})`;
				return match;
			});
		})
		.join('\n');
}

function toStarlight(source, fileRel) {
	let frontMatter = '';
	let body = source;
	const fm = source.match(/^---\n([\s\S]*?)\n---\n?/);
	if (fm) {
		frontMatter = fm[1];
		body = source.slice(fm[0].length);
	}
	const extra = [];
	if (!/^title:/m.test(frontMatter)) {
		const h1 = body.match(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m);
		if (!h1) throw new Error(`docs/${fileRel}: add a "# Title" heading or a title in front matter`);
		extra.push(`title: ${JSON.stringify(h1[1])}`);
		body = body.replace(h1[0], '').replace(/^\s*\n/, '');
	}
	if (!/^editUrl:/m.test(frontMatter)) {
		extra.push(`editUrl: https://github.com/${REPO}/edit/${REF}/docs/${fileRel}`);
	}
	const fmOut = [frontMatter, ...extra].filter(Boolean).join('\n');
	return `---\n${fmOut}\n---\n\n${rewriteLinks(body, fileRel)}`;
}

const source = await findSource();
console.log(`sync-docs: copying ${source} → src/content/docs/docs/{${SECTIONS.join(',')}}`);

let count = 0;
for (const section of SECTIONS) {
	const from = path.join(source, section);
	const to = path.join(outDir, section);
	await rm(to, { recursive: true, force: true });
	if (!existsSync(from)) continue;
	for await (const file of walk(from)) {
		const rel = path.relative(source, file).split(path.sep).join('/');
		const dest = path.join(outDir, rel);
		await mkdir(path.dirname(dest), { recursive: true });
		if (!rel.endsWith('.md')) {
			await cp(file, dest); // images and other files referenced by the pages
		} else if (path.basename(rel).toLowerCase() !== 'readme.md') {
			await writeFile(dest, toStarlight(await readFile(file, 'utf8'), rel));
			count++;
		}
	}
}
console.log(`sync-docs: ${count} pages`);
if (count === 0 && !process.env.ALLOW_EMPTY_DOCS) {
	console.error(
		`sync-docs: no pages found in ${source}/{${SECTIONS.join(',')}}. ` +
			'The SDK docs would be missing from the site. Set ALLOW_EMPTY_DOCS=1 to build anyway.',
	);
	process.exit(1);
}
