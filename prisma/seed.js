import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const partners = [
        {
            name: "HCL Technologies",
            code: "HCL",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check", "Address Check"],
        },
        {
            name: "Cognizant",
            code: "COG",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check"],
        },
        {
            name: "LTIMindtree",
            code: "LTM",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check", "Reference Check"],
        },
        {
            name: "TCS",
            code: "TCS",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check"],
        },
        {
            name: "Wipro",
            code: "WIP",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check", "Address Check"],
        },
        {
            name: "Hexaware",
            code: "HEX",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check"],
        },
        {
            name: "Birlasoft",
            code: "BIR",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check"],
        },
        {
            name: "Mindsprint",
            code: "MIN",
            standardChecks: ["Employment Check", "Education Check", "Criminal Check"],
        },
    ];

    for (const p of partners) {
        await prisma.partner.upsert({
            where: { code: p.code },
            create: p,
            update: { standardChecks: p.standardChecks },
        });
    }

    console.log("✓ Partners seeded");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());