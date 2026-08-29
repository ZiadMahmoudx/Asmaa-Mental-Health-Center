import { PrismaClient, Prisma } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const u = await p.user.findFirst({ where: { email: "sara.mahmoud@example.com" }, select: { id: true, fullName: true } });
  if (!u) throw new Error("no patient");
  await p.patientCredit.deleteMany({ where: { patientId: u.id, reason: { startsWith: "DEMO_CREDIT" } } });
  await p.patientCredit.create({
    data: { patientId: u.id, amountEGP: new Prisma.Decimal(850), kind: "MANUAL_ADJUSTMENT",
            reason: "DEMO_CREDIT: رصيد تجريبي لاختبار الحجز بالرصيد", issuedById: u.id },
  });
  const rows = await p.patientCredit.findMany({ where: { patientId: u.id } });
  let b = new Prisma.Decimal(0); for (const c of rows) b = b.add(c.amountEGP);
  console.log(`${u.fullName} balance = ${b.toString()} EGP`);
}
main().catch(e=>console.log("ERR",(e as Error).message)).finally(()=>p.$disconnect());
