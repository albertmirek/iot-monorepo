import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Ctx, EventPattern, RmqContext } from '@nestjs/microservices';
import { ProducerService } from '../src/producer.service';
import { TelemetryDataEmittedSchema } from '@albertmirek/node-lib';

@Injectable()
class TestReceiver {
  // simple promise you can await in your test
  public onMessage!: (data: any) => void;
  public received = new Promise<any>((resolve) => (this.onMessage = resolve));

  @EventPattern('telemetry_data_emitted')
  handle(@Ctx() ctx: RmqContext, data: any) {
    this.onMessage(data);
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let service: ProducerService;
  let receiver: TestReceiver;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestReceiver],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const scheduleRegistry = app.get(SchedulerRegistry);
    scheduleRegistry.deleteInterval('telemetry_emit_interval');

    service = app.get(ProducerService);
    receiver = app.get(TestReceiver);
  });

  afterAll(async () => {
    await app.close();
  });

  it('emits a valid telemetry event to RabbitMQ', async () => {
    service.produceTelemetryData();
    /*const payload = await Promise.race([
      receiver.received,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 4000),
      ),
    ]);*/
    const payload = await Promise.all([receiver.received]);
    console.log('payload', payload);

    expect(payload).toHaveProperty('deviceId');
    /*    expect(typeof payload.deviceId).toBe('string');
    expect(payload).toHaveProperty('timestamp');
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');
    expect(typeof payload.temperature).toBe('number');
    expect(typeof payload.humidity).toBe('number');*/
  });
});
