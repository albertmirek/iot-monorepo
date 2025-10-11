import {z} from "zod";

export const telemetryDataEmitted = z.object({
    deviceId: z.string().uuid(),
    timestamp: z.string().datetime(),
    temperature: z.number().min(20).max(30),
    humidity: z.number().min(0.3).max(0.6),
});

export type TelemetryDataEmittedSchema = z.infer<typeof telemetryDataEmitted>
