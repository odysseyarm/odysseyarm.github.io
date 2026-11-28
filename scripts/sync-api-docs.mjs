// Downloads public Rust rustdoc from trusted Odyssey workflows into public/api.
// Release assets are durable; master uses latest successful master workflow artifact.
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const REPO = 'odysseyarm/odyssey';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'public/api');
const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

async function json(url) {
	const response = await fetch(url, { headers });
	if (!response.ok) throw new Error(`GitHub API ${response.status} ${response.statusText}: ${url}`);
	return response.json();
}

async function download(url, file, accept = headers.Accept) {
	const response = await fetch(url, { headers: { ...headers, Accept: accept } });
	if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`);
	await pipeline(Readable.fromWeb(response.body), createWriteStream(file));
}

export function validateArchive(archive, version) {
	const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
	if (!entries.length || entries.some((entry) => entry.startsWith('/') || entry.split('/').includes('..') || !entry.startsWith(`api/${version}/`))) {
		throw new Error(`Unsafe or malformed rustdoc archive for ${version}`);
	}
	const types = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n');
	if (types.some((line) => !/^[\-d]/.test(line))) throw new Error(`Rustdoc archive contains non-regular files: ${version}`);
	if (!entries.includes(`api/${version}/index.html`)) throw new Error(`Rustdoc archive missing api/${version}/index.html`);
}

function extract(archive, destination, version) {
	validateArchive(archive, version);
	execFileSync('tar', ['-xzf', archive, '-C', destination, '--no-same-owner', '--no-same-permissions']);
}


async function fetchAsset(asset, version, destination) {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'odyssey-rustdoc-'));
	try {
		const archive = path.join(temp, 'rustdoc.tar.gz');
		await download(asset.url, archive, asset.accept ?? headers.Accept);
		extract(archive, destination, version);
		const index = await fs.stat(path.join(destination, `api/${version}/index.html`));
		if (!index.isFile() || index.size === 0) throw new Error(`Rustdoc archive missing api/${version}/index.html`);
	} finally {
		await fs.rm(temp, { recursive: true, force: true });
	}
}

async function downloadMaster(destination) {
	const runs = await json(`https://api.github.com/repos/${REPO}/actions/workflows/rustdoc.yml/runs?branch=master&status=success&per_page=100`);
	const run = runs.workflow_runs?.find((item) => item.head_branch === 'master' && item.head_repository?.full_name === REPO && ['push', 'schedule'].includes(item.event));
	if (!run) throw new Error('No successful trusted master rustdoc workflow run found');
	const artifacts = await json(`https://api.github.com/repos/${REPO}/actions/runs/${run.id}/artifacts`);
	const artifact = artifacts.artifacts?.find((item) => item.name === 'rustdoc-master' && !item.expired);
	if (!artifact) throw new Error(`Trusted workflow run ${run.id} has no available rustdoc-master artifact`);
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'odyssey-rustdoc-master-'));
	try {
		const zip = path.join(temp, 'artifact.zip');
		await download(`https://api.github.com/repos/${REPO}/actions/artifacts/${artifact.id}/zip`, zip, 'application/vnd.github+json');
		const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
		if (entries.length !== 1 || entries[0] !== 'rustdoc-master.tar.gz') throw new Error('rustdoc-master artifact must contain only rustdoc-master.tar.gz');
		const tarball = path.join(temp, entries[0]);
		const unpack = spawn('unzip', ['-p', zip, entries[0]], { stdio: ['ignore', 'pipe', 'inherit'] });
		const exited = new Promise((resolve, reject) => {
			unpack.once('error', reject);
			unpack.once('close', (code) => code === 0 ? resolve() : reject(new Error(`unzip exited ${code}`)));
		});
		await Promise.all([pipeline(unpack.stdout, createWriteStream(tarball)), exited]);
		extract(tarball, destination, 'master');
	} finally {
		await fs.rm(temp, { recursive: true, force: true });
	}
}

async function downloadRelease(version, destination) {
	const release = await json(`https://api.github.com/repos/${REPO}/releases/tags/odyssey-desktop-v${version}`);
	if (release.draft || release.prerelease || release.tag_name !== `odyssey-desktop-v${version}`) {
		throw new Error(`Rustdoc requested for non-stable/mismatched release ${version}`);
	}
	const asset = release.assets?.find((item) => item.name === `rustdoc-${version}.tar.gz`);
	if (!asset) throw new Error(`Release odyssey-desktop-v${version} lacks rustdoc-${version}.tar.gz`);
	await fetchAsset({ url: asset.url, accept: 'application/octet-stream' }, version, destination);
}

export async function syncApiDocs(output = apiDir) {
	const destination = await fs.mkdtemp(path.join(os.tmpdir(), 'odyssey-api-'));
try {
	await downloadMaster(destination);
	const releases = [];
	for (let page = 1; ; page++) {
		const batch = await json(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`);
		releases.push(...batch);
		if (batch.length < 100) break;
	}
	const stable = releases.filter((item) => !item.draft && !item.prerelease && /^odyssey-desktop-v\d+\.\d+\.\d+$/.test(item.tag_name));
	const documented = stable.filter((item) => item.assets?.some((asset) => asset.name === `rustdoc-${item.tag_name.slice('odyssey-desktop-v'.length)}.tar.gz`));
	const latestStable = [...stable].sort((a, b) => b.tag_name.localeCompare(a.tag_name, undefined, { numeric: true }))[0];
	if (!latestStable || !documented.includes(latestStable)) throw new Error(`Latest stable release ${latestStable?.tag_name ?? '(none)'} has no Rust API archive; bootstrap release asset before publishing`);
	for (const release of documented) await downloadRelease(release.tag_name.slice('odyssey-desktop-v'.length), destination);
	const versions = (await fs.readdir(path.join(destination, 'api'))).filter((entry) => entry !== 'master' && /^\d+\.\d+\.\d+$/.test(entry));
	if (!versions.length) throw new Error('No stable release Rust API docs found; refusing incomplete publish');
	// Website owns landing pages; keep generated crate pages and assets unchanged.
	for (const version of ['master', ...versions]) {
		await fs.unlink(path.join(destination, `api/${version}/index.html`));
	}
	await fs.rm(output, { recursive: true, force: true });
	await fs.cp(path.join(destination, 'api'), output, { recursive: true });
	console.log(`sync-api-docs: published master and ${versions.length} stable releases; older releases without assets omitted`);
} finally {
	await fs.rm(destination, { recursive: true, force: true });
}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	if (process.env.SYNC_API_DOCS === '1') await syncApiDocs();
	else console.log('sync-api-docs: skipped; set SYNC_API_DOCS=1 to fetch Rust API docs');
}
