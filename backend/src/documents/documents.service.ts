import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateDocumentDto {
  name: string;
  url: string;
  type?: string;
  version?: string;
  uploadedBy: string;
  tags?: string[];
  linkedRequirementId?: string;
  linkedMilestoneId?: string;
  linkedTicketId?: string;
}
export class UpdateDocumentDto extends CreateDocumentDto {}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const data = await this.prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
    return { data };
  }

  async create(projectId: string, dto: CreateDocumentDto) {
    const doc = await this.prisma.projectDocument.create({
      data: { ...dto, projectId, tags: dto.tags ?? [] },
    });
    return { data: doc };
  }

  async update(projectId: string, id: string, dto: UpdateDocumentDto) {
    const doc = await this.prisma.projectDocument.findFirst({ where: { id, projectId } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    const updated = await this.prisma.projectDocument.update({
      where: { id },
      data: { ...dto, tags: dto.tags ?? [] },
    });
    return { data: updated };
  }

  async remove(projectId: string, id: string) {
    await this.prisma.projectDocument.deleteMany({ where: { id, projectId } });
    return { data: { id } };
  }
}
