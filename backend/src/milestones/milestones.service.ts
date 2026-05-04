import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateMilestoneDto {
  phase: string;
  status?: string;
  startDate: string;
  endDate: string;
  actualDate?: string;
  owner?: string;
  completionPct?: number;
  dependencies?: string;
}
export class UpdateMilestoneDto extends CreateMilestoneDto {}

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateMilestoneDto) {
    const m = await this.prisma.projectMilestone.create({
      data: { ...dto, projectId, status: dto.status ?? 'Not Started', completionPct: dto.completionPct ?? 0 },
    });
    return { data: m };
  }

  async update(projectId: string, id: string, dto: UpdateMilestoneDto) {
    const m = await this.prisma.projectMilestone.findFirst({ where: { id, projectId } });
    if (!m) throw new NotFoundException(`Milestone ${id} not found`);
    const updated = await this.prisma.projectMilestone.update({ where: { id }, data: dto });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.projectMilestone.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
