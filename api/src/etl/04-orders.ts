/** ETL step 4: orders, line items, invoices (legacy shop_order in wp_posts) */
import { prisma } from "../db.js";
import { rows, fetchMeta } from "./db-src.js";
import { dec, tryUnserialize } from "./php-unserialize.js";
import { STATUS_MAP } from "./config.js";

const BATCH = 500;

export async function migrateOrders(): Promise<void> {
  console.log("  [4] orders...");

  const total = (await rows<{ n: number }>(
    `SELECT COUNT(*) AS n FROM wp_posts WHERE post_type='shop_order'`
  ))[0].n;

  let offset = 0;
  let count = 0;

  while (offset < total) {
    const posts = await rows<{ ID: number; post_date: string; post_status: string; post_parent: number }>(
      `SELECT ID, post_date, post_status, post_parent FROM wp_posts
       WHERE post_type='shop_order' ORDER BY ID LIMIT ? OFFSET ?`, [BATCH, offset]
    );
    if (!posts.length) break;

    const ids = posts.map((p) => p.ID);
    const meta = await fetchMeta(ids);

    for (const p of posts) {
      const m = meta.get(p.ID) ?? {};
      const userId = m._customer_user ? parseInt(m._customer_user) : null;
      const user = userId ? await prisma.user.findFirst({ where: { wpId: userId }, select: { id: true } }) : null;

      const billing = {
        firstName: m._billing_first_name, lastName: m._billing_last_name,
        company: m._billing_company, address1: m._billing_address_1,
        address2: m._billing_address_2, city: m._billing_city,
        postcode: m._billing_postcode, country: m._billing_country,
        email: m._billing_email, phone: m._billing_phone,
      };
      const shipping = {
        firstName: m._shipping_first_name, lastName: m._shipping_last_name,
        company: m._shipping_company, address1: m._shipping_address_1,
        address2: m._shipping_address_2, city: m._shipping_city,
        postcode: m._shipping_postcode, country: m._shipping_country,
      };
      const attribution: Record<string, string> | undefined = m._wc_order_attribution_source_type ? {
        sourceType: m._wc_order_attribution_source_type,
        utmSource: m._wc_order_attribution_utm_source ?? "",
        sessionEntry: m._wc_order_attribution_session_entry ?? "",
        deviceType: m._wc_order_attribution_device_type ?? "",
      } : undefined;

      const order = await prisma.order.upsert({
        where: { wpId: p.ID },
        update: {},
        create: {
          wpId: p.ID,
          orderKey: m._order_key || null,
          status: (STATUS_MAP[p.post_status] ?? "PENDING") as never,
          currency: m._order_currency ?? "SGD",
          subtotal: dec(m._order_subtotal ?? m._order_total),
          discountTotal: dec(m._cart_discount),
          shippingTotal: dec(m._order_shipping),
          taxTotal: dec(m._order_tax),
          total: dec(m._order_total),
          pricesIncludeTax: m._prices_include_tax === "yes",
          userId: user?.id ?? null,
          customerEmail: m._billing_email || null,
          paymentMethod: m._payment_method || null,
          paymentMethodTitle: m._payment_method_title || null,
          datePaid: m._date_paid ? new Date(parseInt(m._date_paid) * 1000) : null,
          dateCompleted: m._date_completed ? new Date(parseInt(m._date_completed) * 1000) : null,
          billing, shipping, attribution,
          createdVia: m._created_via || null,
          ipAddress: m._customer_ip_address || null,
          createdAt: new Date(p.post_date),
        },
      });

      // Invoice
      if (m._wcpdf_invoice_number) {
        await prisma.invoice.upsert({
          where: { orderId: order.id },
          update: {},
          create: {
            orderId: order.id,
            number: m._wcpdf_invoice_number,
            formattedDate: m._wcpdf_invoice_date_formatted || null,
            issuedAt: m._wcpdf_invoice_date ? new Date(parseInt(m._wcpdf_invoice_date) * 1000) : null,
          },
        });
      }

      count++;
    }
    offset += BATCH;
    process.stdout.write(`\r    orders: ${count}/${total}`);
  }

  console.log(`\n    importing order line items...`);
  await migrateOrderItems();
}

async function migrateOrderItems(): Promise<void> {
  const items = await rows<{ order_item_id: number; order_id: number; order_item_name: string }>(
    `SELECT order_item_id, order_id, order_item_name FROM wp_woocommerce_order_items WHERE order_item_type='line_item'`
  );
  const itemIds = items.map((i) => i.order_item_id);

  // Fetch all item meta in bulk
  const allMeta = new Map<number, Record<string, string>>();
  const CHUNK = 2000;
  for (let i = 0; i < itemIds.length; i += CHUNK) {
    const chunk = itemIds.slice(i, i + CHUNK);
    const r = await rows<{ order_item_id: number; meta_key: string; meta_value: string }>(
      `SELECT order_item_id, meta_key, meta_value FROM wp_woocommerce_order_itemmeta WHERE order_item_id IN (?)`, [chunk]
    );
    for (const { order_item_id, meta_key, meta_value } of r) {
      if (!allMeta.has(order_item_id)) allMeta.set(order_item_id, {});
      allMeta.get(order_item_id)![meta_key] = meta_value;
    }
  }

  for (const item of items) {
    const order = await prisma.order.findFirst({ where: { wpId: item.order_id }, select: { id: true } });
    if (!order) continue;
    const m = allMeta.get(item.order_item_id) ?? {};
    const productWpId = m._product_id ? parseInt(m._product_id) : null;
    const variantWpId = m._variation_id && m._variation_id !== "0" ? parseInt(m._variation_id) : null;
    const product = productWpId ? await prisma.product.findFirst({ where: { wpId: productWpId }, select: { id: true } }) : null;
    const variant = variantWpId ? await prisma.productVariant.findFirst({ where: { wpId: variantWpId }, select: { id: true } }) : null;
    const existing = await prisma.orderItem.findFirst({ where: { wpId: item.order_item_id } });
    if (!existing) {
      await prisma.orderItem.create({
        data: {
          wpId: item.order_item_id,
          orderId: order.id,
          productId: product?.id ?? null,
          variantId: variant?.id ?? null,
          name: item.order_item_name,
          sku: m._sku || null,
          quantity: parseInt(m._qty ?? "1"),
          subtotal: dec(m._line_subtotal),
          total: dec(m._line_total),
          taxTotal: dec(m._line_tax),
        },
      });
    }
  }
  console.log(`    line items: ${items.length}`);
}
