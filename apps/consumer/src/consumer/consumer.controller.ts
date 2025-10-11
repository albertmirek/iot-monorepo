import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import {
  telemetryDataEmitted,
  TelemetryDataEmittedSchema,
} from '@albertmirek/node-lib';
import { z } from 'zod';

@Controller()
export class ConsumerController {
  constructor() {}

  @EventPattern('telemetry_data_emitted')
  private handleTelemetryDataEmit(data: TelemetryDataEmittedSchema) {
    console.log('consumed data', data);
    try {
      const parsedData = telemetryDataEmitted.parse(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Invalid telemetry event:', err);
        throw new Error('Invalid telemetry event data:', err);
      }
      throw err;
    }
  }
}
