import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatastoreModule } from './datastore/datastore.module';
import { ConsumerModule } from './consumer/consumer.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'CONSUMER_CLIENT_PROXY',
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
      },
    ]),
    DatastoreModule,
    ConsumerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
