import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class ProducerService {
  constructor(@Inject('PRODUCER_SERVICE') private client: ClientProxy) {}

  @Interval(5000)
  public produceTelemetryData() {
    const data = {
      deviceId: '40a13cb7-d05e-49e9-a658-070a859d6f48',
      timestamp: new Date().toISOString(),
      temperature: 21,
      humidity: 0.4,
    };
    return this.client.emit('telemetry_data_emitted', {
      ...data,
    });
  }
}
