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
    <div className="gb-page">
      <header className="gb-nav">
        <div className="gb-container gb-nav-inner">
          <a className="gb-brand" href="/">
            <img className="gb-logo" src="/gigglebox-logo.png" alt="GiggleBox" />
            <span><span className="gb-brand-kicker">Toy Connection</span><span className="gb-brand-title">Talk to Toy</span></span>
          </a>
          <nav className="gb-nav-links">
            <a className="gb-nav-link" href="/">Home</a>
            <a className="gb-nav-link" href="/dashboard">Dashboard</a>
            <InstallPrompt />
          </nav>
          <a className="gb-studio-mark" href="/" aria-label="Giggle Byte Studios">
            <img src="/gigglebyte-studios-logo.png" alt="Giggle Byte Studios" />
          </a>
        </div>
      </header>

      <main className="gb-main">
        <div className="gb-container gb-grid">
          <section className="gb-hero">
            <div>
              <div className="gb-eyebrow">Parent PWA BLE Receiver</div>
              <h1 className="gb-title-sm">Connect the website directly to the toy.</h1>
              <p className="gb-lede">
                This is the working Bluetooth console wrapped in a parent-friendly interface. It still connects to the toy, listens for notify packets, and relays recognised telemetry into the existing dashboard API.
              </p>
              <div className="gb-actions">
                <button className="gb-button" onClick={() => void connectBle()} disabled={isConnecting || !isSupported}>{isConnecting ? "Connecting…" : isConnected ? "Reconnect Toy" : "Connect Toy"}</button>
                <button className="gb-button-secondary" onClick={() => void disconnectBle()} disabled={!isConnected}>Disconnect</button>
              </div>
            </div>
            <aside className="gb-hero-panel">
              <div className="gb-orb">{isConnected ? "✓" : "BT"}</div>
              <h2>{isConnected ? "Toy connected" : "Ready to connect"}</h2>
              <p>{connectedName || "Use Chrome or Edge on HTTPS, then select the GiggleBox device from the Bluetooth picker."}</p>
              <div className="gb-actions"><span className="gb-pill">Incoming: {summary.incoming}</span><span className="gb-pill">Relayed: {summary.relayed}</span></div>
            </aside>
          </section>

          <section className="gb-grid gb-two">
            <div className="gb-card">
              <span className="gb-pill">Connection Settings</span>
              <h2>Bluetooth link</h2>
              <div className="gb-grid">
                <label className="gb-label">Device name prefix<input className="gb-input" value={config.deviceNamePrefix} onChange={(e) => setConfig((current) => ({ ...current, deviceNamePrefix: e.target.value }))} /></label>
                <label className="gb-label">BLE service UUID<input className="gb-input" value={config.serviceUuid} onChange={(e) => setConfig((current) => ({ ...current, serviceUuid: e.target.value }))} style={{ fontFamily: "monospace" }} /></label>
                <label className="gb-label">Notify characteristic UUID<input className="gb-input" value={config.notifyCharacteristicUuid} onChange={(e) => setConfig((current) => ({ ...current, notifyCharacteristicUuid: e.target.value }))} style={{ fontFamily: "monospace" }} /></label>
                <label className="gb-label">Write characteristic UUID<input className="gb-input" value={config.writeCharacteristicUuid} onChange={(e) => setConfig((current) => ({ ...current, writeCharacteristicUuid: e.target.value }))} style={{ fontFamily: "monospace" }} /></label>
              </div>
              <div className="gb-card" style={{ boxShadow: "none", marginTop: 18 }}>
                <p><strong>Web Bluetooth support:</strong> {isSupported ? "Yes" : "No"}</p>
                <p><strong>Connected device:</strong> {connectedName || "Not connected"}</p>
                <p><strong>Last packet:</strong> {lastPacket || "None yet"}</p>
                <p><strong>Incoming packets:</strong> {summary.incoming}</p>
                <p><strong>Relayed to API:</strong> {summary.relayed}</p>
              </div>
            </div>

            <div className="gb-card">
              <span className="gb-pill">Relay + Commands</span>
              <h2>Send and relay</h2>
              <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, fontWeight: 800, color: "var(--gb-ink)" }}>
                <input type="checkbox" checked={relayTelemetry} onChange={(e) => setRelayTelemetry(e.target.checked)} />
                <span>Relay recognised telemetry payloads into <code>/api/telemetry</code></span>
              </label>
              <label className="gb-label">Override deviceId for relay<input className="gb-input" value={relayDeviceIdOverride} onChange={(e) => setRelayDeviceIdOverride(e.target.value)} placeholder="108f10f7-899a-4705-9284-ec1a923bc0a9" style={{ fontFamily: "monospace" }} /></label>
              <label className="gb-label" style={{ marginTop: 14 }}>Write packet<textarea className="gb-textarea" value={sendText} onChange={(e) => setSendText(e.target.value)} rows={6} style={{ fontFamily: "monospace" }} /></label>
              <div className="gb-actions">
                <button className="gb-button" onClick={() => void sendPacket(sendText)} disabled={!isConnected}>Send packet</button>
                <button className="gb-button-secondary" onClick={() => setSendText('{"type":"LINK_DEVICE","code":"000000"}')}>Load LINK_DEVICE template</button>
              </div>
              <div className="gb-alert" style={{ marginTop: 18 }}><strong>Important:</strong> if the toy-side UUIDs are changed later, update them here before connecting.</div>
            </div>
          </section>

          <section className="gb-card">
            <span className="gb-pill">Live BLE Log</span>
            <h2>Messages from the toy</h2>
            {logs.length === 0 ? <p className="gb-muted">No BLE activity yet. Connect to the toy to begin.</p> : (
              <div className="gb-grid" style={{ maxHeight: 480, overflow: "auto" }}>
                {logs.map((entry, index) => (
                  <div key={`${entry.ts}-${index}`} className="gb-log" style={{ background: entry.level === "error" ? "#fff1f2" : entry.level === "warn" ? "#fffbeb" : entry.level === "success" ? "#ecfdf3" : "#f8fafc" }}>
                    <strong>[{entry.ts}]</strong> {entry.message}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="gb-card">
            <span className="gb-pill">Test order</span>
            <h2>Safe connection checklist</h2>
            <ol>
              <li>Install this dashboard as a PWA on the phone.</li>
              <li>Open <strong>Talk to Toy</strong> in Chrome/Edge on HTTPS.</li>
              <li>Tap <strong>Connect Toy</strong> and select the GiggleBox toy.</li>
              <li>Confirm notify packets appear in the live log.</li>
              <li>With relay enabled, verify recognised telemetry hits the existing dashboard API path.</li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}
