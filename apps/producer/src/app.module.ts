import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProducerService } from './producer.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      {
        //TODO - config
        // imports: [ConfigModule]
        name: 'PRODUCER_CLIENT_PROXY',
        useFactory: () => {
          const url = process.env.RABBIT_MQ_URL;
          const queue = process.env.TELEMETRY_QUEUE;
          if (!url) {
            throw new Error('Rabbit url is not set');
          } else if (!queue) {
            throw new Error('Telemetry queue is not set');
          }
          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue: queue,
            },
          };
        },
        // inject: [ConfigService]
      },
    ]),
  ],
  controllers: [],
  providers: [ProducerService],
})
export class AppModule {}
