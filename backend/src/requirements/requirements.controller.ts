import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirementsService, CreateRequirementDto, UpdateRequirementDto } from './requirements.service';

@ApiTags('requirements')
@Controller('api/omes/projects/:projectId/requirements')
export class RequirementsController {
  constructor(private readonly service: RequirementsService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateRequirementDto) { return this.service.create(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateRequirementDto) { return this.service.update(projectId, id, dto); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
