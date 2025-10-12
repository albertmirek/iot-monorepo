import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { ClientProxy, Transport } from '@nestjs/microservices';
import { TelemetryStoreService } from '../src/datastore/telemetryStore.service';
import { TelemetryDataEmittedSchema } from '@albertmirek/node-lib';
import { TestProducer } from './utils/test.producer';
import { TEST_CLIENTS_MODULE_CLIENT, TEST_DATA_QUEUE } from './utils/consts';
import { TestModule } from './utils/test.module';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import * as request from 'supertest';
import { addDays, subtractDays } from './utils/date';

describe('Consumer (e2e)', () => {
  let app: INestApplication<App>;
  let producer: TestProducer;
  let datastore: TelemetryStoreService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const url =
      process.env.RABBIT_MQ_URL || 'amqp://admin:admin@localhost:5672';
    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: TEST_DATA_QUEUE,
        queueOptions: {
          durable: false,
        },
        // noAck: true
      },
    });

    await app.startAllMicroservices();
    await app.init();

    producer = app.get(TestProducer);
    datastore = app.get(TelemetryStoreService);

    const client = app.get<ClientProxy>(TEST_CLIENTS_MODULE_CLIENT);
    await client.connect();

    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  beforeEach(() => {
    datastore.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const getInputData = (): TelemetryDataEmittedSchema => {
    const deviceId: string = uuidv4();
    return {
      deviceId,
      timestamp: new Date().toISOString(),
      temperature: Math.floor(Math.random() * (30 - 20) + 20),
      humidity: Math.random() * (0.6 - 0.3) + 0.3,
    };
  };

  const emitDataAndWaitForConsumption = async (
    data: Partial<TelemetryDataEmittedSchema>,
  ) => {
    const emitObservable = emitData(data);
    await waitForConsumptionOfEmitedData(emitObservable);
  };

  const emitData = (data: Partial<TelemetryDataEmittedSchema>) => {
    const emitObservable = producer.emitData(data);
    return emitObservable;
  };

  const waitForConsumptionOfEmitedData = async (
    emitObservable: Observable<any>,
  ) => {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Emit timeout')), 3000);
      emitObservable.subscribe({
        next: () => {
          clearTimeout(timeout);
          resolve();
        },
        error: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  it('Should not store data - temperature out of range', async () => {
    const invalidData = {
      ...getInputData(),
      temperature: 1000, // Max is 30
    };

    await emitDataAndWaitForConsumption(invalidData);

    const storedData = datastore.gatherDataFromStore(
      undefined,
      undefined,
      undefined,
    );

    expect(storedData.length).toEqual(0);
  });

  it('Should not store data - missing required field', async () => {
    const invalidData = {
      timestamp: new Date().toISOString(),
      temperature: 25,
      humidity: 0.5,
      // missing deviceId
    };

    await emitDataAndWaitForConsumption(invalidData);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const storedData = datastore.gatherDataFromStore(
      undefined,
      undefined,
      undefined,
    );

    expect(storedData.length).toEqual(0);
  });

  it('Should store emitted data', async () => {
    const validData = getInputData();
    await emitDataAndWaitForConsumption(validData);
    const storedData = datastore.gatherDataFromStore(
      undefined,
      undefined,
      undefined,
    );

    expect(storedData.length).toEqual(1);
    expect(storedData[0].deviceId).toEqual(validData.deviceId);
    expect(storedData[0].temperature).toEqual(validData.temperature);
    expect(storedData[0].humidity).toEqual(validData.humidity);
    expect(storedData[0].createdAt).toEqual(validData.timestamp);
  });

  it('Should store multiple emitted data', async () => {
    const validDataD1 = getInputData();
    emitData(validDataD1);

    const validData2D1 = getInputData();
    emitData({
      ...validData2D1,
      deviceId: validDataD1.deviceId,
    });

    const validData2 = getInputData();
    emitData(validData2);

    const validData3 = getInputData();
    emitData(validData3);

    const validData4 = getInputData();
    const lastObservable = emitData(validData4);

    await waitForConsumptionOfEmitedData(lastObservable);

    const storedDataAll = datastore.gatherDataFromStore(
      undefined,
      undefined,
      undefined,
    );

    expect(storedDataAll.length).toEqual(5);
  });

  describe('query based on filters', () => {});

  it('Should skip data with older datetime than already stored', async () => {
    const now = new Date();

    const validData = getInputData();
    emitData({ ...validData, timestamp: now.toISOString() }); //store

    const oneMinuteAgoNow = new Date(now.getTime() - 60 * 1000);
    emitData({ ...validData, timestamp: oneMinuteAgoNow.toISOString() }); //no store

    emitData({ ...validData, timestamp: now.toISOString() }); //store

    const now2 = new Date();
    const lastObservable = emitData({
      ...validData,
      timestamp: now2.toISOString(),
    }); //store
    await waitForConsumptionOfEmitedData(lastObservable);

    const storedDataAll = datastore.gatherDataFromStore(
      validData.deviceId,
      undefined,
      undefined,
    );
    expect(storedDataAll.length).toEqual(3);
    expect(storedDataAll[0].createdAt).toEqual(now.toISOString());
    expect(storedDataAll[1].createdAt).toEqual(now.toISOString());
    expect(storedDataAll[2].createdAt).toEqual(now2.toISOString());
  });

  it('Should return data through REST endpoint', async () => {
    const validDataD1 = getInputData();
    emitData(validDataD1);

    const validData2D1 = getInputData();
    emitData({
      ...validData2D1,
      deviceId: validDataD1.deviceId,
    });

    const validData2 = getInputData();
    emitData(validData2);

    const validData3 = getInputData();
    emitData(validData3);

    const validData4 = getInputData();
    const lastObservable = emitData(validData4);

    await waitForConsumptionOfEmitedData(lastObservable);

    const res = await request(app.getHttpServer())
      .get('/telemetry')
      .expect(200);

    expect(res.body).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.length).toEqual(5);

    const resForDevice1 = await request(app.getHttpServer())
      .get(`/telemetry?deviceId=${validDataD1.deviceId}`)

      .expect(200);
    expect(resForDevice1.body).toBeDefined();
    expect(resForDevice1.body.length).toEqual(2);

    const resForDevice2 = await request(app.getHttpServer())
      .get(`/telemetry?deviceId=${validData2.deviceId}`)

      .expect(200);
    expect(resForDevice2.body).toBeDefined();
    expect(resForDevice2.body.length).toEqual(1);
  });

  it('Should return data through REST endpoint filtered by date', async () => {
    const now = new Date();

    const nowPlusOneDay = new Date(addDays(now, 1)).toISOString();
    const nowPlusTwoDays = new Date(addDays(now, 2)).toISOString();
    const nowPlusThreeDays = new Date(addDays(now, 3)).toISOString();

    const nowMinusOneDay = new Date(subtractDays(now, 1)).toISOString();
    const nowMinusTwoDays = new Date(subtractDays(now, 2)).toISOString();
    const nowMinusThreeDays = new Date(subtractDays(now, 3)).toISOString();

    // Emit data in chronological order (oldest first) to avoid rejection by datastore
    const validData = getInputData();
    emitData({ ...validData, timestamp: nowMinusThreeDays });
    emitData({ ...validData, timestamp: nowMinusTwoDays });
    emitData({ ...validData, timestamp: nowMinusOneDay });

    emitData({ ...validData, timestamp: now.toISOString() });

    emitData({ ...validData, timestamp: nowPlusOneDay });
    emitData({ ...validData, timestamp: nowPlusTwoDays });
    const lastObservable = emitData({
      ...validData,
      timestamp: nowPlusThreeDays,
    });

    await waitForConsumptionOfEmitedData(lastObservable);
    const wholeStore = datastore.gatherDataFromStore(
      undefined,
      undefined,
      undefined,
    );
    expect(wholeStore.length).toEqual(7);

    // Test filtering: get data up to "now" (should include 4 records: -3, -2, -1 days, and now)
    const resUpToNow = await request(app.getHttpServer())
      .get('/telemetry')
      .query({ to: now.toISOString() })
      .expect(200);

    expect(resUpToNow.body).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(resUpToNow.body.length).toEqual(4);
    expect(resUpToNow.body[0].createdAt).toEqual(nowMinusThreeDays);
    expect(resUpToNow.body[1].createdAt).toEqual(nowMinusTwoDays);
    expect(resUpToNow.body[2].createdAt).toEqual(nowMinusOneDay);
    expect(resUpToNow.body[3].createdAt).toEqual(now.toISOString());

    // Test filtering: get data from "now" onwards (should include 4 records: now, +1, +2, +3 days)
    const resFromNow = await request(app.getHttpServer())
      .get('/telemetry')
      .query({ from: now.toISOString() })
      .expect(200);

    expect(resFromNow.body).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(resFromNow.body.length).toEqual(4);
    expect(resFromNow.body[0].createdAt).toEqual(now.toISOString());
    expect(resFromNow.body[1].createdAt).toEqual(nowPlusOneDay);
    expect(resFromNow.body[2].createdAt).toEqual(nowPlusTwoDays);
    expect(resFromNow.body[3].createdAt).toEqual(nowPlusThreeDays);
  });

  it('Should return sorted data for multiple devices with date filtering', async () => {
    const now = new Date();

    const nowMinusThreeDays = subtractDays(now, 3).toISOString();
    const nowMinusTwoDays = subtractDays(now, 2).toISOString();
    const nowMinusOneDay = subtractDays(now, 1).toISOString();
    const nowIso = now.toISOString();
    const nowPlusOneDay = addDays(now, 1).toISOString();

    // Create two devices with interleaved timestamps
    const device1 = getInputData();
    const device2 = getInputData();

    // Device 1: -3, -1, +1 days
    emitData({ ...device1, timestamp: nowMinusThreeDays });
    emitData({ ...device1, timestamp: nowMinusOneDay });
    emitData({ ...device1, timestamp: nowPlusOneDay });

    // Device 2: -2, now days
    emitData({ ...device2, timestamp: nowMinusTwoDays });
    const lastObservable = emitData({ ...device2, timestamp: nowIso });

    await waitForConsumptionOfEmitedData(lastObservable);

    // Query all devices - data should be sorted chronologically
    const allData = await request(app.getHttpServer())
      .get('/telemetry')
      .expect(200);

    expect(allData.body).toBeDefined();
    expect(allData.body.length).toEqual(5);
    
    // Verify data is sorted chronologically across all devices
    expect(allData.body[0].createdAt).toEqual(nowMinusThreeDays);
    expect(allData.body[0].deviceId).toEqual(device1.deviceId);
    expect(allData.body[1].createdAt).toEqual(nowMinusTwoDays);
    expect(allData.body[1].deviceId).toEqual(device2.deviceId);
    expect(allData.body[2].createdAt).toEqual(nowMinusOneDay);
    expect(allData.body[2].deviceId).toEqual(device1.deviceId);
    expect(allData.body[3].createdAt).toEqual(nowIso);
    expect(allData.body[3].deviceId).toEqual(device2.deviceId);
    expect(allData.body[4].createdAt).toEqual(nowPlusOneDay);
    expect(allData.body[4].deviceId).toEqual(device1.deviceId);

    // Test filtering: get data up to "now-1" (should include both devices, sorted)
    const resUpToMinusOne = await request(app.getHttpServer())
      .get('/telemetry')
      .query({ to: nowMinusOneDay })
      .expect(200);

    expect(resUpToMinusOne.body.length).toEqual(3);
    expect(resUpToMinusOne.body[0].createdAt).toEqual(nowMinusThreeDays);
    expect(resUpToMinusOne.body[1].createdAt).toEqual(nowMinusTwoDays);
    expect(resUpToMinusOne.body[2].createdAt).toEqual(nowMinusOneDay);

    // Test filtering: get data from "now-1" onwards (should include both devices, sorted)
    const resFromMinusOne = await request(app.getHttpServer())
      .get('/telemetry')
      .query({ from: nowMinusOneDay })
      .expect(200);

    expect(resFromMinusOne.body.length).toEqual(3);
    expect(resFromMinusOne.body[0].createdAt).toEqual(nowMinusOneDay);
    expect(resFromMinusOne.body[0].deviceId).toEqual(device1.deviceId);
    expect(resFromMinusOne.body[1].createdAt).toEqual(nowIso);
    expect(resFromMinusOne.body[1].deviceId).toEqual(device2.deviceId);
    expect(resFromMinusOne.body[2].createdAt).toEqual(nowPlusOneDay);
    expect(resFromMinusOne.body[2].deviceId).toEqual(device1.deviceId);

    // Test filtering: date range across both devices
    const resRange = await request(app.getHttpServer())
      .get('/telemetry')
      .query({ from: nowMinusTwoDays, to: nowIso })
      .expect(200);

    expect(resRange.body.length).toEqual(3);
    expect(resRange.body[0].createdAt).toEqual(nowMinusTwoDays);
    expect(resRange.body[1].createdAt).toEqual(nowMinusOneDay);
    expect(resRange.body[2].createdAt).toEqual(nowIso);
  });
});
