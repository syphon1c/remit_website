#!/usr/bin/env node
// Pulls the manual's pages from the three product repositories, which are expected to be
// checked out beside this one. The source of truth stays next to the code; this script
// adds Starlight front matter, a provenance line, rewrites links between mapped pages to
// site links and links to other repository files to GitHub, and escapes <placeholder>
// tokens outside code so Markdown does not swallow them as HTML. Output is committed, so
// the site builds without the sibling repositories.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/content/docs/docs');
const REPOS = {
	runtime: { dir: path.resolve(ROOT, '../ai_openWork'), gh: 'syphon1c/ai_remit', label: 'Remit Coworker' },
	cloud: { dir: path.resolve(ROOT, '../ai_enterprise'), gh: 'syphon1c/remitai-enterprise', label: 'Remit Cloud' },
	broker: { dir: path.resolve(ROOT, '../ai_remit_broker'), gh: 'syphon1c/ai_remit_broker', label: 'remit-broker' },
};

// repo, source path, site slug under /docs/, optional title override.
const MAP = [
	['runtime', 'docs/getting-started.md', 'coworker/getting-started'],
	['runtime', 'docs/server.md', 'coworker/server', 'Running the server directly'],
	['runtime', 'docs/using-remit.md', 'coworker/using-remit'],
	['runtime', 'docs/configuration.md', 'coworker/configuration'],
	['runtime', 'docs/security.md', 'coworker/security'],
	['runtime', 'docs/outside-content.md', 'coworker/outside-content', 'Outside content'],
	['runtime', 'docs/connectors-slack.md', 'coworker/connectors/slack', 'Connectors: Slack'],
	['runtime', 'docs/how-updates-work.md', 'coworker/updates'],
	['runtime', 'docs/architecture.md', 'developers/architecture'],
	['runtime', 'docs/api.md', 'developers/api', 'Runtime API'],
	['cloud', 'docs/README.md', 'cloud/overview', 'Remit Cloud'],
	['cloud', 'docs/organisations.md', 'cloud/organisations'],
	['cloud', 'docs/console.md', 'cloud/console'],
	['cloud', 'docs/policy.md', 'cloud/policy'],
	['cloud', 'docs/evidence.md', 'cloud/evidence'],
	['cloud', 'docs/threat-model.md', 'cloud/threat-model'],
	['cloud', 'docs/gallery-curating.md', 'cloud/gallery-curating', 'Curating the gallery'],
	['cloud', 'docs/sharing.md', 'cloud/sharing'],
	['cloud', 'docs/gallery-deployment.md', 'cloud/gallery', 'The gallery'],
	['cloud', 'docs/auth.md', 'cloud/auth'],
	['cloud', 'docs/billing.md', 'cloud/billing'],
	['cloud', 'docs/deployment.md', 'self-hosting/cloud-deployment'],
	['cloud', 'docs/operations.md', 'self-hosting/cloud-operations', 'Operating Remit Cloud'],
	['cloud', 'docs/key-custody.md', 'self-hosting/key-custody'],
	['cloud', 'docs/api.md', 'developers/cloud-api', 'Remit Cloud API'],
	['broker', 'README.md', 'self-hosting/broker', 'The broker'],
	['broker', 'USER_GUIDE.md', 'self-hosting/broker-curating', 'Curating a broker gallery'],
	['broker', 'docs/auth.md', 'self-hosting/broker-auth', 'Broker authentication'],
	['broker', 'docs/sharing.md', 'self-hosting/broker-sharing', 'Broker: sharing coworkers'],
	['broker', 'docs/api.md', 'developers/broker-api', 'Broker API'],
];

const bySource = new Map(MAP.map(([repo, src, slug]) => [`${repo}:${src}`, slug]));

// Per-page rewrites for the public manual, when a page needs one. None today: the guides
// are written for the desktop app at the source.
const TRANSFORM = {};

const HTML_TAGS = new Set(('a abbr article aside b blockquote br button code dd details div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i iframe img input kbd label li main mark nav ol p path picture pre section small source span strong sub summary sup svg table tbody td th thead tr ul video').split(' '));

function escapePlaceholders(md) {
	// Split on fenced code blocks, then on inline code, and only touch plain text.
	return md.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g).map((chunk, i) => {
		if (i % 2 === 1) return chunk;
		return chunk.split(/(`[^`\n]*`)/g).map((seg, j) => {
			if (j % 2 === 1) return seg;
			return seg.replace(/<([a-z][a-z0-9-]*)>/g, (m, tag) => HTML_TAGS.has(tag) ? m : `&lt;${tag}&gt;`);
		}).join('');
	}).join('');
}

function rewriteLinks(md, repo, srcPath) {
	const srcDir = path.posix.dirname(srcPath);
	// Links to files that are not part of the manual (other repository files, internal
	// specs) are dropped and their text kept: the repositories are not public.
	md = md.replace(/(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, text, target) => {
		if (/^(https?:|mailto:|#|\/)/.test(target)) return m;
		const [file] = target.split('#');
		const resolved = path.posix.normalize(path.posix.join(srcDir, file));
		return bySource.has(`${repo}:${resolved}`) ? m : text;
	});
	md = md.replace(/\[([^\]]*)\]\(https?:\/\/github\.com\/syphon1c\/[^)]*\)/g, '$1');
	// Bare mentions of the private repositories become the product's name.
	for (const r of Object.values(REPOS)) md = md.replace(new RegExp(`(?:https?:\\/\\/)?github\\.com\\/${r.gh.replace('/', '\\/')}[\\w\\-\\/.#]*`, 'g'), r.label);
	return md.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, target, title) => {
		if (/^(https?:|mailto:|#|\/)/.test(target)) return m;
		const [file, anchor] = target.split('#');
		const resolved = path.posix.normalize(path.posix.join(srcDir, file));
		const slug = bySource.get(`${repo}:${resolved}`);
		const hash = anchor ? `#${anchor}` : '';
		if (slug) return `](/docs/${slug}/${hash}${title ?? ''})`;
		return m;
	});
}

function plain(s) {
	return s.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim();
}

function firstParagraph(lines) {
	const out = [];
	for (const l of lines) {
		if (out.length === 0 && (l.trim() === '' || l.startsWith('#') || l.startsWith('|') || l.startsWith('```') || l.startsWith('---'))) continue;
		if (l.trim() === '') break;
		if (l.startsWith('#') || l.startsWith('|') || l.startsWith('```')) break;
		out.push(l);
	}
	let d = plain(out.join(' '));
	if (d.length > 155) d = d.slice(0, 152).replace(/\s+\S*$/, '') + '…';
	return d;
}

function yaml(s) { return JSON.stringify(s); }

// Remove only what this script generates (.md); the hand-written landing pages are .mdx.
(function clean(d) {
	if (!fs.existsSync(d)) return;
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const q = path.join(d, e.name);
		if (e.isDirectory()) clean(q);
		else if (q.endsWith('.md')) fs.unlinkSync(q);
	}
})(OUT);
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [repo, src, slug, titleOverride] of MAP) {
	const abs = path.join(REPOS[repo].dir, src);
	if (!fs.existsSync(abs)) { console.error(`missing: ${abs}`); process.exitCode = 1; continue; }
	let md = fs.readFileSync(abs, 'utf8');
	const lines = md.split('\n');
	const h1 = lines.findIndex((l) => /^# /.test(l));
	const title = titleOverride ?? (h1 >= 0 ? plain(lines[h1].slice(2)) : slug);
	const bodyLines = h1 >= 0 ? lines.slice(h1 + 1) : lines;
	const description = firstParagraph(bodyLines);
	let body = bodyLines.join('\n').replace(/^\s+/, '');
	if (TRANSFORM[`${repo}:${src}`]) body = TRANSFORM[`${repo}:${src}`](body);
	body = body.replace(/\]\(images\//g, '](/docs/images/');
	body = rewriteLinks(body, repo, src);
	body = escapePlaceholders(body);
	const fm = ['---', `title: ${yaml(title)}`, description ? `description: ${yaml(description)}` : null, '---'].filter(Boolean).join('\n');
	const prov = `<p class="rm-synced">Part of the ${REPOS[repo].label} documentation. Generated from the product's own docs; the text is the same one the people building Remit read.</p>`;
	const outPath = path.join(OUT, `${slug}.md`);
	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, `${fm}\n\n${prov}\n\n${body}`);
	n++;
}
// The captures the pages refer to, and the same files as WebP for the marketing pages.
const IMG_SRC = path.join(REPOS.runtime.dir, 'docs/images');
const IMG_PUB = path.join(ROOT, 'public/docs/images');
const IMG_APP = path.join(ROOT, 'src/assets/app');
fs.rmSync(IMG_PUB, { recursive: true, force: true });
fs.mkdirSync(IMG_PUB, { recursive: true });
fs.mkdirSync(IMG_APP, { recursive: true });
let imgs = 0;
if (fs.existsSync(IMG_SRC)) {
	const sharp = (await import('sharp')).default;
	for (const f of fs.readdirSync(IMG_SRC).filter((f) => f.endsWith('.png'))) {
		fs.copyFileSync(path.join(IMG_SRC, f), path.join(IMG_PUB, f));
		await sharp(path.join(IMG_SRC, f)).webp({ quality: 90 }).toFile(path.join(IMG_APP, f.replace(/\.png$/, '.webp')));
		imgs++;
	}
}
console.log(`synced ${n} pages into src/content/docs/docs, ${imgs} captures into public/docs/images and src/assets/app`);
