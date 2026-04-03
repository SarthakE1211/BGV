const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
    const partner = await prisma.partner.create({
        data: { name: "Amazon" },
    });

    const client = await prisma.client.create({
        data: { name: "US Hiring" },
    });

    await prisma.checkMatrix.create({
        data: {
            partnerId: partner.id,
            clientId: client.id,
            checks: { education: true, employment: true },
        },
    });
}

main()
    .then(() => {
        console.log("Seeded ✅");
    })
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });