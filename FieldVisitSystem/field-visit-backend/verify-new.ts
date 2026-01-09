
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const loc = await prisma.location.findFirst();
    console.log('First Location:', loc);
    const count = await prisma.location.count();
    console.log('Total:', count);
}
main().finally(() => prisma.$disconnect());
