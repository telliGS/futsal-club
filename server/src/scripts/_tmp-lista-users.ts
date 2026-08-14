import "dotenv/config";
import { prisma } from "../config.js";

const users = await prisma.user.findMany({
  where: { role: "ADMIN" },
  select: { email: true, fullName: true, role: true, teamAccess: { select: { teamId: true } } },
});
console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
