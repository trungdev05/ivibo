import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentsService, CreateDocumentDto, UpdateDocumentDto } from './documents.service';

@ApiTags('documents')
@Controller('api/omes/projects/:projectId/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateDocumentDto) { return this.service.create(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.service.update(projectId, id, dto); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
