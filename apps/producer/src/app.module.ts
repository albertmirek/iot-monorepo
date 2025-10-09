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
        name: 'PRODUCER_SERVICE',
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
        // inject: [ConfigService]
      },
    ]),
  ],
  controllers: [],
  providers: [ProducerService],
})
export class AppModule {}
