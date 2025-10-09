import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class ProducerService {
  constructor(@Inject('PRODUCER_SERVICE') private client: ClientProxy) {}

  @Interval(5000)
  public produceTelemetryData() {
    return this.client.emit('telemetry_data_emitted', {
      something: Math.random(),
    });
  }
}
