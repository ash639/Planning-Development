
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const visits = await prisma.visit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { location: true, agent: true }
    });
    console.log('Recent Visits:', JSON.stringify(visits, null, 2));
}
main().finally(() => prisma.$disconnect());
