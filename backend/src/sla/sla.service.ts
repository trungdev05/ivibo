import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateSlaDto {
  code: string;
  title: string;
  description?: string;
  requestedBy: string;
  assignedTo?: string;
  priority?: string;
  status?: string;
  category?: string;
  slaDeadline?: string;
  notes?: string;
  linkedIssueId?: string;
}
export class UpdateSlaDto extends CreateSlaDto {}

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.slaRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateSlaDto) {
    const sla = await this.prisma.slaRequest.create({
      data: { ...dto, projectId, status: dto.status ?? 'Open', priority: dto.priority ?? 'Medium' },
    });
    return { data: sla };
  }

  async update(projectId: string, id: string, dto: UpdateSlaDto) {
    const sla = await this.prisma.slaRequest.findFirst({ where: { id, projectId } });
    if (!sla) throw new NotFoundException(`SLA ${id} not found`);
    const updated = await this.prisma.slaRequest.update({ where: { id }, data: dto });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.slaRequest.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
