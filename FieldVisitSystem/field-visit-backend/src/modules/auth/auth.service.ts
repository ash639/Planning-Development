import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../database/database.service';
import { Env } from '../../config/env.config';
import { Role } from '../../common/enums/role.enum';
import { LoggerService } from '../logger/logger.service';

export class AuthService {
  static async register(data: any) {
    const { email, password, name, role, organizationId } = data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Organization if implied (optional logic)
    // For now, simple user creation

    return prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role: role || Role.AGENT,
        organizationId
      }
    });
  }

  static async login(data: any) {
    const { email, password } = data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });

    if (!user) throw new Error('Invalid credentials');

    // Validations
    if (!user.isActive) throw new Error('Account is suspended');
    if (user.organization && user.organization.status === 'SUSPENDED') {
      throw new Error('Organization is suspended. Contact Support.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new Error('Invalid credentials');

    // Track Login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Audit Log
    await LoggerService.log('USER_LOGIN', user.id, { email }, user.organizationId || undefined);

    const token = jwt.sign(
      { userId: user.id, role: user.role, organizationId: user.organizationId },
      Env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } };
  }

  static async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log('User not found for ID:', userId);
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    console.log('Password comparison for', user.email, ':', isValid);
    if (!isValid) throw new Error('Incorrect current password');

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword }
    });

    return { success: true };
  }
}
