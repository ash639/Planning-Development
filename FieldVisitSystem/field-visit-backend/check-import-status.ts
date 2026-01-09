
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.location.count();
    const lastLoc = await prisma.location.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log(`Total Locations: ${count}`);
    if (lastLoc) {
        console.log('Last Imported:', JSON.stringify(lastLoc, null, 2));
    }
}
main().finally(() => prisma.$disconnect());
