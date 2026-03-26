import { giggleboxEnv } from "@/lib/gigglebox/env";

export function assertDeviceApiKey(headerValue: string | null) {
  if (!headerValue || headerValue !== giggleboxEnv.deviceApiKey) {
    throw new Error("Invalid device API key.");
  }
}
