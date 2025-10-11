import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Module } from '@nestjs/common';
import { App } from 'supertest/types';
import { SchedulerRegistry, ScheduleModule } from '@nestjs/schedule';
import {
  Ctx,
  EventPattern,
  RmqContext,
  Transport,
  ClientsModule,
} from '@nestjs/microservices';
import { ProducerService } from '../src/producer.service';
import { TelemetryDataEmittedSchema } from '@albertmirek/node-lib';

const TEST_DATA_QUEUE = 'dataQueueTest';

@Controller()
class TestConsumer {
  public onMessage!: (data: TelemetryDataEmittedSchema) => void;
  public received = new Promise<TelemetryDataEmittedSchema>(
    (resolve) => (this.onMessage = resolve),
  );

  @EventPattern(TEST_DATA_QUEUE)
  handle(@Ctx() ctx: RmqContext) {
    const message = ctx.getMessage() as {
      content: Buffer;
      fields: Record<string, unknown>;
      properties: Record<string, unknown>;
    };
    const content = message.content.toString();
    const data = JSON.parse(content) as {
      data: TelemetryDataEmittedSchema;
      pattern: string;
    };

    console.log('TestConsumer received data:', data);
    this.onMessage(data.data);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.getChannelRef().ack(message);
  }
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'PRODUCER_CLIENT_PROXY',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBIT_MQ_URL || 'amqp://admin:admin@localhost:5672',
          ],
          queue: TEST_DATA_QUEUE,
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [TestConsumer],
  providers: [ProducerService],
})
class TestAppModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let service: ProducerService;
  let receiver: TestConsumer;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const url =
      process.env.RABBIT_MQ_URL || 'amqp://admin:admin@localhost:5672';
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: TEST_DATA_QUEUE,
        queueOptions: {
          durable: false,
        },
      },
    });

    await app.startAllMicroservices();
    await app.init();

    const scheduleRegistry = app.get(SchedulerRegistry);
    scheduleRegistry.deleteInterval('telemetry_emit_interval');

    service = app.get(ProducerService);
    receiver = app.get(TestConsumer);

    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  afterAll(async () => {
    await app.close();
  });

  const emitData = async (data?: TelemetryDataEmittedSchema) => {
    const emitObservable = service.produceTelemetryData(TEST_DATA_QUEUE, data);
    const emitPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Emit timeout')), 3000);
      emitObservable.subscribe({
        next: () => {
          console.log('Emit completed successfully');
          clearTimeout(timeout);
          resolve();
        },
        error: (err) => {
          console.error('Emit error:', err);
          clearTimeout(timeout);
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(err);
        },
      });
    });
    await emitPromise;
    console.log('Waiting for receiver to get message...');
  };

  it('emits a valid telemetry event to RabbitMQ', async () => {
    await emitData();
    const payload = await Promise.race([
      receiver.received,
      new Promise<TelemetryDataEmittedSchema>((_, reject) =>
        setTimeout(
          () => reject(new Error('Test timeout: no message received after 3s')),
          3000,
        ),
      ),
    ]);

    console.log('Received payload:', payload);

    expect(payload).toHaveProperty('deviceId');
    expect(typeof payload.deviceId).toBe('string');
    expect(payload).toHaveProperty('timestamp');
    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');
    expect(typeof payload.temperature).toBe('number');
    expect(typeof payload.humidity).toBe('number');
  });
});
