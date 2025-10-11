import { Controller, Get, Query } from '@nestjs/common';
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
      this.telemetryStore.addRecord({
        ...parsedData,
        createdAt: parsedData.timestamp,
      });
      const allData = this.telemetryStore.gatherDataFromStore(
        data.deviceId,
        undefined,
        undefined,
      );
      console.log('All data for device', allData?.length);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Invalid telemetry event:', err);
        throw new Error('Invalid telemetry event data:', err);
      }
      throw err;
    }
  }

  @Get('telemetry')
  public getTelemetryData(
    @Query('deviceId') deviceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.telemetryStore.gatherDataFromStore(deviceId, from, to);
  }
}
