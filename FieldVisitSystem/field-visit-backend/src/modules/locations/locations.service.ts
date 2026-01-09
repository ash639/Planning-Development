import { prisma } from '../../database/database.service';

export class LocationsService {

    static async create(data: any) {
        const { name, latitude, longitude, address, organizationId, assignedAgentId, district, block, stationType } = data;
        return prisma.location.create({
            data: {
                name,
                latitude,
                longitude,
                address,
                organizationId,
                assignedAgentId,
                district,
                block,
                stationType
            }
        });
    }

    static async findAll(query: any) {
        const { organizationId } = query;
        return prisma.location.findMany({
            where: organizationId ? { organizationId } : {},
            include: { assignedAgent: { select: { id: true, name: true } } }
        });
    }
}
