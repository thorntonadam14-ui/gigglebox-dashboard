export const giggleboxEnv = {
  pairingCodeTtlMinutes: Number(process.env.PAIRING_CODE_TTL_MINUTES ?? "10"),
  deviceApiKey: process.env.DEVICE_API_KEY || ""
};
