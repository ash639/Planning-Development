import { prisma } from '../../database/database.service';
import { VisitStatus } from '../../common/enums/role.enum'; // Using shared enum file

export class VisitsService {

    static async create(data: any) {
        const { organizationId, locationId, agentId, scheduledDate, notes } = data;
        return prisma.visit.create({
            data: {
                organizationId,
                locationId,
                agentId,
                scheduledDate: new Date(scheduledDate),
                notes,
                status: 'SCHEDULED' // String from Enum
            }
        });
    }

    static async findAll(query: any) {
        // Basic filter by org or agent
        const { organizationId, agentId } = query;
        const where: any = {};
        if (organizationId) where.organizationId = organizationId;
        if (agentId) where.agentId = agentId;

        return prisma.visit.findMany({
            where,
            include: {
                location: true,
                agent: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { scheduledDate: 'asc' }
        });
    }

    static async findOne(id: string) {
        return prisma.visit.findUnique({
            where: { id },
            include: { location: true, agent: true }
        });
    }

    static async updateStatus(id: string, status: string, data?: any) {
        const updateData: any = { status };

        if (status === 'IN_PROGRESS') {
            updateData.checkInTime = new Date();
            // Try both specific field names and generic coordinates
            if (data?.checkInLat || data?.latitude) updateData.checkInLat = data.checkInLat || data.latitude;
            if (data?.checkInLng || data?.longitude) updateData.checkInLng = data.checkInLng || data.longitude;
        } else if (status === 'COMPLETED') {
            updateData.checkOutTime = new Date();
            if (data?.notes) updateData.notes = data.notes;
            if (data?.mediaUrls) updateData.mediaUrls = data.mediaUrls;
            if (data?.reportData) updateData.reportData = typeof data.reportData === 'string' ? data.reportData : JSON.stringify(data.reportData);

            // Try both specific field names and generic coordinates
            if (data?.checkOutLat || data?.latitude) updateData.checkOutLat = data.checkOutLat || data.latitude;
            if (data?.checkOutLng || data?.longitude) updateData.checkOutLng = data.checkOutLng || data.longitude;
            if (data?.travelDistance) updateData.travelDistance = data.travelDistance;
        }

        return prisma.visit.update({
            where: { id },
            data: updateData
        });
    }

    static async delete(id: string) {
        return prisma.visit.delete({
            where: { id }
        });
    }
}
