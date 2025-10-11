import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { telemetryDataEmitted } from '@albertmirek/node-lib';
import { z } from 'zod';

@Injectable()
export class ProducerService {
  private iotDeviceStore: string[];
  constructor(@Inject('PRODUCER_SERVICE') private client: ClientProxy) {
    for (let i = 0; i < 10; i++) {
      this.iotDeviceStore.push(uuidv4());
    }
    console.log(
      `iotDeviceStore populated with: ${this.iotDeviceStore.length} devices`,
    );
  }

  @Interval(5000)
  public produceTelemetryData() {
    const generatedData = {
      deviceId: this.iotDeviceStore[Math.floor(Math.random() * 10)],
      timestamp: new Date().toISOString(),
      temperature: Math.floor(Math.random() * (30 - 20) + 20),
      humidity: Math.random() * (0.6 - 0.3) + 0.3,
    };

    try {
      const parsedData = telemetryDataEmitted.parse(generatedData);
      return this.client.emit('telemetry_data_emitted', {
        ...parsedData,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error('Invalid telemetry event:', err);
        throw new Error('Invalid telemetry event data:', err);
      }
      throw err;
    }
  }
}
