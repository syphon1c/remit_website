#!/usr/bin/env node
// Builds src/data/coworkers.json from the coworker manifests: the built-ins that ship in
// release builds (runtime repo, `ships` not false) and the gallery Remit Cloud serves
// (cloud repo `personas/`). Connector labels come from the runtime's catalogue.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RUNTIME = path.resolve(ROOT, '../ai_openWork');
const CLOUD = path.resolve(ROOT, '../ai_enterprise');

const catalogue = JSON.parse(fs.readFileSync(path.join(RUNTIME, 'docs/connector-catalogue.json'), 'utf8'));
const connectorLabel = Object.fromEntries(catalogue.connectors.map((c) => [c.name, c.title]));
connectorLabel.browser ??= 'Browser'; connectorLabel.email ??= 'Email';

const TOOL_LABEL = { code_files: 'your code', files: 'your files', git: 'git', search: 'search', shell: 'the shell', todo: 'a task list' };

function frontMatter(file) {
	const s = fs.readFileSync(file, 'utf8');
	if (!s.startsWith('---')) return null;
	const fm = s.split('---')[1];
	const d = {};
	for (const line of fm.split('\n')) {
		const i = line.indexOf(':');
		if (i < 0 || /^\s/.test(line)) continue;
		d[line.slice(0, i).trim()] = line.slice(i + 1).trim();
	}
	return d;
}
const list = (v) => (v && v !== 'null' ? v.replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean) : []);
const humanSkill = (s) => s.replace(/-/g, ' ');
const unquote = (s) => (s || '').replace(/^"|"$/g, '');

function entry(d, source) {
	return {
		id: d.id, name: d.name, source, icon: d.icon || 'diamond', group: d.group || null,
		tagline: unquote(d.tagline), description: unquote(d.description),
		connectors: list(d.connectors).map((c) => connectorLabel[c] || c),
		tools: list(d.tools).map((t) => TOOL_LABEL[t] || t),
		skills: list(d.skills).map(humanSkill),
		mode: d.default_permission_mode || 'interactive',
	};
}

const out = [];
for (const dir of fs.readdirSync(path.join(RUNTIME, 'internal/personas/builtin'))) {
	const f = path.join(RUNTIME, 'internal/personas/builtin', dir, 'manifest.md');
	if (!fs.existsSync(f)) continue;
	const d = frontMatter(f);
	if (!d || d.ships === 'false') continue; // absent from release builds
	out.push(entry(d, 'built-in'));
}
for (const dir of fs.readdirSync(path.join(CLOUD, 'personas'))) {
	const f = path.join(CLOUD, 'personas', dir, 'manifest.md');
	if (!fs.existsSync(f)) continue;
	const d = frontMatter(f);
	if (d) out.push(entry(d, 'gallery'));
}
fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src/data/coworkers.json'), JSON.stringify(out, null, '\t') + '\n');
console.log(`${out.length} coworkers: ${out.map((c) => c.name).join(', ')}`);
