#!/usr/bin/env node
/**
 * wpress-tool.js — index & extract All-in-One WP Migration .wpress archives.
 *
 * .wpress format: repeating 4377-byte header + raw file content, ending with
 * an all-zero header.
 *   header: [0..255) name | [255..269) size | [269..281) mtime | [281..4377) path
 *
 * Usage:
 *   node wpress-tool.js list    <archive.wpress>                 # inventory only (fast, seeks past data)
 *   node wpress-tool.js extract <archive.wpress> <outDir> [filter]
 *        filter = comma-separated path prefixes to include (e.g. "database.sql,wp-content/themes")
 *        omit filter to extract everything.
 */
const fs = require('fs');
const path = require('path');

const HEADER = 4377;
const OFF = { name: [0, 255], size: [255, 14], mtime: [269, 12], path: [281, 4096] };

function field(buf, [start, len]) {
  const end = start + len;
  let z = buf.indexOf(0, start);          // fields are NUL-terminated within their fixed width
  if (z === -1 || z > end) z = end;
  return buf.toString('utf8', start, z).trim();
}

function* entries(fd, fileSize, { seekData }) {
  const header = Buffer.alloc(HEADER);
  let pos = 0;
  while (pos + HEADER <= fileSize) {
    fs.readSync(fd, header, 0, HEADER, pos);
    // EOF: the terminator block has an empty (all-zero) name field. (Its other
    // fields may contain garbage, so we can't rely on the whole block being zero.)
    let emptyName = true;
    for (let i = 0; i < 255; i++) if (header[i] !== 0) { emptyName = false; break; }
    if (emptyName) return;
    const name = field(header, OFF.name);
    const size = parseInt(field(header, OFF.size), 10) || 0;
    const relPath = field(header, OFF.path);
    const dataStart = pos + HEADER;
    yield { name, size, relPath, dataStart };
    pos = dataStart + size; // seek past content
    if (seekData === false) {
      // (reserved) — we always seek; content read happens in extract via stream
    }
  }
}

function human(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`;
}

function list(archive) {
  const fd = fs.openSync(archive, 'r');
  const fileSize = fs.fstatSync(fd).size;
  let count = 0, total = 0;
  const topDirs = new Map();   // top-level path segment -> {files, bytes}
  const bigFiles = [];
  const manifest = [];
  for (const e of entries(fd, fileSize, { seekData: false })) {
    count++; total += e.size;
    const rel = e.relPath === '.' ? '' : e.relPath.replace(/\\/g, '/');
    const full = rel ? `${rel}/${e.name}` : e.name;
    const top = rel ? rel.split('/')[0] : '(root)';
    const agg = topDirs.get(top) || { files: 0, bytes: 0 };
    agg.files++; agg.bytes += e.size; topDirs.set(top, agg);
    bigFiles.push({ full, size: e.size });
    manifest.push(`${e.size}\t${full}`);
  }
  fs.closeSync(fd);

  fs.writeFileSync(path.join(path.dirname(archive), 'wpress-manifest.tsv'),
    'size_bytes\tpath\n' + manifest.join('\n') + '\n');

  console.log(`\nArchive: ${path.basename(archive)}`);
  console.log(`Entries: ${count.toLocaleString()}   Total content: ${human(total)}\n`);
  console.log('Top-level breakdown:');
  [...topDirs.entries()].sort((a, b) => b[1].bytes - a[1].bytes).forEach(([k, v]) =>
    console.log(`  ${human(v.bytes).padStart(10)}  ${v.files.toString().padStart(7)} files  ${k}`));
  console.log('\nLargest 15 files:');
  bigFiles.sort((a, b) => b.size - a.size).slice(0, 15).forEach((f) =>
    console.log(`  ${human(f.size).padStart(10)}  ${f.full}`));
  console.log('\nFull manifest written to wpress-manifest.tsv');
}

function extract(archive, outDir, filter) {
  const prefixes = filter ? filter.split(',').map((s) => s.trim()).filter(Boolean) : null;
  const fd = fs.openSync(archive, 'r');
  const fileSize = fs.fstatSync(fd).size;
  let extracted = 0, bytes = 0, skipped = 0;
  const CHUNK = 4 * 1024 * 1024;
  const buf = Buffer.alloc(CHUNK);

  for (const e of entries(fd, fileSize, { seekData: false })) {
    const rel = e.relPath === '.' ? '' : e.relPath.replace(/\\/g, '/');
    const full = rel ? `${rel}/${e.name}` : e.name;
    if (prefixes && !prefixes.some((p) => full === p || full.startsWith(p))) { skipped++; continue; }

    const dest = path.join(outDir, full);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const out = fs.openSync(dest, 'w');
    let remaining = e.size, src = e.dataStart;
    while (remaining > 0) {
      const n = Math.min(CHUNK, remaining);
      fs.readSync(fd, buf, 0, n, src);
      fs.writeSync(out, buf, 0, n);
      remaining -= n; src += n;
    }
    fs.closeSync(out);
    extracted++; bytes += e.size;
    if (extracted % 500 === 0) process.stdout.write(`\r  extracted ${extracted} files (${human(bytes)})...`);
  }
  fs.closeSync(fd);
  console.log(`\nDone. Extracted ${extracted} files (${human(bytes)}) to ${outDir}. Skipped ${skipped} by filter.`);
}

const [cmd, archive, a3, a4] = process.argv.slice(2);
if (cmd === 'list' && archive) list(archive);
else if (cmd === 'extract' && archive && a3) extract(archive, a3, a4);
else {
  console.log('Usage:\n  node wpress-tool.js list <archive.wpress>\n  node wpress-tool.js extract <archive.wpress> <outDir> [comma,separated,prefixes]');
  process.exit(1);
}
