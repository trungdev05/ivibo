import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DailyUpdatesService, CreateDailyUpdateDto, UpdateDailyUpdateDto } from './daily-updates.service';

@ApiTags('daily-updates')
@Controller('api/omes/projects/:projectId/daily-updates')
export class DailyUpdatesController {
  constructor(private readonly service: DailyUpdatesService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateDailyUpdateDto) { return this.service.create(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateDailyUpdateDto) { return this.service.update(projectId, id, dto); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
