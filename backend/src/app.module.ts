import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { IssuesModule } from './issues/issues.module';
import { RisksModule } from './risks/risks.module';
import { ResourcesModule } from './resources/resources.module';
import { RequirementsModule } from './requirements/requirements.module';
import { DocumentsModule } from './documents/documents.module';
import { MilestonesModule } from './milestones/milestones.module';
import { DailyUpdatesModule } from './daily-updates/daily-updates.module';
import { SlaModule } from './sla/sla.module';
import { UsersModule } from './users/users.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProjectsModule,
    IssuesModule,
    RisksModule,
    ResourcesModule,
    RequirementsModule,
    DocumentsModule,
    MilestonesModule,
    DailyUpdatesModule,
    SlaModule,
    UsersModule,
    ActivityModule,
  ],
})
export class AppModule {}
