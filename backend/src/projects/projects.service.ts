import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto/project.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProjectDto) {
    const { search, type, status, page = 1, pageSize = 50 } = query;
    const where: Prisma.ProjectWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status as any;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          members: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
          _count: { select: { issues: true, risks: true, milestones: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        members: { include: { user: { select: { id: true, fullName: true, avatarUrl: true, globalRole: true } } } },
        phases: { orderBy: { order: 'asc' } },
        milestones: { orderBy: { startDate: 'asc' } },
        _count: { select: { issues: true, risks: true, requirements: true, documents: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return { data: project };
  }

  async create(dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget ?? 0,
      },
    });
    return { data: project };
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    return { data: project };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { data: { id } };
  }

  // ── Dashboard summary ────────────────────────────────────────────────────────

  async getDashboard() {
    const [total, byStatus, byHealth] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.project.groupBy({ by: ['health'], _count: { id: true } }),
    ]);
    return { data: { total, byStatus, byHealth } };
  }
}
