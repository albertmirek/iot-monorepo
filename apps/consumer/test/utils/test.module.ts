import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TEST_CLIENTS_MODULE_CLIENT, TEST_DATA_QUEUE } from './consts';
import { TestProducer } from './test.producer';
import { DatastoreModule } from '../../src/datastore/datastore.module';
import { createConsumerControllerFactory } from '../../src/consumer/consumer.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: TEST_CLIENTS_MODULE_CLIENT,
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
    DatastoreModule,
  ],

  controllers: [createConsumerControllerFactory(TEST_DATA_QUEUE)],
  providers: [TestProducer],
})
export class TestModule {}
