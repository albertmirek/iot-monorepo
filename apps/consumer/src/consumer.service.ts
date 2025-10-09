import { Controller, Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class ConsumerService {
  constructor() {}

  @EventPattern('telemetry_data_emitted')
  private handleTelemetryDataEmit(data: any) {
    console.log('Data from consumed event: ', data);
  }
}
