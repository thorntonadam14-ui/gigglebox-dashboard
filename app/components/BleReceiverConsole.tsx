"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import InstallPrompt from "./InstallPrompt";

type LogLevel = "info" | "success" | "warn" | "error";

type LogEntry = {
  ts: string;
  level: LogLevel;
  message: string;
};

type TelemetryEnvelope = {
  deviceId?: string;
  eventType?: string;
  payload?: unknown;
};

type BleConfig = {
  deviceNamePrefix: string;
  serviceUuid: string;
  notifyCharacteristicUuid: string;
  writeCharacteristicUuid: string;
};

const STORAGE_KEY = "gigglebox.ble.config";
const DEFAULTS: BleConfig = {
  deviceNamePrefix: "GiggleBox",
  serviceUuid: "19b10010-e8f2-537e-4f6c-d104768a1214",
  notifyCharacteristicUuid: "19b10011-e8f2-537e-4f6c-d104768a1214",
  writeCharacteristicUuid: "19b10012-e8f2-537e-4f6c-d104768a1214"
};

const shell: React.CSSProperties = {
  padding: 32,
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gap: 20,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 20,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
};

function nowStamp() {
  return new Date().toLocaleTimeString();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normaliseTelemetryMessages(parsed: unknown, raw: string): TelemetryEnvelope[] {
  if (!parsed || typeof parsed !== "object") return [];

  const maybe = parsed as Record<string, unknown>;

  if (Array.isArray(maybe.events)) {
    return maybe.events
      .map((event) => {
        if (!event || typeof event !== "object") return null;
        const record = event as Record<string, unknown>;
        return {
          deviceId: typeof record.deviceId === "string" ? record.deviceId : typeof maybe.deviceId === "string" ? (maybe.deviceId as string) : "",
          eventType: typeof record.eventType === "string" ? record.eventType : typeof record.type === "string" ? (record.type as string) : "",
          payload: record.payload ?? record
        };
      })
      .filter(Boolean) as TelemetryEnvelope[];
  }

  if (typeof maybe.deviceId === "string" && typeof maybe.eventType === "string") {
    return [{ deviceId: maybe.deviceId, eventType: maybe.eventType, payload: maybe.payload ?? {} }];
  }

  if (typeof maybe.type === "string" && maybe.type === "EVENT_BATCH" && Array.isArray(maybe.payload)) {
    return (maybe.payload as unknown[])
      .map((event) => {
        if (!event || typeof event !== "object") return null;
        const record = event as Record<string, unknown>;
        return {
          deviceId: typeof record.deviceId === "string" ? record.deviceId : typeof maybe.deviceId === "string" ? (maybe.deviceId as string) : "",
          eventType: typeof record.eventType === "string" ? record.eventType : "",
          payload: record.payload ?? record
        };
      })
      .filter(Boolean) as TelemetryEnvelope[];
  }

  if (typeof maybe.type === "string" && raw.includes("child_id")) {
    return [{ deviceId: typeof maybe.deviceId === "string" ? maybe.deviceId : "", eventType: maybe.type, payload: maybe }];
  }

  return [];
}

export default function BleReceiverConsole() {
  const [config, setConfig] = useState<BleConfig>(DEFAULTS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectedName, setConnectedName] = useState<string>("");
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [relayTelemetry, setRelayTelemetry] = useState(true);
  const [lastPacket, setLastPacket] = useState<string>("");
  const [sendText, setSendText] = useState('{"type":"HELLO","source":"pwa"}');
  const [relayDeviceIdOverride, setRelayDeviceIdOverride] = useState("");

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const notifyCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const writeCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const textBufferRef = useRef("");

  const summary = useMemo(() => {
    const incoming = logs.filter((entry) => entry.message.startsWith("RX ")).length;
    const relayed = logs.filter((entry) => entry.message.includes("Relayed telemetry")).length;
    return { incoming, relayed };
  }, [logs]);

  function pushLog(level: LogLevel, message: string) {
    setLogs((current) => [{ ts: nowStamp(), level, message }, ...current].slice(0, 120));
  }

  useEffect(() => {
    setIsSupported(typeof navigator !== "undefined" && "bluetooth" in navigator);
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = safeJsonParse(raw);
    if (parsed && typeof parsed === "object") {
      setConfig({ ...DEFAULTS, ...(parsed as Partial<BleConfig>) });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  async function relayOneTelemetry(envelope: TelemetryEnvelope) {
    const deviceId = relayDeviceIdOverride.trim() || envelope.deviceId || "";
    const eventType = envelope.eventType || "";
    if (!deviceId || !eventType) {
      pushLog("warn", `Skipped relay: missing deviceId/eventType for ${JSON.stringify(envelope)}`);
      return;
    }

    const response = await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, eventType, payload: envelope.payload ?? {} })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.ok) {
      throw new Error(json.error || `Telemetry relay failed (${response.status})`);
    }
    pushLog("success", `Relayed telemetry -> ${eventType}`);
  }

  async function handleIncomingText(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setLastPacket(new Date().toLocaleString());
    pushLog("info", `RX ${trimmed}`);

    const parsed = safeJsonParse(trimmed);
    const envelopes = normaliseTelemetryMessages(parsed, trimmed);

    if (relayTelemetry && envelopes.length > 0) {
      for (const envelope of envelopes) {
        await relayOneTelemetry(envelope);
      }
    }
  }

  function onCharacteristicValueChanged(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic | null;
    const value = target?.value;
    if (!value) return;

    const text = new TextDecoder().decode(value.buffer);
    textBufferRef.current += text;

    const chunks = textBufferRef.current.split("\n");
    textBufferRef.current = chunks.pop() ?? "";

    void (async () => {
      for (const chunk of chunks) {
        try {
          await handleIncomingText(chunk);
        } catch (error) {
          pushLog("error", error instanceof Error ? error.message : "Failed to handle BLE payload");
        }
      }

      const maybeJson = textBufferRef.current.trim();
      if (maybeJson.endsWith("}")) {
        textBufferRef.current = "";
        try {
          await handleIncomingText(maybeJson);
        } catch (error) {
          pushLog("error", error instanceof Error ? error.message : "Failed to handle BLE payload");
        }
      }
    })();
  }

  async function connectBle() {
    if (!isSupported) {
      pushLog("error", "Web Bluetooth is not available in this browser.");
      return;
    }

    setIsConnecting(true);
    try {
      pushLog("info", "Opening Bluetooth device picker…");
      const device = await navigator.bluetooth.requestDevice({
        filters: config.deviceNamePrefix.trim()
          ? [{ namePrefix: config.deviceNamePrefix.trim() }]
          : undefined,
        acceptAllDevices: !config.deviceNamePrefix.trim(),
        optionalServices: [config.serviceUuid.trim()]
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setConnectedName("");
        pushLog("warn", "BLE device disconnected.");
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Failed to connect to GATT server.");
      serverRef.current = server;

      const service = await server.getPrimaryService(config.serviceUuid.trim());
      const notifyCharacteristic = await service.getCharacteristic(config.notifyCharacteristicUuid.trim());
      await notifyCharacteristic.startNotifications();
      notifyCharacteristic.addEventListener("characteristicvaluechanged", onCharacteristicValueChanged);
      notifyCharacteristicRef.current = notifyCharacteristic;

      let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
      try {
        writeCharacteristic = await service.getCharacteristic(config.writeCharacteristicUuid.trim());
        writeCharacteristicRef.current = writeCharacteristic;
      } catch {
        pushLog("warn", "Write characteristic not available yet. Receiver mode only.");
      }

      setConnectedName(device.name || "GiggleBox device");
      setIsConnected(true);
      pushLog("success", `Connected to ${device.name || "device"}`);

      if (writeCharacteristic) {
        await sendPacket('{"type":"HELLO","source":"pwa","client":"dashboard"}', false);
      }
    } catch (error) {
      pushLog("error", error instanceof Error ? error.message : "BLE connect failed.");
      setIsConnected(false);
      setConnectedName("");
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnectBle() {
    try {
      notifyCharacteristicRef.current?.removeEventListener("characteristicvaluechanged", onCharacteristicValueChanged);
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    } finally {
      deviceRef.current = null;
      serverRef.current = null;
      notifyCharacteristicRef.current = null;
      writeCharacteristicRef.current = null;
      setIsConnected(false);
      setConnectedName("");
      pushLog("info", "Disconnected BLE session.");
    }
  }

  async function sendPacket(packet: string, useStateValue = true) {
    const text = useStateValue ? sendText : packet;
    const writeCharacteristic = writeCharacteristicRef.current;
    if (!writeCharacteristic) {
      pushLog("warn", "No write characteristic available yet.");
      return;
    }

    const payload = `${text.trim()}\n`;
    await writeCharacteristic.writeValue(new TextEncoder().encode(payload));
    pushLog("success", `TX ${text.trim()}`);
  }

  return (
    <div style={shell}>
      <div>
        <div style={{ color: "#7c3aed", fontWeight: 700, marginBottom: 8 }}>Step 2 · Parent PWA BLE Receiver</div>
        <h1 style={{ margin: 0, fontSize: 40 }}>Bluetooth Console</h1>
        <p style={{ marginTop: 10, color: "#667085", maxWidth: 820 }}>
          This page turns the dashboard PWA into the parent-side Bluetooth central. It can connect to the toy,
          listen for notify packets, and optionally relay recognised telemetry envelopes into the existing dashboard API.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "underline" }}>Home</a>
          <a href="/setup" style={{ textDecoration: "underline" }}>Setup</a>
          <a href="/dashboard" style={{ textDecoration: "underline" }}>Dashboard</a>
          <InstallPrompt />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Connection</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6 }}>Device name prefix</div>
              <input value={config.deviceNamePrefix} onChange={(e) => setConfig((current) => ({ ...current, deviceNamePrefix: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd" }} />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>BLE service UUID</div>
              <input value={config.serviceUuid} onChange={(e) => setConfig((current) => ({ ...current, serviceUuid: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd", fontFamily: "monospace" }} />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Notify characteristic UUID</div>
              <input value={config.notifyCharacteristicUuid} onChange={(e) => setConfig((current) => ({ ...current, notifyCharacteristicUuid: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd", fontFamily: "monospace" }} />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Write characteristic UUID</div>
              <input value={config.writeCharacteristicUuid} onChange={(e) => setConfig((current) => ({ ...current, writeCharacteristicUuid: e.target.value }))} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd", fontFamily: "monospace" }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <button onClick={() => void connectBle()} disabled={isConnecting || !isSupported} style={{ padding: "12px 16px", borderRadius: 10 }}>
              {isConnecting ? "Connecting…" : isConnected ? "Reconnect" : "Connect BLE"}
            </button>
            <button onClick={() => void disconnectBle()} disabled={!isConnected} style={{ padding: "12px 16px", borderRadius: 10 }}>
              Disconnect
            </button>
          </div>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "#f8fafc", display: "grid", gap: 8 }}>
            <div><strong>Web Bluetooth support:</strong> {isSupported ? "Yes" : "No"}</div>
            <div><strong>Connected device:</strong> {connectedName || "Not connected"}</div>
            <div><strong>Last packet:</strong> {lastPacket || "None yet"}</div>
            <div><strong>Incoming packets:</strong> {summary.incoming}</div>
            <div><strong>Relayed to API:</strong> {summary.relayed}</div>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Relay + Commands</h2>
          <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <input type="checkbox" checked={relayTelemetry} onChange={(e) => setRelayTelemetry(e.target.checked)} />
            <span>Relay recognised telemetry payloads into <code>/api/telemetry</code></span>
          </label>
          <label>
            <div style={{ marginBottom: 6 }}>Override deviceId for relay (optional)</div>
            <input value={relayDeviceIdOverride} onChange={(e) => setRelayDeviceIdOverride(e.target.value)} placeholder="108f10f7-899a-4705-9284-ec1a923bc0a9" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd", fontFamily: "monospace" }} />
          </label>

          <label style={{ display: "grid", gap: 6, marginTop: 14 }}>
            <div>Write packet (future parent-to-toy commands)</div>
            <textarea value={sendText} onChange={(e) => setSendText(e.target.value)} rows={6} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d0d5dd", fontFamily: "monospace" }} />
          </label>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button onClick={() => void sendPacket(sendText)} disabled={!isConnected} style={{ padding: "12px 16px", borderRadius: 10 }}>
              Send packet
            </button>
            <button onClick={() => setSendText('{"type":"LINK_DEVICE","code":"000000"}')} style={{ padding: "12px 16px", borderRadius: 10 }}>
              Load LINK_DEVICE template
            </button>
          </div>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#faf5ff", color: "#5b21b6" }}>
            <strong>Important:</strong> if the toy-side UUIDs are changed later, update them here before connecting.
          </div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Live BLE Log</h2>
        {logs.length === 0 ? (
          <p style={{ color: "#667085" }}>No BLE activity yet. Connect to the toy to begin.</p>
        ) : (
          <div style={{ display: "grid", gap: 8, maxHeight: 480, overflow: "auto" }}>
            {logs.map((entry, index) => (
              <div key={`${entry.ts}-${index}`} style={{ padding: 10, borderRadius: 10, background: entry.level === "error" ? "#fff1f2" : entry.level === "warn" ? "#fffbeb" : entry.level === "success" ? "#ecfdf3" : "#f8fafc", border: "1px solid #e5e7eb", fontFamily: "monospace", fontSize: 13 }}>
                <strong>[{entry.ts}]</strong> {entry.message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Test order</h2>
        <ol style={{ marginTop: 0, paddingLeft: 18 }}>
          <li>Install this dashboard as a PWA on the phone.</li>
          <li>Open <strong>Bluetooth Console</strong> in Chrome/Edge on HTTPS.</li>
          <li>Tap <strong>Connect BLE</strong> and select the GiggleBox toy.</li>
          <li>Confirm notify packets appear in the live log.</li>
          <li>With relay enabled, verify recognised telemetry hits the existing dashboard API path.</li>
        </ol>
      </div>
    </div>
  );
}
