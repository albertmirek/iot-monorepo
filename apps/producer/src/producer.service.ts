import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import {
  telemetryDataEmitted,
  TelemetryDataEmittedSchema,
} from '@albertmirek/node-lib';
import { z } from 'zod';

@Injectable()
export class ProducerService {
  private iotDeviceStore: string[] = [];
  constructor(@Inject('PRODUCER_SERVICE') private client: ClientProxy) {
    for (let i = 0; i < 10; i++) {
      this.iotDeviceStore.push(uuidv4());
    }
    console.log(
      `iotDeviceStore populated with: ${this.iotDeviceStore.length} devices`,
    );
  }

  @Interval('telemetry_emit_interval', 5000)
  public produceTelemetryData(
    dataQueue = 'telemetry_data_emitted',
    data?: TelemetryDataEmittedSchema,
  ) {
    console.log('Start to emit');
    const generatedData = {
      deviceId: this.iotDeviceStore[Math.floor(Math.random() * 10)],
      timestamp: new Date().toISOString(),
      temperature: Math.floor(Math.random() * (30 - 20) + 20),
      humidity: Math.random() * (0.6 - 0.3) + 0.3,
      ...data,
    };
    console.log('Generated');

    try {
      const parsedData = telemetryDataEmitted.parse(generatedData);
      console.log('Parsed');
      return this.client.emit(dataQueue, {
        ...parsedData,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Invalid telemetry event:', err);
        throw new Error(`Invalid telemetry event data: ${err.message}`);
      }
      throw err;
    }
  }
}
