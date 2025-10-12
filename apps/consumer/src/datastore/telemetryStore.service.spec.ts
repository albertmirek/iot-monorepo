import {
  TelemetryPayload,
  TelemetryStoreService,
} from './telemetryStore.service';
import { v4 as uuidv4 } from 'uuid';
import { addDays, subtractDays } from '../../test/utils/date';

describe('TelemetryStoreService', () => {
  let datastore: TelemetryStoreService;

  beforeEach(() => {
    datastore = new TelemetryStoreService();
    datastore.clear();
  });

  const generateData = (data?: Partial<TelemetryPayload>): TelemetryPayload => {
    const deviceId: string = uuidv4();
    return {
      deviceId,
      createdAt: new Date().toISOString(),
      temperature: Math.floor(Math.random() * (30 - 20) + 20),
      humidity: Math.random() * (0.6 - 0.3) + 0.3,
      ...data,
    };
  };

  describe('addRecord', () => {
    it('should add a single record', () => {
      const data = generateData();
      datastore.addRecord(data);

      const result = datastore.gatherDataFromStore(
        data.deviceId,
        undefined,
        undefined,
      );
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual(data);
    });

    it('should add multiple records for the same device', () => {
      const now = new Date();
      const deviceId = uuidv4();

      const data1 = generateData({
        deviceId,
        createdAt: subtractDays(now, 2).toISOString(),
      });
      const data2 = generateData({
        deviceId,
        createdAt: subtractDays(now, 1).toISOString(),
      });
      const data3 = generateData({
        deviceId,
        createdAt: now.toISOString(),
      });

      datastore.addRecord(data1);
      datastore.addRecord(data2);
      datastore.addRecord(data3);

      const result = datastore.gatherDataFromStore(
        deviceId,
        undefined,
        undefined,
      );
      expect(result.length).toEqual(3);
      expect(result[0].createdAt).toEqual(data1.createdAt);
      expect(result[1].createdAt).toEqual(data2.createdAt);
      expect(result[2].createdAt).toEqual(data3.createdAt);
    });

    it('should add records for multiple devices', () => {
      const device1 = uuidv4();
      const device2 = uuidv4();

      datastore.addRecord(generateData({ deviceId: device1 }));
      datastore.addRecord(generateData({ deviceId: device1 }));
      datastore.addRecord(generateData({ deviceId: device2 }));

      const allData = datastore.gatherDataFromStore(
        undefined,
        undefined,
        undefined,
      );
      expect(allData.length).toEqual(3);
    });

    it('should reject records older than the last record for the same device', () => {
      const now = new Date();
      const deviceId = uuidv4();

      const newerData = generateData({
        deviceId,
        createdAt: now.toISOString(),
      });
      const olderData = generateData({
        deviceId,
        createdAt: subtractDays(now, 1).toISOString(),
      });

      datastore.addRecord(newerData);
      datastore.addRecord(olderData); // Should be rejected

      const result = datastore.gatherDataFromStore(
        deviceId,
        undefined,
        undefined,
      );
      expect(result.length).toEqual(1);
      expect(result[0].createdAt).toEqual(newerData.createdAt);
    });
  });

  describe('gatherDataFromStore', () => {
    let now: Date;
    let nowMinusThreeDays: string;
    let nowMinusTwoDays: string;
    let nowMinusOneDay: string;
    let nowIso: string;
    let nowPlusOneDay: string;

    beforeEach(() => {
      // Set up test data with two devices using relative dates
      now = new Date();
      nowMinusThreeDays = subtractDays(now, 3).toISOString();
      nowMinusTwoDays = subtractDays(now, 2).toISOString();
      nowMinusOneDay = subtractDays(now, 1).toISOString();
      nowIso = now.toISOString();
      nowPlusOneDay = addDays(now, 1).toISOString();

      const device1 = 'device-1';
      const device2 = 'device-2';

      datastore.addRecord(
        generateData({
          deviceId: device1,
          createdAt: nowMinusThreeDays,
        }),
      );
      datastore.addRecord(
        generateData({
          deviceId: device1,
          createdAt: nowMinusTwoDays,
        }),
      );
      datastore.addRecord(
        generateData({
          deviceId: device1,
          createdAt: nowMinusOneDay,
        }),
      );
      datastore.addRecord(
        generateData({
          deviceId: device2,
          createdAt: nowMinusTwoDays,
        }),
      );
      datastore.addRecord(
        generateData({
          deviceId: device2,
          createdAt: nowPlusOneDay,
        }),
      );
    });

    it('should return all data when no filters applied', () => {
      const result = datastore.gatherDataFromStore(
        undefined,
        undefined,
        undefined,
      );
      expect(result.length).toEqual(5);
    });

    it('should filter by deviceId', () => {
      const result = datastore.gatherDataFromStore(
        'device-1',
        undefined,
        undefined,
      );
      expect(result.length).toEqual(3);
      expect(result.every((r) => r.deviceId === 'device-1')).toBe(true);
    });

    it('should filter by from date', () => {
      const result = datastore.gatherDataFromStore(
        undefined,
        nowMinusTwoDays,
        undefined,
      );
      // device-1: now-2, now-1
      // device-2: now-2, now+1
      expect(result.length).toEqual(4);
      expect(result.every((r) => r.createdAt >= nowMinusTwoDays)).toBe(true);
    });

    it('should filter by to date', () => {
      const result = datastore.gatherDataFromStore(
        undefined,
        undefined,
        nowMinusTwoDays,
      );
      // device-1: now-3, now-2
      // device-2: now-2
      expect(result.length).toEqual(3);
      expect(result.every((r) => r.createdAt <= nowMinusTwoDays)).toBe(true);
    });

    it('should filter by date range (from and to)', () => {
      const result = datastore.gatherDataFromStore(
        undefined,
        nowMinusTwoDays,
        nowMinusOneDay,
      );
      // device-1: now-2, now-1
      // device-2: now-2
      expect(result.length).toEqual(3);
      expect(
        result.every(
          (r) =>
            r.createdAt >= nowMinusTwoDays && r.createdAt <= nowMinusOneDay,
        ),
      ).toBe(true);
    });

    it('should filter by deviceId and date range', () => {
      const result = datastore.gatherDataFromStore(
        'device-1',
        nowMinusTwoDays,
        nowMinusOneDay,
      );
      expect(result.length).toEqual(2);
      expect(result.every((r) => r.deviceId === 'device-1')).toBe(true);
      expect(result[0].createdAt).toEqual(nowMinusTwoDays);
      expect(result[1].createdAt).toEqual(nowMinusOneDay);
    });
  });

  describe('clear', () => {
    it('should clear all data from the store', () => {
      datastore.addRecord(generateData());
      datastore.addRecord(generateData());
      datastore.addRecord(generateData());

      datastore.clear();

      const result = datastore.gatherDataFromStore(
        undefined,
        undefined,
        undefined,
      );
      expect(result.length).toEqual(0);
    });
  });
});
