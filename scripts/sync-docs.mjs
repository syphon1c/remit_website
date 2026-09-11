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
	['runtime', 'docs/api.md', 'developers/api', 'The local API'],
	['cloud', 'docs/README.md', 'cloud/overview', 'Remit Cloud'],
	['cloud', 'docs/organisations.md', 'cloud/organisations'],
	['cloud', 'docs/console.md', 'cloud/console'],
	['cloud', 'docs/policy.md', 'cloud/policy'],
	['cloud', 'docs/evidence.md', 'cloud/evidence'],
	['cloud', 'docs/threat-model.md', 'cloud/threat-model'],
	['cloud', 'docs/gallery-curating.md', 'cloud/gallery-curating', 'Curating the gallery'],
	['broker', 'README.md', 'self-hosting/broker', 'The broker'],
	['broker', 'USER_GUIDE.md', 'self-hosting/broker-curating', 'Curating a broker gallery'],
	['broker', 'docs/auth.md', 'self-hosting/broker-auth', 'Broker authentication'],
	['broker', 'docs/sharing.md', 'self-hosting/broker-sharing', 'Broker: sharing coworkers'],
];

const bySource = new Map(MAP.map(([repo, src, slug]) => [`${repo}:${src}`, slug]));

// Per-page rewrites for the public manual, when a page needs one.
const TRANSFORM = {
	// The cloud overview: the three ways to run Remit and the pieces an administrator meets.
	// Its map of operator pages (deployment, operations, billing, key custody) stays internal.
	'cloud:docs/README.md': (md) => {
		const cut = md.indexOf('## Where to start');
		const head = cut > 0 ? md.slice(0, cut) : md;
		return head.trimEnd() + `

## In this section

- [Organisations](organisations.md) — registration, roles, invitations, and what is separated between organisations.
- [The console](console.md) — the six screens, and the rule that none of them can lower a protection.
- [Policy](policy.md) — the controls, what "tighter" means for each, issuing and break-glass.
- [What the server holds](evidence.md) — and what it never does.
- [Threat model](threat-model.md) — five attackers, what each can and cannot do.
- [Curating the gallery](gallery-curating.md) — writing a coworker, publishing it, and the review it goes through.
`;
	},
	// Organisations: an administrator's page. The deployment's shape (single- or multi-tenant
	// configuration) and the operator's command-line tools stay internal.
	'cloud:docs/organisations.md': (md) => md
		.replace(/^## Two shapes, one binary[\s\S]*?(?=^## Registering)/m, '')
		.replace(/Administering the deployment is what it always was:[\s\S]*?an attacker could find\.\n\n/, ''),
	// The threat model: one internal cross-reference becomes plain words.
	'cloud:docs/threat-model.md': (md) => md.replace(/the custody decision\s*\(todo\.md decision 6\) that blocks release/, 'the custody decision made before release'),
	// The console: an administrator's page; the deployment switch that mounts it is operator material.
	'cloud:docs/console.md': (md) => md.replace(/^## Turning it on[\s\S]*?(?=^## )/m, ''),
	// The broker's README ends in a development section — make targets, the package
	// layout, the dependency argument. Written for whoever builds it; the manual is read
	// by whoever runs it, and Remit is closed source, so a source map is a disclosure and
	// an instruction nobody reading this can follow.
	'broker:README.md': (md) => md
		.replace(/^## Development[\s\S]*$/m, '')
		// And its quick start begins by building it. A reader of this manual has the binary.
		.replace(/```sh\nmake build\n\.\/bin\/remit-broker/, '```sh\n./remit-broker')
		.replace(/  \.\/bin\/remit-broker/g, '  ./remit-broker'),
	// Broker auth: the shape of the interface is how a contributor adds a mode. A reader
	// choosing between the two that ship needs the modes, not the seam.
	'broker:docs/auth.md': (md) => md.replace(
		/The auth layer is an interface \(`internal\/auth\.Authenticator`: `Mode`,\n`Authenticate`, `Routes`\)\. Two implementations ship; a third — mTLS, a static\nshared token, an internal SSO shim — is a new file, not a refactor\./,
		'Two authentication modes ship. A third — mTLS, a static shared token, an internal\nSSO shim — is an addition rather than a rewrite: the rest of the server does not\nknow which mode it is running under.'),
	// Outside content: the page is for someone deciding whether the floor suits how they
	// work, and it ends in three ways to back it out by reverting named commits, plus two
	// "one-line changes" in a named source file. All of that assumes the repository. What
	// a reader can actually act on — the allowlist, the standing rule, and the fact that
	// there is no off switch — stays; the rest becomes the honest sentence.
	'runtime:docs/outside-content.md': (md) => md
		.replace(/### The automated coverage\n\n```bash\n[\s\S]*?```\n\n/, '')
		.replace(/### 2\. Keep the record, drop the enforcement\n[\s\S]*?(?=^## If you want it stricter)/m,
			'### 2. Anything further is a build, not a setting\n\n' +
			'There is no configuration switch, and that is deliberate — a floor that can be\n' +
			'turned off from inside a conversation is not a floor. Recording and enforcement\n' +
			'can be separated, and the floor can be removed altogether, but each is a change to\n' +
			'the product rather than a preference, made on purpose and released like any other:\n' +
			'the same bar as the rules it protects. If your deployment needs one, ask us.\n\n')
		.replace(/^## If you want it stricter\n\n[\s\S]*$/m,
			'## If you want it stricter\n\n' +
			'Two extensions were scoped out and are small changes we can make: covering local\n' +
			'writes and commands as well as off-machine actions, and declining to exempt even a\n' +
			'standing rule. Both are deliberately loud — the first asks whenever a session\n' +
			'consults a page and then edits a file, the second makes every automation ask — which\n' +
			'is why neither is the default. Each is guarded by tests that say what the condition\n' +
			'is for, so changing one tells you exactly what you are giving up.\n'),
	// How updates work: the reader's half. The sections on running the release pipeline,
	// deploying the server and its credentials are operator material and stay internal.
	'runtime:docs/how-updates-work.md': (md) => {
		const keep = new Set(['The short version', 'The pieces', 'On the desktop', 'Which channel answers', 'Not yet', 'What happens if…']);
		const parts = md.split(/^(?=## )/m);
		const out = parts.filter((p, i) => i === 0 || keep.has(p.match(/^## (.*)$/m)?.[1]?.trim() ?? ''));
		return out.join('') + '\nThe release pipeline itself — building, signing, publishing and deploying — is documented for the people who run it, not here.\n';
	},
};

// Scattered references to the source, in pages that are otherwise a reader's. Remit is
// closed source: a package path names an internal structure and points at a file nobody
// outside can open, so each sentence is rewritten to say the same thing in words. Whole
// sections written for people with the source are cut in TRANSFORM above; anything either
// misses is caught by the guard at the bottom of this file, which refuses to write it.
const REDACTIONS = [
	// The runtime's API page: the authoritative list is the table on the page itself.
	[/For\s*\nthe authoritative list:\n\n```bash\ngrep[\s\S]*?```\n\n/, ''],
	[/The event vocabulary lives in `internal\/events`, and\nevent names/, 'Event names'],
	[/ \(`internal\/server\/docs_test\.go`\)/, ''],
	// The Cloud's pages.
	[/\n\nThe full specification, with the reasoning, is `\.claude\/tasks\/specs\/policy\.md`\. This page\nis the working reference\./, ''],
	[/comes from\n`internal\/policy`: the `Title`/, 'comes from the server\'s own definition of the key: the title'],
	[/the `Describe` that says what the rule is,\nand the `Effect` that says/, 'the description that says what the rule is,\nand the effect that says'],
	[/`docs\/key-custody\.md` is the decision, per key:\nthe updater key cannot be loaded by a server at all — `internal\/signer` refuses it by name,/,
		'Custody is decided per key: the updater key cannot be loaded by a server at all — it is refused by name,'],
	// The runtime's security model.
	[/one primitive \(`internal\/hashchain`\), the same canonical form/, 'one primitive, the same canonical form'],
	// Outside content: why a denial is phrased the way it is, without naming where it lives.
	[/— see\n`PersonDenyMessage` in internal\/engine\/messages\.go\./, '— so the refusal now\nsays plainly that a person declined it, and that retrying is not the answer.'],
	// Two ways to back the floor out become one paragraph above, so the count goes with them.
	[/strictly better than the two below because it keeps the/, 'strictly better than what follows because it keeps the'],
];

function redact(md) {
	for (const [pattern, replacement] of REDACTIONS) md = md.replace(pattern, replacement);
	return md;
}

// What must never reach a public page. Each pattern is something that only makes sense to
// somebody holding the repository — a package path, a source or test file, a build or test
// command, a commit to revert, an internal planning artefact. The sync fails rather than
// publishes: a leak that lands is a leak that is already indexed.
const FORBIDDEN = [
	[/(?:^|[^\w/])(?:internal|cmd)\/[a-z]/, 'a package path'],
	[/\.claude\/tasks/, 'an internal planning artefact'],
	// A path'd or test source file. Deliberately NOT every `*.go`: the guide quotes a bad
	// prompt — "Open auth.go, then grep for validate" — about the reader's own project,
	// and a guard that cannot tell their file from ours would push that sentence out of
	// the manual for nothing.
	[/[\w/]+\/[\w]+\.go\b|[\w]+_test\.go\b/, 'a source or test file'],
	[/\bgo (?:test|build|run|vet) /, 'a Go toolchain command'],
	[/\bgit revert\b/, 'an instruction to revert a commit'],
	[/^make (?:build|test|race|lint|check|ui|tidy|run)\b/m, 'a build target'],
];

function assertNoInternals(slug, md) {
	for (const [pattern, what] of FORBIDDEN) {
		const hit = md.match(pattern);
		if (hit) {
			const line = md.slice(0, hit.index).split('\n').length;
			throw new Error(
				`${slug}: line ${line} carries ${what} — ${JSON.stringify(hit[0].trim())}.\n` +
				'The manual is public and the repositories are not. Rewrite the sentence in the\n' +
				'source document, or cut the section for the public copy in TRANSFORM / REDACTIONS.');
		}
	}
}

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
	// After the links: a reference to a repository file arrives here as a markdown link
	// and leaves rewriteLinks as its bare text, which is the form these patterns match.
	body = redact(body);
	body = escapePlaceholders(body);
	// Last thing before it is written: nothing internal leaves this script.
	assertNoInternals(slug, body);
	const fm = ['---', `title: ${yaml(title)}`, description ? `description: ${yaml(description)}` : null, '---'].filter(Boolean).join('\n');
	// The provenance line. It used to say the text is the same one the people building Remit
	// read — true until the manual started leaving out what only they can act on.
	const prov = `<p class="rm-synced">Part of the ${REPOS[repo].label} documentation. Generated from the product's own docs; material written for the people building Remit is left out.</p>`;
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
