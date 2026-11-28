import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { syncApiDocs, validateArchive } from './sync-api-docs.mjs';

test('imports trusted archives without replacing website landing pages', async () => {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'api-docs-test-'));
	const originalFetch = globalThis.fetch;
	try {
		const archives = new Map();
		for (const version of ['master', '0.9.0', '0.10.0']) {
			const dir = path.join(temp, 'api', version);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(path.join(dir, 'index.html'), `<h1>${version}</h1>`);
			await fs.mkdir(path.join(dir, 'odyssey_protocol'));
			await fs.writeFile(path.join(dir, 'odyssey_protocol/index.html'), `<h1>Protocol ${version}</h1>`);
			const archive = path.join(temp, `rustdoc-${version}.tar.gz`);
			execFileSync('tar', ['-czf', archive, '-C', temp, `api/${version}`]);
			validateArchive(archive, version);
			archives.set(version, await fs.readFile(archive));
		}
		execFileSync('zip', ['-q', 'master.zip', 'rustdoc-master.tar.gz'], { cwd: temp });
		const releases = ['0.9.0', '0.10.0'].map((version) => ({
			tag_name: `odyssey-desktop-v${version}`, draft: false, prerelease: false,
			assets: [{ name: `rustdoc-${version}.tar.gz`, url: `https://assets.test/${version}` }],
		}));
		releases.push(
			{ tag_name: 'odyssey-desktop-v9.0.0', draft: true, prerelease: false, assets: [] },
			{ tag_name: 'odyssey-desktop-v8.0.0', draft: false, prerelease: true, assets: [] },
		);
		globalThis.fetch = async (url) => {
			const value = String(url);
			if (value.includes('/workflows/rustdoc.yml/runs?')) return Response.json({ workflow_runs: [
				{ id: 999, head_branch: 'master', head_repository: { full_name: 'attacker/fork' }, event: 'push' },
				{ id: 1, head_branch: 'master', head_repository: { full_name: 'odysseyarm/odyssey' }, event: 'push' },
			] });
			if (value.endsWith('/runs/1/artifacts')) return Response.json({ artifacts: [{ id: 2, name: 'rustdoc-master', expired: false }] });
			if (value.endsWith('/artifacts/2/zip')) return new Response(await fs.readFile(path.join(temp, 'master.zip')));
			if (value.includes('/releases?')) return Response.json(releases);
			if (value.includes('/releases/tags/')) return Response.json(releases.find((release) => value.endsWith(release.tag_name)));
			if (value.startsWith('https://assets.test/')) return new Response(archives.get(value.split('/').at(-1)));
			throw new Error(`Unexpected URL: ${value}`);
		};
		const output = path.join(temp, 'output');
		await syncApiDocs(output);
		for (const version of ['master', '0.9.0', '0.10.0']) {
			await assert.rejects(fs.access(path.join(output, version, 'index.html')), { code: 'ENOENT' });
			assert.equal(await fs.readFile(path.join(output, version, 'odyssey_protocol/index.html'), 'utf8'), `<h1>Protocol ${version}</h1>`);
		}
		await assert.rejects(fs.access(path.join(output, 'latest/index.html')), { code: 'ENOENT' });
		const missing = path.join(temp, 'missing.tar.gz');
		execFileSync('tar', ['-czf', missing, '-C', temp, 'api/0.9.0']);
		assert.throws(() => validateArchive(missing, 'master'), /Unsafe or malformed/);
		await fs.symlink('/etc/passwd', path.join(temp, 'api/master/escape'));
		const linked = path.join(temp, 'linked.tar.gz');
		execFileSync('tar', ['-czf', linked, '-C', temp, 'api/master']);
		assert.throws(() => validateArchive(linked, 'master'), /non-regular/);
	} finally {
		globalThis.fetch = originalFetch;
		await fs.rm(temp, { recursive: true, force: true });
	}
});
