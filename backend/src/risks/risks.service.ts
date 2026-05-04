import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateRiskDto {
  code: string;
  category: string;
  title: string;
  description?: string;
  probability: number;
  impact: number;
  owner?: string;
  status?: string;
  mitigation?: string;
  contingency?: string;
  dueDate?: string;
}
export class UpdateRiskDto extends CreateRiskDto {}

@Injectable()
export class RisksService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.risk.findMany({
      where: { projectId },
      orderBy: { score: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateRiskDto) {
    const score = dto.probability * dto.impact;
    const level = score <= 5 ? 'low' : score <= 10 ? 'medium' : score <= 15 ? 'high' : 'critical';
    const risk = await this.prisma.risk.create({
      data: {
        ...dto,
        projectId,
        score,
        level: level as any,
        status: (dto.status ?? 'open') as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return { data: risk };
  }

  async update(projectId: string, id: string, dto: UpdateRiskDto) {
    const risk = await this.prisma.risk.findFirst({ where: { id, projectId } });
    if (!risk) throw new NotFoundException(`Risk ${id} not found`);
    const score = dto.probability * dto.impact;
    const level = score <= 5 ? 'low' : score <= 10 ? 'medium' : score <= 15 ? 'high' : 'critical';
    const updated = await this.prisma.risk.update({
      where: { id },
      data: { ...dto, score, level: level as any, status: dto.status as any, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined },
    });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.risk.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
