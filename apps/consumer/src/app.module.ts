import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatastoreModule } from './datastore/datastore.module';
import { ConsumerModule } from './consumer/consumer.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'CONSUMER_SERVICE',
        useFactory: () => {
          const url = process.env.RABBIT_MQ_URL;
          if (!url) {
            throw new Error('Rabbit url is not set');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue: 'telemetry_data_emitted',
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
