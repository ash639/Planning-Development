
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Import from BMSKnew.csv...');

    const filePath = 'd:\\Project\\FieldVisitSystem\\field-visit-app\\assets\\BMSKnew.csv';
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Headers from our analysis:
    // 0: station_numbeer -> NAME
    // 4: district_name -> DISTRICT
    // 6: block_name -> BLOCK
    // 9: location -> ADDRESS
    // 10: longitude
    // 11: latitude
    // 12: station_type

    // Organization ID (ASHISH Org)
    const org = await prisma.organization.findFirst();
    if (!org) {
        console.error('No organization found');
        return;
    }

    console.log('Cleaning existing locations...');
    // Delete all existing locations first to ensure clean state
    await prisma.visit.deleteMany(); // Cascade delete visits first
    await prisma.location.deleteMany();

    console.log('Parsing and Importing...');

    let successCount = 0;
    let errorCount = 0;

    // Start from index 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV split by comma (assuming no commas in values based on sample)
        // If values have commas, this simple split will fail, but the sample looked clean.
        // We will stick to simple split for now as we don't have a CSV parser library involved reliably yet.
        const cols = line.split(',');

        if (cols.length < 12) {
            // console.warn(`Skipping invalid line ${i}: ${line}`);
            continue;
        }

        const stationId = cols[0]?.trim();     // Name
        const district = cols[4]?.trim();
        const block = cols[6]?.trim();
        const locationName = cols[9]?.trim();   // Address
        const longStr = cols[10]?.trim();
        const latStr = cols[11]?.trim();
        const type = cols[12]?.trim();
        const isProblematicStr = cols[16]?.trim().toLowerCase(); // "yes"/"no"? 
        const lastVisitedStr = cols[21]?.trim(); // "09-01-2024"

        // Basic "Yes"/"True" check or check imported data
        // For sample provided: "No-Issue" -> false? Or is "is_problematic" the header for another col?
        // Header 16 is "is_problematic". Sample val row 1 col 16 is "".
        // Let's assume non-empty string means problematic or specific keywords.
        // Actually, let's verify empty string.
        let isProblematic = false;
        if (isProblematicStr && isProblematicStr.length > 0) {
            isProblematic = true;
        }

        let lastVisitedDate: Date | null = null;
        if (lastVisitedStr) {
            // DD-MM-YYYY
            const parts = lastVisitedStr.split('-');
            if (parts.length === 3) {
                // new Date(yyyy, mm-1, dd)
                lastVisitedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
        }

        if (!stationId) continue;

        try {
            await prisma.location.create({
                data: {
                    name: stationId, // "61110001"
                    district: district || 'Unknown',
                    block: block || 'Unknown',
                    address: locationName || `${district}, ${block}`,
                    stationType: type || 'Unknown',
                    latitude: parseFloat(latStr) || 0,
                    longitude: parseFloat(longStr) || 0,
                    lastVisited: lastVisitedDate,
                    isProblematic: isProblematic,
                    organizationId: org.id
                }
            });
            successCount++;
            if (successCount % 100 === 0) process.stdout.write('.');
        } catch (e) {
            console.error(`Error importing ${stationId}:`, e);
            errorCount++;
        }
    }

    console.log(`\nImport Completed!`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
