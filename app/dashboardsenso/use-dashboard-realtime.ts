"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// ── Socket singleton ──────────────────────────────────────────────────
// Um único socket compartilhado por todos os dashboards.
// Isso evita que o Strict Mode (que desmonta/remonta efeitos) destrua
// a conexão antes do handshake completar.

let sharedSocket: Socket | null = null;
let subscriberCount = 0;

function getSocketUrl() {
  const raw = (
    process.env.NEXT_PUBLIC_SOCKET_URL
    ?? process.env.NEXT_PUBLIC_DASHBOARD_SOCKET_URL
    ?? ""
  ).trim();

  if (!raw) return "http://localhost:3003";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function acquireSocket(): Socket {
  subscriberCount += 1;

  if (sharedSocket) return sharedSocket;

  const url = getSocketUrl();

  const authToken = typeof window !== "undefined"
    ? (window.localStorage.getItem("access_token") ?? window.localStorage.getItem("token") ?? "")
    : "";

  sharedSocket = io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    auth: { token: authToken },
  });

  return sharedSocket;
}

function releaseSocket() {
  subscriberCount -= 1;

  // Só desconecta se nenhum hook estiver inscrito
  if (subscriberCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    subscriberCount = 0;
  }
}

// ── Types ──────────────────────────────────────────────────────────────

type RealtimeCallbacks = {
  onDashboardUpdate: (module?: string) => void;
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

// ── Hook ───────────────────────────────────────────────────────────────

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
    const normalizeModule = (value?: string) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";

    // ── Window events (dev/testes) ──────────────────────────────────
    const handleWindowEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: string; module?: string }>).detail;
      const type = detail?.event ?? event.type;
      const module = normalizeModule(detail?.module);

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

      updateRef.current(module || undefined);

      if (module === "senso-populacional") {
        setCounts((prev) => ({ ...prev, senso: prev.senso + 1 }));
      }

      if (module === "opiniao") {
        setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
      }
    };

    window.addEventListener("dashboard:update", handleWindowEvent as EventListener);
    window.addEventListener("dashboard:bigfive:resposta-registrada", handleWindowEvent as EventListener);
    window.addEventListener("dashboard:opiniao:resposta-registrada", handleWindowEvent as EventListener);

    // ── Socket.io (singleton) ───────────────────────────────────────
    const socket = acquireSocket();

    // Sync estado inicial (socket pode já estar conectado de outro hook)
    if (socket.connected) setIsConnected(true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: Error) => {
      console.warn("[realtime] connect_error:", err.message);
      setIsConnected(false);
    };

    const onBigFive = () => {
      bigFiveRef.current();
      setCounts((prev) => ({ ...prev, bigfive: prev.bigfive + 1 }));
    };

    const onOpiniao = () => {
      opiniaoRef.current?.();
      setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
    };

    const onUpdate = (data?: { module?: string }) => {
      const module = normalizeModule(data?.module);
      updateRef.current(module || undefined);

      if (module === "senso-populacional") {
        setCounts((prev) => ({ ...prev, senso: prev.senso + 1 }));
      }

      if (module === "opiniao") {
        setCounts((prev) => ({ ...prev, opiniao: prev.opiniao + 1 }));
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("dashboard:bigfive:resposta-registrada", onBigFive);
    socket.on("dashboard:opiniao:resposta-registrada", onOpiniao);
    socket.on("dashboard:update", onUpdate);

    return () => {
      // Remove apenas OS LISTENERS deste hook — o socket não é destruído
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("dashboard:bigfive:resposta-registrada", onBigFive);
      socket.off("dashboard:opiniao:resposta-registrada", onOpiniao);
      socket.off("dashboard:update", onUpdate);

      window.removeEventListener("dashboard:update", handleWindowEvent as EventListener);
      window.removeEventListener("dashboard:bigfive:resposta-registrada", handleWindowEvent as EventListener);
      window.removeEventListener("dashboard:opiniao:resposta-registrada", handleWindowEvent as EventListener);

      // Libera a referencia; só desconecta de verdade quando nenhum hook usa
      releaseSocket();
      setIsConnected(false);
    };
  }, []); // deps vazias — callbacks são lidos via ref

  return { isConnected, counts };
}
