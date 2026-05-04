import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string, limit = 50) {
    const data = await this.prisma.auditLog.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { data };
  }

  async log(args: { userId?: string; projectId?: string; entityType: string; entityId: string; action: string; before?: any; after?: any }) {
    return this.prisma.auditLog.create({ data: args });
  }
}
