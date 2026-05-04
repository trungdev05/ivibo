import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { ActivityService } from './activity.service';

@ApiTags('activity')
@Controller('api/omes/projects/:projectId/activity')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Param('projectId') projectId: string, @Query('limit') limit?: string) {
    return this.service.findByProject(projectId, limit ? +limit : 50);
  }
}
