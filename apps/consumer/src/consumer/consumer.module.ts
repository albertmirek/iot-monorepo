import { Module } from '@nestjs/common';
import { ConsumerController } from './consumer.controller';
import { DatastoreModule } from '../datastore/datastore.module';

@Module({
  imports: [DatastoreModule],
  controllers: [ConsumerController],
})
export class ConsumerModule {}
