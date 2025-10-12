import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const url = process.env.RABBIT_MQ_URL;
  const queue = process.env.TELEMETRY_QUEUE;
  if (!url) {
    throw new Error('Rabbit url is not set');
  } else if (!queue) {
    throw new Error('Telemetry queue is not set');
  }

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue: queue,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
