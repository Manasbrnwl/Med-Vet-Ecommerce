// Stream a large mysqldump and report tables, approx row counts, and post-type breakdown.
const fs = require('fs');
const readline = require('readline');

const file = process.argv[2];
const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });

const tables = new Map();            // table -> { cols, rows }
const postTypes = new Map();         // post_type -> count
const orderStatuses = new Map();
let curCreate = null;
const KNOWN_TYPES = ['post','page','attachment','revision','nav_menu_item','custom_css','customize_changeset',
  'product','product_variation','shop_order','shop_order_refund','shop_coupon','shop_subscription',
  'wpcf7_contact_form','acf-field','acf-field-group','et_pb_layout','et_template','et_body_layout',
  'et_header_layout','et_footer_layout','scheduled-action','user_registration','oembed_cache','wp_global_styles'];

function countTuples(line) {
  // approx rows in an extended INSERT: number of "),(" separators + 1
  let n = 1, i = 0;
  while ((i = line.indexOf('),(', i)) !== -1) { n++; i += 2; }
  return n;
}

rl.on('line', (line) => {
  const create = line.match(/^CREATE TABLE `([^`]+)`/);
  if (create) { curCreate = create[1]; tables.set(curCreate, { cols: 0, rows: 0 }); return; }
  if (curCreate) {
    if (/^\s*`/.test(line)) tables.get(curCreate).cols++;
    if (/^\)\s*ENGINE|^\);/.test(line)) curCreate = null;
  }
  const ins = line.match(/^INSERT INTO `([^`]+)`/);
  if (ins) {
    const t = ins[1];
    if (!tables.has(t)) tables.set(t, { cols: 0, rows: 0 });
    tables.get(t).rows += countTuples(line);
    if (/(^|_)posts$/.test(t)) {
      for (const ty of KNOWN_TYPES) {
        const re = new RegExp(`,'${ty}',`, 'g');
        const m = line.match(re);
        if (m) postTypes.set(ty, (postTypes.get(ty) || 0) + m.length);
      }
    }
    if (/wc_orders`?$/.test(t) || /_wc_orders$/.test(t)) {
      for (const st of ['wc-completed','wc-processing','wc-on-hold','wc-pending','wc-cancelled','wc-refunded','wc-failed']) {
        const m = line.match(new RegExp(`'${st}'`, 'g'));
        if (m) orderStatuses.set(st, (orderStatuses.get(st) || 0) + m.length);
      }
    }
  }
});

rl.on('close', () => {
  const sorted = [...tables.entries()].sort((a, b) => b[1].rows - a[1].rows);
  let out = `# Database analysis: ${file}\n\nTables: ${tables.size}\n\n`;
  out += `## Tables by approx row count\n| table | cols | ~rows |\n|---|---|---|\n`;
  for (const [t, v] of sorted) out += `| ${t} | ${v.cols || ''} | ${v.rows.toLocaleString()} |\n`;
  out += `\n## wp_posts by post_type (approx)\n| post_type | count |\n|---|---|\n`;
  for (const [t, c] of [...postTypes.entries()].sort((a, b) => b[1] - a[1])) out += `| ${t} | ${c.toLocaleString()} |\n`;
  if (orderStatuses.size) {
    out += `\n## Order statuses (HPOS wc_orders, approx)\n| status | count |\n|---|---|\n`;
    for (const [s, c] of [...orderStatuses.entries()].sort((a, b) => b[1] - a[1])) out += `| ${s} | ${c} |\n`;
  }
  const hpos = [...tables.keys()].some((t) => /wc_orders$/.test(t));
  out += `\n## Notes\n- Order storage: ${hpos ? 'HPOS (wp_wc_orders table present)' : 'legacy (orders in wp_posts as shop_order)'}\n`;
  fs.writeFileSync(require('path').join(require('path').dirname(file), 'db-analysis.md'), out);
  process.stdout.write(out);
});
