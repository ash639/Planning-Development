import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const v = await prisma.visit.findUnique({
        where: { id: '48cb4dd5-a9e3-47d0-9254-428851c3c917' }
    });
    if (v) {
        console.log('CHECKIN_LAT:', v.checkInLat);
        console.log('CHECKIN_LNG:', v.checkInLng);
        console.log('CHECKOUT_LAT:', v.checkOutLat);
        console.log('CHECKOUT_LNG:', v.checkOutLng);
        console.log('TRAVEL_DIST:', v.travelDistance);
    }
    await prisma.$disconnect();
}
main();
