import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MilestonesService, CreateMilestoneDto, UpdateMilestoneDto } from './milestones.service';

@ApiTags('milestones')
@Controller('api/omes/projects/:projectId/milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto) { return this.service.create(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateMilestoneDto) { return this.service.update(projectId, id, dto); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
