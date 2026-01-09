import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findFirst({ where: { email: 'two@example.com' } });
    const loc = await prisma.location.findFirst();
    console.log('USER_ORG_ID=' + user?.organizationId);
    console.log('LOC_ORG_ID=' + loc?.organizationId);
}

check().catch(console.error).finally(() => prisma.$disconnect());
