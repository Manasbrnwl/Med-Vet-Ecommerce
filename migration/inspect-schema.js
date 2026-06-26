// Targeted scan of database.sql to inform schema design:
//  - distinct taxonomies + counts (term_taxonomy)
//  - product attribute taxonomies (woocommerce_attribute_taxonomies)
//  - top postmeta meta_keys by frequency
//  - distinct order statuses (post_status for shop_order)
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const file = process.argv[2];
const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });

const taxonomies = new Map();
const metaKeys = new Map();
const attrRows = [];
let cur = null;

rl.on('line', (line) => {
  const ins = line.match(/^INSERT INTO `([^`]+)`/);
  if (ins) cur = ins[1]; else if (!/^\(/.test(line)) cur = null;

  if (/term_taxonomy`?$/.test(cur || '')) {
    // tuples: (tt_id, term_id, 'taxonomy', 'description', parent, count)
    const re = /\(\d+,\d+,'([^']*)'/g; let m;
    while ((m = re.exec(line))) taxonomies.set(m[1], (taxonomies.get(m[1]) || 0) + 1);
  }
  if (/woocommerce_attribute_taxonomies`?$/.test(cur || '')) {
    const re = /\((\d+),'([^']*)','([^']*)','([^']*)','([^']*)',(\d+)\)/g; let m;
    while ((m = re.exec(line))) attrRows.push(`id=${m[1]} name=${m[2]} label="${m[3]}" type=${m[4]} orderby=${m[5]}`);
  }
  if (/(^|_)postmeta`?$/.test(cur || '')) {
    // tuples: (meta_id, post_id, 'meta_key', 'meta_value')
    const re = /\(\d+,\d+,'((?:[^'\\]|\\.)*)'/g; let m;
    while ((m = re.exec(line))) metaKeys.set(m[1], (metaKeys.get(m[1]) || 0) + 1);
  }
});

rl.on('close', () => {
  let out = `# Schema inspection: ${path.basename(file)}\n\n`;
  out += `## Taxonomies (term_taxonomy)\n| taxonomy | terms |\n|---|---|\n`;
  for (const [t, c] of [...taxonomies.entries()].sort((a, b) => b[1] - a[1])) out += `| ${t} | ${c} |\n`;
  out += `\n## Product attribute taxonomies\n`;
  out += attrRows.length ? attrRows.map((r) => `- ${r}`).join('\n') + '\n' : '_none_\n';
  out += `\n## Top 70 postmeta meta_keys (by row count)\n| meta_key | count |\n|---|---|\n`;
  for (const [k, c] of [...metaKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 70)) out += `| ${k} | ${c.toLocaleString()} |\n`;
  fs.writeFileSync(path.join(path.dirname(file), 'schema-inspection.md'), out);
  console.log(out);
});
