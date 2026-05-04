import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class CreateRequirementDto {
  code: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  version?: string;
  requester?: string;
  analyst?: string;
  milestoneId?: string;
  createdBy: string;
  changeLog?: any[];
}
export class UpdateRequirementDto extends CreateRequirementDto {}

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.requirement.findMany({
      where: { projectId },
      include: { milestone: { select: { id: true, phase: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateRequirementDto) {
    const req = await this.prisma.requirement.create({
      data: { ...dto, projectId, changeLog: dto.changeLog ?? [] },
    });
    return { data: req };
  }

  async update(projectId: string, id: string, dto: UpdateRequirementDto) {
    const req = await this.prisma.requirement.findFirst({ where: { id, projectId } });
    if (!req) throw new NotFoundException(`Requirement ${id} not found`);
    const data: Prisma.RequirementUpdateInput = { ...dto };
    if (dto.changeLog !== undefined) {
      data.changeLog = dto.changeLog as Prisma.InputJsonValue;
    }
    const updated = await this.prisma.requirement.update({
      where: { id },
      data,
    });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.requirement.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
