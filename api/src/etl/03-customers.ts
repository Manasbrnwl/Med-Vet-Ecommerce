/** ETL step 3: users / customers + addresses */
import { prisma } from "../db.js";
import { rows } from "./db-src.js";
import { tryUnserialize } from "./php-unserialize.js";

export async function migrateCustomers(): Promise<void> {
  console.log("  [3] customers...");

  const users = await rows<{ ID: number; user_email: string; user_pass: string; user_registered: string; display_name: string }>(
    `SELECT ID, user_email, user_pass, user_registered, display_name FROM wp_users`
  );
  const ids = users.map((u) => u.ID);
  const metaRows = await rows<{ user_id: number; meta_key: string; meta_value: string }>(
    `SELECT user_id, meta_key, meta_value FROM wp_usermeta WHERE user_id IN (?) AND meta_key IN
     ('first_name','last_name','billing_phone','wp_capabilities',
      'billing_first_name','billing_last_name','billing_company','billing_address_1','billing_address_2',
      'billing_city','billing_state','billing_postcode','billing_country','billing_email','billing_phone',
      'shipping_first_name','shipping_last_name','shipping_company','shipping_address_1','shipping_address_2',
      'shipping_city','shipping_state','shipping_postcode','shipping_country')`, [ids]
  );

  const meta = new Map<number, Record<string, string>>();
  for (const { user_id, meta_key, meta_value } of metaRows) {
    if (!meta.has(user_id)) meta.set(user_id, {});
    meta.get(user_id)![meta_key] = meta_value;
  }

  for (const u of users) {
    const m = meta.get(u.ID) ?? {};
    const caps = tryUnserialize(m.wp_capabilities);
    const role =
      typeof caps === "object" && caps !== null && "administrator" in (caps as object) ? "ADMIN"
      : typeof caps === "object" && caps !== null && "shop_manager" in (caps as object) ? "SHOP_MANAGER"
      : "CUSTOMER";

    const user = await prisma.user.upsert({
      where: { wpId: u.ID },
      update: {},
      create: {
        wpId: u.ID,
        email: u.user_email,
        legacyHash: u.user_pass, // phpass — cannot be used directly; force reset on login
        firstName: m.first_name || m.billing_first_name || null,
        lastName: m.last_name || m.billing_last_name || null,
        phone: m.billing_phone || null,
        role: role as never,
        createdAt: new Date(u.user_registered),
      },
    });

    // Billing address
    if (m.billing_address_1) {
      await prisma.address.upsert({
        where: { id: (await prisma.address.findFirst({ where: { userId: user.id, type: "BILLING" } }))?.id ?? 0 },
        update: {},
        create: {
          userId: user.id, type: "BILLING", isDefault: true,
          firstName: m.billing_first_name || null, lastName: m.billing_last_name || null,
          company: m.billing_company || null,
          address1: m.billing_address_1 || null, address2: m.billing_address_2 || null,
          city: m.billing_city || null, state: m.billing_state || null,
          postcode: m.billing_postcode || null, country: m.billing_country || null,
          phone: m.billing_phone || null, email: m.billing_email || u.user_email,
        },
      });
    }
    if (m.shipping_address_1) {
      await prisma.address.upsert({
        where: { id: (await prisma.address.findFirst({ where: { userId: user.id, type: "SHIPPING" } }))?.id ?? 0 },
        update: {},
        create: {
          userId: user.id, type: "SHIPPING", isDefault: true,
          firstName: m.shipping_first_name || null, lastName: m.shipping_last_name || null,
          company: m.shipping_company || null,
          address1: m.shipping_address_1 || null, address2: m.shipping_address_2 || null,
          city: m.shipping_city || null, state: m.shipping_state || null,
          postcode: m.shipping_postcode || null, country: m.shipping_country || null,
        },
      });
    }
  }
  console.log(`    users: ${users.length}`);
}
