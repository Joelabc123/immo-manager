"use client";

import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

interface WebSocketMessage {
  type: string;
  data?: unknown;
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const utils = trpc.useUtils();

  const handleMessage = useCallback(
    (msg: WebSocketMessage) => {
      switch (msg.type) {
        case "email:new":
          void utils.email.list.invalidate();
          void utils.email.getUnreadCount.invalidate();
          break;
        case "notification:new":
          void utils.notifications.list.invalidate();
          void utils.notifications.getUnreadCount.invalidate();
          break;
        case "email:sync-complete":
          void utils.email.list.invalidate();
          void utils.email.getUnreadCount.invalidate();
          break;
        default:
          break;
      }
    },
    [utils],
  );

  useEffect(() => {
    function connect() {
      if (typeof window === "undefined") return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        `${protocol}//${window.location.hostname}:3002`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data as string);
          handleMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        if (event.code === 4001 || event.code === 4003) return;

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        // Error event is always followed by close
      };
    }

    connect();
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleMessage]);
}
