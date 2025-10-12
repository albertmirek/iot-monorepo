import { Inject, Injectable, Logger } from '@nestjs/common';
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
  public readonly logger = new Logger(ProducerService.name);
  private iotDeviceStore: string[] = [];
  private readonly queue: string;
  constructor(@Inject('PRODUCER_CLIENT_PROXY') private client: ClientProxy) {
    for (let i = 0; i < 10; i++) {
      this.iotDeviceStore.push(uuidv4());
    }
    console.log(
      `iotDeviceStore populated with: ${this.iotDeviceStore.length} devices`,
    );

    const eventQueue = process.env.TELEMETRY_QUEUE;
    if (!eventQueue) {
      throw new Error(`TELEMETRY_QUEUE env not set`);
    }

    this.queue = eventQueue;
  }

  @Interval('telemetry_emit_interval', 10000)
  public produceTelemetryData(data?: TelemetryDataEmittedSchema) {
    this.logger.log('Starting to emit data');
    const generatedData = {
      deviceId: this.iotDeviceStore[Math.floor(Math.random() * 10)],
      timestamp: new Date().toISOString(),
      temperature: Math.floor(Math.random() * (30 - 20) + 20),
      humidity: Math.random() * (0.6 - 0.3) + 0.3,
      ...data,
    };

    try {
      const parsedData = telemetryDataEmitted.parse(generatedData);
      this.logger.log('Data parsed .... emitting');
      return this.client.emit(this.queue, {
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
