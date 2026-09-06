#!/usr/bin/env node
// Every same-site href and src in dist must resolve to a file, and every #fragment on a
// same-site link must be an id on the target page. Run after `astro build`.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const pages = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.html')) pages.push(p); } })(DIST);

const ids = new Map();
const idOf = (file) => {
	if (!ids.has(file)) {
		const html = fs.readFileSync(file, 'utf8');
		ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
	}
	return ids.get(file);
};
const resolve = (p) => {
	const clean = decodeURIComponent(p.split('?')[0]);
	const candidates = [path.join(DIST, clean), path.join(DIST, clean, 'index.html'), path.join(DIST, clean + '.html')];
	return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
};

let bad = 0;
for (const page of pages) {
	const html = fs.readFileSync(page, 'utf8');
	for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
		const raw = m[1];
		if (!raw.startsWith('/') || raw.startsWith('//')) continue;
		const [p, frag] = raw.split('#');
		const target = p === '' ? page : resolve(p);
		if (!target) { console.log(`${path.relative(DIST, page)} → ${raw}: missing`); bad++; continue; }
		if (frag && target.endsWith('.html') && !idOf(target).has(frag)) { console.log(`${path.relative(DIST, page)} → ${raw}: no such anchor`); bad++; }
	}
}
console.log(bad ? `${bad} broken link(s)` : `all links in ${pages.length} pages resolve`);
process.exit(bad ? 1 : 0);
