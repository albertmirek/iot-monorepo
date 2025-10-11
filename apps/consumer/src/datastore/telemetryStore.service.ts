import { Injectable, Logger } from '@nestjs/common';

interface TelemetryPayload {
  createdAt: string;
  temperature: number;
  humidity: number;
  [key: string]: any;
}

@Injectable()
export class TelemetryStoreService {
  private readonly dataStore = new Map<string, TelemetryPayload[]>();
  private readonly logger = new Logger(TelemetryStoreService.name);

  public addRecord(deviceId: string, payload: TelemetryPayload) {
    const arrForDevice = this.dataStore.get(deviceId);
    const lastRecord = arrForDevice?.at(-1);
    if (lastRecord && lastRecord.createdAt > payload.createdAt) {
      this.logger.warn(
        `Input for deviceId: ${deviceId} is older that latest record in store`,
      );
      return;
    }
    this.dataStore.set(
      deviceId,
      arrForDevice ? [...arrForDevice, payload] : [payload],
    );
  }

  public getForDevice(deviceId: string) {
    return this.dataStore.get(deviceId);
  }
}
