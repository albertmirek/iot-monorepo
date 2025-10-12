import { Injectable, Logger } from '@nestjs/common';

export interface TelemetryPayload {
  deviceId: string;
  createdAt: string;
  temperature: number;
  humidity: number;
  [key: string]: any;
}

@Injectable()
export class TelemetryStoreService {
  private readonly dataStore = new Map<string, TelemetryPayload[]>();
  private readonly logger = new Logger(TelemetryStoreService.name);

  public addRecord(payload: TelemetryPayload) {
    const arrForDevice = this.dataStore.get(payload.deviceId);
    const lastRecord = arrForDevice?.at(-1);
    if (lastRecord && lastRecord.createdAt > payload.createdAt) {
      this.logger.warn(
        `Input for deviceId: ${payload.deviceId} is older that latest record in store`,
      );
      return;
    }

    this.dataStore.set(
      payload.deviceId,
      arrForDevice ? [...arrForDevice, payload] : [payload],
    );
  }

  public gatherDataFromStore(
    deviceId: string | undefined,
    from: string | undefined,
    to: string | undefined,
  ): TelemetryPayload[] {
    let data: TelemetryPayload[] = this.getData(deviceId) ?? [];

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
