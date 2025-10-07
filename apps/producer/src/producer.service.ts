import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class ProducerService {
  private readonly logger = new Logger(ProducerService.name);

  constructor() {}

  @Interval(10000)
  public produceTelemetryData() {
    console.log('Random data', Math.random());
  }
}
