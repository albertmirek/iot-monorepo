import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProducerService } from './producer.service';
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [ProducerService],
})
export class AppModule {}
