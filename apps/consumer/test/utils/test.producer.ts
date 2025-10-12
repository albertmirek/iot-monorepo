import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TEST_CLIENTS_MODULE_CLIENT, TEST_DATA_QUEUE } from './consts';

@Injectable()
export class TestProducer {
  constructor(
    @Inject(TEST_CLIENTS_MODULE_CLIENT) private client: ClientProxy,
  ) {}

  emitData(data: unknown) {
    return this.client.emit(TEST_DATA_QUEUE, data);
  }
}
