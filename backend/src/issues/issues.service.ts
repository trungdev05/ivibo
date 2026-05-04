import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class CreateIssueDto {
  code: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  priority?: string;
  status?: string;
  assigneeId?: string;
  reporterId?: string;
  dueDate?: string;
  rootCause?: string;
  resolution?: string;
}
export class UpdateIssueDto extends CreateIssueDto {}

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.issue.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateIssueDto) {
    const issue = await this.prisma.issue.create({
      data: {
        ...dto,
        projectId,
        priority: (dto.priority ?? 'medium') as any,
        status: (dto.status ?? 'open') as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return { data: issue };
  }

  async update(projectId: string, id: string, dto: UpdateIssueDto) {
    const issue = await this.prisma.issue.findFirst({ where: { id, projectId } });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    const updated = await this.prisma.issue.update({
      where: { id },
      data: {
        ...dto,
        priority: dto.priority as any,
        status: dto.status as any,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.issue.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
