import { Module } from '@nestjs/common';
import { TelemetryStoreService } from './telemetryStore.service';

@Module({
  providers: [TelemetryStoreService],
  exports: [TelemetryStoreService],
})
export class DatastoreModule {}
