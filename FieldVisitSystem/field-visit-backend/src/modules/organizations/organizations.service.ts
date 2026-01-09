import { prisma } from '../../database/database.service';

export class OrganizationsService {
    static async create(data: any) {
        const { name } = data;
        return prisma.organization.create({
            data: { name, status: 'ACTIVE', plan: 'FREE' }
        });
    }

    static async findAll() {
        return prisma.organization.findMany({
            include: {
                _count: {
                    select: { users: true, visits: true }
                }
            }
        });
    }

    static async findOne(id: string) {
        return prisma.organization.findUnique({
            where: { id },
            include: {
                _count: { select: { users: true, visits: true } }
            }
        });
    }

    static async updateStatus(id: string, status: string) {
        return prisma.organization.update({
            where: { id },
            data: { status }
        });
    }

    static async updatePlan(id: string, plan: string) {
        return prisma.organization.update({
            where: { id },
            data: { plan }
        });
    }

    static async updateSettings(id: string, settings: any) {
        // Store as JSON string in SQLite
        return prisma.organization.update({
            where: { id },
            data: { settings: JSON.stringify(settings) }
        });
    }

    static async update(id: string, data: any) {
        return prisma.organization.update({
            where: { id },
            data
        });
    }

    static async delete(id: string) {
        console.log(`[OrgService] Deleting Organization: ${id}`);
        // Delete related data first. Order matters due to Foreign Key constraints!

        // 1. Reports (depend on User and Org)
        console.log(`[OrgService] Preparing to delete Reports for organization: ${id}`);
        const deleteReports = prisma.report.deleteMany({ where: { organizationId: id } });

        // 2. Visits (depend on Location and Org)
        console.log(`[OrgService] Preparing to delete Visits for organization: ${id}`);
        const deleteVisits = prisma.visit.deleteMany({ where: { organizationId: id } });

        // 3. Locations (depend on Org, referenced by Visits)
        // Must be deleted AFTER Visits
        console.log(`[OrgService] Preparing to delete Locations for organization: ${id}`);
        const deleteLocs = prisma.location.deleteMany({ where: { organizationId: id } });

        // 4. Audit Logs (Optional cleanup)
        console.log(`[OrgService] Preparing to delete Audit Logs for organization: ${id}`);
        const deleteAuditLogs = prisma.auditLog.deleteMany({ where: { organizationId: id } });

        // 5. Users (depend on Org, referenced by Reports)
        // Must be deleted AFTER Reports
        console.log(`[OrgService] Preparing to delete Users for organization: ${id}`);
        const deleteUsers = prisma.user.deleteMany({ where: { organizationId: id } });

        // 6. The Organization itself
        console.log(`[OrgService] Preparing to delete Organization: ${id}`);
        const deleteOrg = prisma.organization.delete({ where: { id } });

        try {
            await prisma.$transaction([
                deleteReports,
                deleteVisits,
                deleteLocs,
                deleteAuditLogs,
                deleteUsers,
                deleteOrg
            ]);
            console.log(`[OrgService] Successfully deleted Organization: ${id}`);
        } catch (error) {
            console.error(`[OrgService] Failed to delete Organization: ${id}`, error);
            throw error;
        }
    }
}
