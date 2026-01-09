import { prisma } from '../../database/database.service';

export class LoggerService {
    static async log(action: string, userId: string, metadata: any = {}, orgId?: string) {
        try {
            await prisma.auditLog.create({
                data: {
                    action,
                    userId,
                    organizationId: orgId,
                    details: JSON.stringify(metadata),
                }
            });
        } catch (e) {
            console.error('Failed to write audit log', e);
        }
    }

    static async getLogs(filters: any = {}) {
        return prisma.auditLog.findMany({
            where: filters,
            include: { user: { select: { email: true, name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for now
        });
    }
}
