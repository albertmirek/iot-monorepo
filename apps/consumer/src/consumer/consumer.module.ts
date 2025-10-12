import { Module } from '@nestjs/common';
import { createConsumerControllerFactory } from './consumer.controller';
import { DatastoreModule } from '../datastore/datastore.module';

@Module({
  imports: [DatastoreModule],
  controllers: [createConsumerControllerFactory(process.env.TELEMETRY_QUEUE)],
})
export class ConsumerModule {}
