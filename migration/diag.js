const fs = require('fs');
const HEADER = 4377;
const OFF = { name: [0, 255], size: [255, 14], mtime: [269, 12], path: [281, 4096] };
function field(buf, [s, l]) { let z = buf.indexOf(0, s); if (z === -1 || z > s + l) z = s + l; return buf.toString('utf8', s, z); }
const f = process.argv[2];
const fd = fs.openSync(f, 'r');
const fileSize = fs.fstatSync(fd).size;
const h = Buffer.alloc(HEADER);
let pos = 0, n = 0;
while (pos + HEADER <= fileSize) {
  fs.readSync(fd, h, 0, HEADER, pos);
  if (h.every((b) => b === 0)) { console.log(`EOF marker at ${pos}`); break; }
  const name = field(h, OFF.name);
  const sizeRaw = field(h, OFF.size);
  const size = parseInt(sizeRaw, 10) || 0;
  n++;
  if (size > 500 * 1024 * 1024 || name.trim() === '') {
    console.log(`\n#${n} @offset ${pos}`);
    console.log(`  name=[${name}]`);
    console.log(`  sizeRaw=[${sizeRaw}] -> ${size} (${(size/1073741824).toFixed(2)} GB)`);
    console.log(`  path=[${field(h, OFF.path).slice(0,80)}]`);
    console.log(`  header hex[0..64]: ${h.slice(0,64).toString('hex')}`);
    console.log(`  header hex[255..295] (size+mtime): ${h.slice(255,295).toString('hex')}`);
  }
  pos += HEADER + size;
}
console.log(`\nScanned ${n} entries. fileSize=${fileSize} finalPos=${pos}`);
fs.closeSync(fd);
