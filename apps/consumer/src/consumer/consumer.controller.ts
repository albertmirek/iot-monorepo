import { Controller, Get, Logger, Query } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import {
  telemetryDataEmitted,
  TelemetryDataEmittedSchema,
} from '@albertmirek/node-lib';
import { z } from 'zod';
import { TelemetryStoreService } from '../datastore/telemetryStore.service';

export function createConsumerControllerFactory(
  queuePattern = 'telemetry_data_emitted_queue',
) {
  @Controller()
  class ConsumerController {
    public readonly logger = new Logger(ConsumerController.name);

    constructor(public readonly telemetryStore: TelemetryStoreService) {}

    @EventPattern(queuePattern)
    handleTelemetryDataEmit(data: TelemetryDataEmittedSchema) {
      this.logger.log('New data in queue');
      try {
        const parsedData = telemetryDataEmitted.parse(data);
        this.telemetryStore.addRecord({
          ...parsedData,
          createdAt: parsedData.timestamp,
        });
        this.logger.log(`Event consumed`);
        return; //ack
      } catch (err) {
        if (err instanceof z.ZodError) {
          this.logger.error('Validation failer for telemetry data', {
            error: err,
            deviceId: data.deviceId,
            data: data,
          });
          return; //ack
        }
        this.logger.error('Unexpected error processing telemetry event', err);
        throw err;
      }
    }

    @Get('telemetry')
    getTelemetryData(
      @Query('deviceId') deviceId?: string,
      @Query('from') from?: string,
      @Query('to') to?: string,
    ) {
      return this.telemetryStore.gatherDataFromStore(deviceId, from, to);
    }
  }

  return ConsumerController;
}
