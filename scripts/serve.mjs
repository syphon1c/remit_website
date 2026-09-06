#!/usr/bin/env node
// Serves dist/ the way Cloudflare Pages will: clean URLs, and the headers from
// public/_headers applied. For trying the Content-Security-Policy against the real site
// (search runs in WebAssembly and is the thing a strict policy breaks first).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const PORT = Number(process.env.PORT || 4321);
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm', '.webp': 'image/webp' };

// The `/*` block of _headers, applied to everything; the path-specific blocks after it.
const blocks = [];
let cur = null;
for (const line of fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split('\n')) {
	if (!line.trim() || line.startsWith('#')) continue;
	if (!line.startsWith(' ')) { cur = { pattern: line.trim(), headers: [] }; blocks.push(cur); }
	else if (cur) { const i = line.indexOf(':'); cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
}
const matches = (pattern, p) => pattern.endsWith('/*') ? p.startsWith(pattern.slice(0, -1)) || p === pattern.slice(0, -2) : pattern === p;

http.createServer((req, res) => {
	let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	let file = path.join(DIST, p);
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
	if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
	if (!fs.existsSync(file)) { file = path.join(DIST, '404.html'); res.statusCode = 404; }
	for (const b of blocks) if (matches(b.pattern, p)) for (const [k, v] of b.headers) res.setHeader(k, v);
	res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
	fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`serving ${DIST} with _headers on http://localhost:${PORT}`));
