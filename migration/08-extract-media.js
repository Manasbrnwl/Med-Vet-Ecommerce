#!/usr/bin/env node
/**
 * 08-extract-media.js
 *
 * Extracts original product images from the .wpress archive into
 * api/public/wp-content/uploads/  (served as static files by Express).
 *
 * "Originals" = uploads/YYYY/MM/ entries that are NOT resized thumbnails
 * (i.e. the filename does NOT match -NxN. before the extension) and NOT
 * from wc-logs, cache, or backup sub-folders.
 *
 * Usage:
 *   node migration/08-extract-media.js [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'vedmedagri-net-20260625-030229-5snsflsl8n5v.wpress');
const OUT_DIR = path.join(ROOT, 'api', 'public', 'wp-content', 'uploads');
const DRY_RUN = process.argv.includes('--dry-run');

const HEADER = 4377;
const OFF    = { name: [0, 255], size: [255, 14], mtime: [269, 12], path: [281, 4096] };

// WP thumbnail pattern: filename ends with -NxN before extension
const THUMBNAIL_RE = /-\d+x\d+(\.[a-zA-Z0-9]+)$/;
// WP scaled variant
const SCALED_RE    = /-scaled(\.[a-zA-Z0-9]+)$/;
// Date-based uploads path: uploads/YYYY/MM/
const UPLOADS_RE   = /^uploads\/\d{4}\/\d{2}\//;
// Folders to skip
const SKIP_DIRS    = ['wc-logs', 'cache', 'backups', 'backup', 'wp-rollback', 'revslider'];

function field(buf, [start, len]) {
  const end = start + len;
  let z = buf.indexOf(0, start);
  if (z === -1 || z > end) z = end;
  return buf.toString('utf8', start, z).trim();
}

function isOriginal(full) {
  if (!UPLOADS_RE.test(full)) return false;
  const name = path.basename(full);
  if (THUMBNAIL_RE.test(name)) return false;
  if (SCALED_RE.test(name))    return false;
  const parts = full.split('/');
  if (SKIP_DIRS.some((d) => parts.includes(d))) return false;
  return true;
}

function human(n) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 2 : 0)} ${u[i]}`;
}

function run() {
  if (!fs.existsSync(ARCHIVE)) {
    console.error(`Archive not found: ${ARCHIVE}`);
    process.exit(1);
  }

  const fd       = fs.openSync(ARCHIVE, 'r');
  const fileSize = fs.fstatSync(fd).size;
  const header   = Buffer.alloc(HEADER);
  const CHUNK    = 4 * 1024 * 1024;
  const buf      = Buffer.alloc(CHUNK);

  let extracted = 0, skipped = 0, totalBytes = 0;
  let pos = 0;

  console.log(`Archive : ${path.basename(ARCHIVE)}`);
  console.log(`Output  : ${OUT_DIR}`);
  console.log(`Mode    : ${DRY_RUN ? 'DRY RUN (no files written)' : 'EXTRACT'}\n`);

  while (pos + HEADER <= fileSize) {
    fs.readSync(fd, header, 0, HEADER, pos);

    let emptyName = true;
    for (let i = 0; i < 255; i++) if (header[i] !== 0) { emptyName = false; break; }
    if (emptyName) break;

    const name     = field(header, OFF.name);
    const size     = parseInt(field(header, OFF.size), 10) || 0;
    const relPath  = field(header, OFF.path);
    const dataStart = pos + HEADER;

    const rel  = relPath === '.' ? '' : relPath.replace(/\\/g, '/');
    const full = rel ? `${rel}/${name}` : name;

    if (isOriginal(full)) {
      if (!DRY_RUN) {
        const dest = path.join(OUT_DIR, full.replace(/^uploads\//, ''));
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const out = fs.openSync(dest, 'w');
        let remaining = size, src = dataStart;
        while (remaining > 0) {
          const n = Math.min(CHUNK, remaining);
          fs.readSync(fd, buf, 0, n, src);
          fs.writeSync(out, buf, 0, n);
          remaining -= n; src += n;
        }
        fs.closeSync(out);
      }
      extracted++;
      totalBytes += size;
      if (extracted % 100 === 0) {
        process.stdout.write(`\r  ${DRY_RUN ? '[dry]' : ''} extracted ${extracted} originals (${human(totalBytes)})...`);
      }
    } else {
      skipped++;
    }

    pos = dataStart + size;
  }

  fs.closeSync(fd);
  console.log(`\n\nDone.`);
  console.log(`  Originals ${DRY_RUN ? 'found' : 'extracted'} : ${extracted} files (${human(totalBytes)})`);
  console.log(`  Thumbnails/other skipped     : ${skipped} files`);
  if (!DRY_RUN) {
    console.log(`\nFiles written to: ${OUT_DIR}`);
    console.log(`Express will serve them at: /wp-content/uploads/YYYY/MM/filename.ext`);
  }
}

run();
