import { Module } from '@nestjs/common';
import { DailyUpdatesController } from './daily-updates.controller';
import { DailyUpdatesService } from './daily-updates.service';

@Module({ controllers: [DailyUpdatesController], providers: [DailyUpdatesService] })
export class DailyUpdatesModule {}
