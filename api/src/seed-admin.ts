import { prisma } from "./db.js";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@vetmedagri.com";
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User",
    },
  });

  console.log("Admin user set up successfully:", admin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
