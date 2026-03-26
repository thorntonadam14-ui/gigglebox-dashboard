export type DashboardOverviewResponse = {
  child: {
    id: string;
    name: string;
    age: number | null;
    nickname: string | null;
    avatarKey: string | null;
  };
  device: {
    linked: boolean;
    serialNumber: string | null;
    deviceName: string | null;
    status: string | null;
    lastSeenAt: string | null;
  };
  summary: {
    eventCount: number;
    lastActiveAt: string | null;
    openAlerts: number;
  };
  recentEvents: Array<{
    id: string;
    event_type: string;
    occurred_at: string;
    payload: Record<string, unknown>;
  }>;
};
