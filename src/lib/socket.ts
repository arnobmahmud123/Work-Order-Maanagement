// Socket.io client-side helper for real-time features
// Uses polling as fallback since Next.js App Router doesn't easily support custom servers

type EventCallback = (data: any) => void;

class NetworkSocket {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastCheck: Date = new Date();

  // Subscribe to events
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // Start polling for updates (fallback for real-time)
  startPolling(intervalMs = 10000) {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkForUpdates() {
    try {
      const res = await fetch(`/api/network/notifications?unread=true&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.unreadCount > 0) {
          this.emit("notifications", data.notifications);
          this.emit("unread_count", data.unreadCount);
        }
      }
    } catch {
      // Silently fail
    }
  }
}

export const networkSocket = new NetworkSocket();
