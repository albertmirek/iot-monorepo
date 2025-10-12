import { Injectable, Logger } from '@nestjs/common';

export interface TelemetryDataStoreRecord {
  deviceId: string;
  createdAt: string;
  temperature: number;
  humidity: number;
  [key: string]: any;
}

@Injectable()
export class TelemetryStoreService {
  private readonly dataStore = new Map<string, TelemetryDataStoreRecord[]>();
  private readonly logger = new Logger(TelemetryStoreService.name);

  public addRecord(payload: TelemetryDataStoreRecord) {
    const arrForDevice = this.dataStore.get(payload.deviceId);
    const lastRecord = arrForDevice?.at(-1);
    if (lastRecord && lastRecord.createdAt > payload.createdAt) {
      this.logger.warn(
        `Input for deviceId: ${payload.deviceId} is older that latest record in store`,
      );
      return;
    }

    this.logger.log(`Adding new data to store`);
    this.dataStore.set(
      payload.deviceId,
      arrForDevice ? [...arrForDevice, payload] : [payload],
    );
  }

  public gatherDataFromStore(
    deviceId: string | undefined,
    from: string | undefined,
    to: string | undefined,
  ): TelemetryDataStoreRecord[] {
    let data: TelemetryDataStoreRecord[] = this.getData(deviceId) ?? [];

    if (!deviceId && data.length > 0) {
      data = data.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    if (from) {
      const beginIndex = data.findIndex((_) => _.createdAt >= from);
      if (beginIndex !== -1) {
        data = data.slice(beginIndex);
      } else {
        data = [];
      }
    }

    if (to) {
      const endIndex = data.findIndex((_) => _.createdAt > to);
      if (endIndex !== -1) {
        data = data.slice(0, endIndex);
      }
    }

    return data;
  }

  public clear() {
    this.dataStore.clear();
    this.logger.log('Data store cleared');
  }

  private getData(deviceId?: string) {
    if (deviceId) {
      return this.dataStore.get(deviceId);
    }
    return Array.from(this.dataStore.values()).flat();
  }
}
