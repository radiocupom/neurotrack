"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type RealtimeCallbacks = {
  onDashboardUpdate: () => void;
  onBigFiveRespostaRegistrada: () => void;
  onOpiniaoRespostaRegistrada?: () => void;
};

export type RealtimeCounts = {
  bigfive: number;
  senso: number;
  opiniao: number;
};

export type RealtimeState = {
  isConnected: boolean;
  counts: RealtimeCounts;
};

export function useDashboardRealtime({ onDashboardUpdate, onBigFiveRespostaRegistrada, onOpiniaoRespostaRegistrada }: RealtimeCallbacks): RealtimeState {
  const [isConnected, setIsConnected] = useState(false);
  const [counts, setCounts] = useState<RealtimeCounts>({ bigfive: 0, senso: 0, opiniao: 0 });

  // Refs estáveis para não reconectar quando o componente pai re-renderiza.
  const updateRef = useRef(onDashboardUpdate);
  const bigFiveRef = useRef(onBigFiveRespostaRegistrada);
  const opiniaoRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => { updateRef.current = onDashboardUpdate; }, [onDashboardUpdate]);
  useEffect(() => { bigFiveRef.current = onBigFiveRespostaRegistrada; }, [onBigFiveRespostaRegistrada]);
  useEffect(() => { opiniaoRef.current = onOpiniaoRespostaRegistrada; }, [onOpiniaoRespostaRegistrada]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_SOCKET_URL;

    // ── handlers de window event (dev local / testes) ──────────────────
    const handleWindowEvent = (event: Event) => {
      const type = (event as CustomEvent<{ event?: string }>).detail?.event ?? event.type;

      if (type === "dashboard:bigfive:resposta-registrada") {
        bigFiveRef.current();
        setCounts((prev) => ({ ...prev, bigfive: prev.bigfive + 1 }));
        return;
      }

      if (type === "dashboard:opiniao:resposta-registrada") {
        opiniaoRef.current?.();
        setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
        return;
      }

      updateRef.current();
      setCounts((prev) => ({ ...prev, senso: prev.senso + 1 }));
    };

    window.addEventListener("dashboard:update", handleWindowEvent as EventListener);
    window.addEventListener("dashboard:bigfive:resposta-registrada", handleWindowEvent as EventListener);
    window.addEventListener("dashboard:opiniao:resposta-registrada", handleWindowEvent as EventListener);

    if (!socketUrl) {
      return () => {
        window.removeEventListener("dashboard:update", handleWindowEvent as EventListener);
        window.removeEventListener("dashboard:bigfive:resposta-registrada", handleWindowEvent as EventListener);
        window.removeEventListener("dashboard:opiniao:resposta-registrada", handleWindowEvent as EventListener);
      };
    }

    // ── Socket.io ──────────────────────────────────────────────────────
    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("connect_error", () => setIsConnected(false));

    socket.on("dashboard:bigfive:resposta-registrada", () => {
      bigFiveRef.current();
      setCounts((prev) => ({ ...prev, bigfive: prev.bigfive + 1 }));
    });

    socket.on("dashboard:opiniao:resposta-registrada", () => {
      opiniaoRef.current?.();
      setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
    });

    socket.on("dashboard:update", (data?: { module?: string }) => {
      updateRef.current();
      if (data?.module === "senso-populacional") {
        setCounts((prev) => ({ ...prev, senso: prev.senso + 1 }));
      }
      if (data?.module === "opiniao") {
        setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
      }
    });

    return () => {
      window.removeEventListener("dashboard:update", handleWindowEvent as EventListener);
      window.removeEventListener("dashboard:bigfive:resposta-registrada", handleWindowEvent as EventListener);
      window.removeEventListener("dashboard:opiniao:resposta-registrada", handleWindowEvent as EventListener);
      socket.disconnect();
    };
  }, []); // deps vazias — callbacks são lidos via ref

  return { isConnected, counts };
}
