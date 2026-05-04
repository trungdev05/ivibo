import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateResourceDto {
  userId: string;
  role: string;
  allocationPercent?: number;
  availability?: number;
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  hourlyRate?: number;
  notes?: string;
}
export class UpdateResourceDto extends CreateResourceDto {}

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.resourceAllocation.findMany({
      where: { projectId },
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });
    return { data };
  }

  async upsert(projectId: string, dto: CreateResourceDto) {
    const existing = await this.prisma.resourceAllocation.findFirst({
      where: { projectId, userId: dto.userId },
    });
    const payload = {
      ...dto,
      projectId,
      hourlyRate: dto.hourlyRate ?? 0,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    };
    if (existing) {
      const updated = await this.prisma.resourceAllocation.update({ where: { id: existing.id }, data: payload });
      return { data: updated };
    }
    const created = await this.prisma.resourceAllocation.create({ data: payload as any });
    return { data: created };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.resourceAllocation.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
