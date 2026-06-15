/**
 * T015 [US1] — WebSocket Store (Pinia)
 *
 * Gestiona la conexión WebSocket hacia AWS API Gateway
 * y expone reactivamente los eventos de generación de materiales.
 * Contrato: specs/001-generacion-balotario-pdf/contracts/ws-notification.md
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WsNotificationPayload, WsCompletedPayload, WsFailedPayload } from '@/types/materials';

export const useWebSocketStore = defineStore('websocket', () => {
  // --- State ---
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const lastEvent = ref<WsNotificationPayload | null>(null);
  const notifications = ref<WsNotificationPayload[]>([]);
  const reconnectAttempts = ref(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 3000;

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Getters ---
  const completedJobs = computed(() =>
    notifications.value
      .filter((n): n is WsCompletedPayload => n.event === 'material.generation.completed')
      .map(n => n.data),
  );

  const failedJobs = computed(() =>
    notifications.value
      .filter((n): n is WsFailedPayload => n.event === 'material.generation.failed')
      .map(n => n.data),
  );

  const hasUnreadNotifications = computed(() => notifications.value.length > 0);

  // --- Actions ---

  /**
   * Establece una conexión persistente con AWS API Gateway WebSockets.
   * @param url - URL del endpoint WebSocket (wss://...)
   */
  function connect(url: string): void {
    if (socket.value?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      isConnected.value = true;
      reconnectAttempts.value = 0;
      console.info('[WS] Connected to', url);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const payload: WsNotificationPayload = JSON.parse(event.data);
        lastEvent.value = payload;
        notifications.value.push(payload);
        console.info('[WS] Event received:', payload.event, payload.data);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      isConnected.value = false;
      console.warn('[WS] Connection closed. Code:', event.code);
      scheduleReconnect(url);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    socket.value = ws;
  }

  function scheduleReconnect(url: string): void {
    if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WS] Max reconnect attempts reached. Giving up.');
      return;
    }
    reconnectAttempts.value++;
    reconnectTimer = setTimeout(() => {
      console.info(`[WS] Reconnecting (attempt ${reconnectAttempts.value})...`);
      connect(url);
    }, RECONNECT_DELAY_MS);
  }

  function disconnect(): void {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket.value?.close();
    socket.value = null;
    isConnected.value = false;
  }

  /** Marca una notificación como leída / consumida. */
  function acknowledgeNotification(jobId: string): void {
    notifications.value = notifications.value.filter(n => n.data.job_id !== jobId);
  }

  function clearAll(): void {
    notifications.value = [];
    lastEvent.value = null;
  }

  return {
    // State
    isConnected,
    lastEvent,
    notifications,
    reconnectAttempts,
    // Getters
    completedJobs,
    failedJobs,
    hasUnreadNotifications,
    // Actions
    connect,
    disconnect,
    acknowledgeNotification,
    clearAll,
  };
});
