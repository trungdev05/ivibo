import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResourcesService, CreateResourceDto, UpdateResourceDto } from './resources.service';

@ApiTags('resources')
@Controller('api/omes/projects/:projectId/resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateResourceDto) { return this.service.upsert(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateResourceDto) { return this.service.upsert(projectId, { ...dto }); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
