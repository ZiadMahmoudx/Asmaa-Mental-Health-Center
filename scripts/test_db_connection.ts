import { prisma } from "../lib/prisma";

async function main() {
  try {
    console.log("Connecting to SQL Server...");
    const users = await prisma.user.findMany();
    console.log(`✅ Success! Connected to SQL Server database.`);
    console.log(`Found ${users.length} users in database:`);
    users.forEach((u) => {
      console.log(`  - [${u.role}] ${u.fullName} (${u.email})`);
    });

    const doctors = await prisma.doctorProfile.findMany({
      include: { user: true, availability: true },
    });
    console.log(`\nFound ${doctors.length} doctors with profiles:`);
    doctors.forEach((d) => {
      console.log(`  - ${d.user.fullName} | ${d.title} | Online: ${d.sessionPriceOnline} EGP | Slots: ${d.availability.length} rules`);
    });

    const appointments = await prisma.appointment.findMany({
      include: { patient: true, doctor: { include: { user: true } }, paymentProofs: true },
    });
    console.log(`\nFound ${appointments.length} appointments in database:`);
    appointments.forEach((a) => {
      console.log(`  - [${a.status}] ${a.type} | Patient: ${a.patient.fullName} | Doctor: ${a.doctor.user.fullName} | Proofs: ${a.paymentProofs.length}`);
    });
  } catch (err) {
    console.error("❌ Database connection error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
