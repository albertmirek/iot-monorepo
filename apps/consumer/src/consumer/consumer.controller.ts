import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import {
  telemetryDataEmitted,
  TelemetryDataEmittedSchema,
} from '@albertmirek/node-lib';
import { z } from 'zod';
import { TelemetryStoreService } from '../datastore/telemetryStore.service';

@Controller()
export class ConsumerController {
  constructor(private readonly telemetryStore: TelemetryStoreService) {}

  @EventPattern('telemetry_data_emitted')
  private handleTelemetryDataEmit(data: TelemetryDataEmittedSchema) {
    console.log('consumed data', data);
    try {
      const parsedData = telemetryDataEmitted.parse(data);
      this.telemetryStore.addRecord(data.deviceId, {
        ...parsedData,
        createdAt: data.timestamp,
      });
      const allData = this.telemetryStore.getForDevice(data.deviceId);
      console.log('All data for device', allData?.length);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Invalid telemetry event:', err);
        throw new Error('Invalid telemetry event data:', err);
      }
      throw err;
    }
  }
}
