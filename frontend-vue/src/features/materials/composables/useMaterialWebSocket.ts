import { watch, onUnmounted } from 'vue';
import { useWebSocketStore } from '@/stores/websocket.store';
import { useToast } from '#imports';

const WS_URL_KEY = 'VITE_WS_URL';

export function useMaterialWebSocket() {
  const wsStore = useWebSocketStore();
  const toast = useToast();

  function connect() {
    if (wsStore.isConnected) return;

    const wsUrl =
      import.meta.env[WS_URL_KEY] ||
      (import.meta.env.PUBLIC_WS_URL as string) ||
      '';

    if (!wsUrl) {
      console.warn(
        '[WS] No WebSocket URL configured. Set VITE_WS_URL or PUBLIC_WS_URL env var.',
      );
      return;
    }

    wsStore.connect(wsUrl);
  }

  function disconnect() {
    wsStore.disconnect();
  }

  const unwatch = watch(
    () => wsStore.lastEvent,
    (event) => {
      if (!event) return;

      if (event.event === 'material.generation.completed') {
        toast.add({
          title: 'Material generado',
          description: `El material ${event.data.material_request_id?.slice(0, 8)}... está listo para descargar.`,
          color: 'success',
          icon: 'i-heroicons-document-check',
        });
      } else if (event.event === 'material.generation.warnings') {
        toast.add({
          title: 'Material generado con advertencias',
          description: 'Hay slots vacíos en el material generado.',
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle',
        });
      } else if (event.event === 'material.generation.failed') {
        toast.add({
          title: 'Error de generación',
          description: event.data.error_message || 'Ocurrió un error al generar el material.',
          color: 'error',
          icon: 'i-heroicons-x-circle',
        });
      } else if (event.event === 'material.review.required') {
        toast.add({
          title: 'Revisión requerida',
          description: 'Un material requiere revisión manual antes de compilar.',
          color: 'warning',
          icon: 'i-heroicons-eye',
        });
      }
    },
  );

  onUnmounted(() => {
    unwatch();
  });

  return {
    connect,
    disconnect,
    isConnected: wsStore.isConnected,
    notifications: wsStore.notifications,
  };
}
