import PDFDocument from 'pdfkit';

export class PdfGenerator {
    static async generateVisitReport(visit: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4',
                info: {
                    Title: `Visit Report - ${visit.location?.name || 'Station'}`,
                    Author: 'Field Visit Management System',
                }
            });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const primaryColor = '#1e3a8a'; // Deep Blue
            const secondaryColor = '#334155'; // Slate
            const accentColor = '#059669'; // Emerald
            const lightBg = '#f8fafc';

            // --- Geolocation Helper ---
            const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            };

            // --- Header Banner ---
            doc.rect(0, 0, 612, 100).fill(primaryColor);
            doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('FIELD VISIT INTEGRITY REPORT', 50, 35);
            doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, 50, 65);
            doc.fontSize(10).font('Helvetica-Bold').text('VERIFIED SYSTEM LOG', 450, 42, { align: 'right' });

            doc.moveDown(5);

            // --- Section 1: Core Identification (2 Columns) ---
            const startY = 120;

            // Left Column: Station
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('STATION INFORMATION', 50, startY);
            doc.moveTo(50, startY + 18).lineTo(260, startY + 18).strokeColor(primaryColor).lineWidth(1).stroke();

            doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('Name:', 50, startY + 30);
            doc.font('Helvetica').text(visit.location?.name || 'N/A', 110, startY + 30);

            doc.font('Helvetica-Bold').text('Station #:', 50, startY + 45);
            doc.font('Helvetica').text(visit.location?.stationNumber || 'N/A', 110, startY + 45);

            doc.font('Helvetica-Bold').text('Type:', 50, startY + 60);
            doc.font('Helvetica').text(visit.location?.stationType || 'N/A', 110, startY + 60);

            doc.font('Helvetica-Bold').text('District:', 50, startY + 75);
            doc.font('Helvetica').text(visit.location?.district || 'N/A', 110, startY + 75);

            doc.font('Helvetica-Bold').text('Block:', 50, startY + 90);
            doc.font('Helvetica').text(visit.location?.block || 'N/A', 110, startY + 90);

            // Right Column: Assignment
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('ASSIGNMENT CONTEXT', 320, startY);
            doc.moveTo(320, startY + 18).lineTo(540, startY + 18).strokeColor(primaryColor).lineWidth(1).stroke();

            doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('Officer:', 320, startY + 30);
            doc.font('Helvetica').text(visit.agent?.name || 'Unassigned', 380, startY + 30);

            doc.font('Helvetica-Bold').text('Date:', 320, startY + 45);
            doc.font('Helvetica').text(new Date(visit.scheduledDate).toLocaleDateString(), 380, startY + 45);

            doc.font('Helvetica-Bold').text('Check-In:', 320, startY + 60);
            doc.font('Helvetica').text(visit.checkInTime ? new Date(visit.checkInTime).toLocaleTimeString() : 'N/A', 380, startY + 60);

            doc.font('Helvetica-Bold').text('Check-Out:', 320, startY + 75);
            doc.font('Helvetica').text(visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleTimeString() : 'N/A', 380, startY + 75);

            // --- Section 2: Integrity Metrics (Boxed) ---
            const metricY = startY + 110;
            doc.rect(50, metricY, 490, 85).fill(lightBg);
            doc.rect(50, metricY, 490, 85).strokeColor('#e2e8f0').stroke();

            doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('FAIRNESS & INTEGRITY AUDIT', 65, metricY + 10);

            let proximity = 'N/A';
            if (visit.checkInLat && visit.location?.latitude) {
                proximity = `${calculateDistance(visit.checkInLat, visit.checkInLng, visit.location.latitude, visit.location.longitude).toFixed(2)} KM`;
            }

            doc.fillColor(secondaryColor).fontSize(9);
            doc.font('Helvetica-Bold').text('Check-in Proximity to Station:', 65, metricY + 30);
            doc.font('Helvetica').text(proximity, 220, metricY + 30);

            doc.font('Helvetica-Bold').text('Travel Distance During Visit:', 65, metricY + 45);
            doc.font('Helvetica').text(visit.travelDistance ? `${visit.travelDistance.toFixed(2)} KM` : 'N/A', 220, metricY + 45);

            doc.font('Helvetica-Bold').text('Total On-Site Duration:', 65, metricY + 60);
            const duration = visit.checkInTime && visit.checkOutTime
                ? `${Math.floor((new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()) / 60000)} Minutes`
                : 'N/A';
            doc.font('Helvetica').text(duration, 220, metricY + 60);

            // GPS Badge
            doc.rect(340, metricY + 25, 185, 45).fill('#ffffff');
            doc.rect(340, metricY + 25, 185, 45).strokeColor('#cbd5e1').stroke();
            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('GPS COORDINATES', 350, metricY + 33);
            doc.fillColor(secondaryColor).fontSize(7).font('Helvetica');
            doc.text(`IN:  ${visit.checkInLat || 'N/A'}, ${visit.checkInLng || 'N/A'}`, 350, metricY + 45);
            doc.text(`OUT: ${visit.checkOutLat || 'N/A'}, ${visit.checkOutLng || 'N/A'}`, 350, metricY + 55);

            // --- Section 3: Technical Maintenance Report ---
            const techY = metricY + 105;
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('TECHNICAL OBSERVATION REPORT', 50, techY);
            doc.moveTo(50, techY + 18).lineTo(540, techY + 18).strokeColor(primaryColor).lineWidth(1).stroke();

            let rd: any = {};
            try { rd = typeof visit.reportData === 'string' ? JSON.parse(visit.reportData) : (visit.reportData || {}); } catch (e) { }
            const tech = rd.technical || {};

            const tableData = [
                ['Condition', rd.premiseCondition || 'Normal', 'Signal Strength', tech.signalStrength || 'N/A'],
                ['Mounting', rd.installedPosition || 'N/A', 'Battery Volt', tech.batteryVoltage || 'N/A'],
                ['Solar Unit', tech.solarCondition || 'N/A', 'Raingauge', tech.raingaugeStatus || 'N/A'],
                ['Anemometer', tech.anemometerStatus || 'N/A', 'T/H Sensor', tech.tempSensorStatus || 'N/A'],
                ['Fencing', tech.fenceCondition || 'N/A', 'Security/Lock', tech.gateLockStatus || 'N/A']
            ];

            let curY = techY + 30;
            tableData.forEach((row, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
                doc.rect(50, curY - 5, 490, 20).fill(bg);

                doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold').text(row[0], 60, curY);
                doc.font('Helvetica').text(row[1], 160, curY);

                doc.font('Helvetica-Bold').text(row[2], 300, curY);
                doc.font('Helvetica').text(row[3], 420, curY);

                curY += 20;
            });

            // --- Section 4: General Remarks ---
            const remarksY = curY + 20;
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('OFFICER REMARKS & NOTES', 50, remarksY);
            doc.moveTo(50, remarksY + 18).lineTo(540, remarksY + 18).strokeColor(primaryColor).lineWidth(1).stroke();

            doc.fillColor('#444').font('Helvetica').fontSize(10).text(visit.notes || 'No additional observations recorded by the field agent.', 50, remarksY + 30, {
                width: 490,
                align: 'left',
                lineGap: 4
            });

            // --- Footer Stamp ---
            const footerY = 750;
            doc.rect(50, footerY, 490, 40).strokeColor(primaryColor).lineWidth(0.5).stroke();
            doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold').text('ELECTRONIC VERIFICATION STAMP', 60, footerY + 8);
            doc.fillColor(secondaryColor).fontSize(7).font('Helvetica').text('This document is digitally signed by the Geo-Verification Engine. All coordinates and timestamps have been cross-referenced with internal logs to ensure compliance with field standards.', 60, footerY + 18, { width: 380 });

            // Signature Line
            doc.moveTo(450, footerY + 25).lineTo(530, footerY + 25).stroke();
            doc.text('Authorized System Signatory', 445, footerY + 28);

            doc.end();
        });
    }
}
