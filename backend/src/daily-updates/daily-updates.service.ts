import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateDailyUpdateDto {
  date: string;
  owner: string;
  module?: string;
  workDoneToday: string;
  plannedTomorrow?: string;
  blockers?: string;
  status?: string;
  completionPct?: number;
  internalNotes?: string;
}
export class UpdateDailyUpdateDto extends CreateDailyUpdateDto {}

@Injectable()
export class DailyUpdatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.dailyUpdate.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateDailyUpdateDto) {
    const upd = await this.prisma.dailyUpdate.create({
      data: { ...dto, projectId, status: dto.status ?? 'Doing', completionPct: dto.completionPct ?? 0 },
    });
    return { data: upd };
  }

  async update(projectId: string, id: string, dto: UpdateDailyUpdateDto) {
    const upd = await this.prisma.dailyUpdate.findFirst({ where: { id, projectId } });
    if (!upd) throw new NotFoundException(`Daily update ${id} not found`);
    const updated = await this.prisma.dailyUpdate.update({ where: { id }, data: dto });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.dailyUpdate.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
