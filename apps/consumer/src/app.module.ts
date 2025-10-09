import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConsumerService } from './consumer.service';

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
  ],
  controllers: [ConsumerService],
  providers: [],
})
export class AppModule {}
