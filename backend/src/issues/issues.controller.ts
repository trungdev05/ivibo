import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IssuesService, CreateIssueDto, UpdateIssueDto } from './issues.service';

@ApiTags('issues')
@Controller('api/omes/projects/:projectId/issues')
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Get() findAll(@Param('projectId') projectId: string) { return this.service.findByProject(projectId); }
  @Post() create(@Param('projectId') projectId: string, @Body() dto: CreateIssueDto) { return this.service.create(projectId, dto); }
  @Put(':id') update(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateIssueDto) { return this.service.update(projectId, id, dto); }
  @Delete(':id') remove(@Param('projectId') projectId: string, @Param('id') id: string) { return this.service.remove(projectId, id); }
}
