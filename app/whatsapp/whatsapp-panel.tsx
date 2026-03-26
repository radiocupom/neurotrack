"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  LogOut,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Smile,
  Video,
} from "lucide-react";
import { CacheManager } from "@/lib/cache/cache-manager";
import { getBrowserCache, removeBrowserCache, setBrowserCache } from "@/lib/cache/browser-cache";
import { cn } from "@/lib/utils";
import {
  enviarMensagemTextoWhatsAppAction,
  conectarInstanciaWhatsAppAction,
  desconectarInstanciaWhatsAppAction,
  listarPesquisasPublicasWhatsAppAction,
  obterInboxWhatsAppAction,
  obterStatusInstanciaWhatsAppAction,
} from "@/app/whatsapp/whatsapp-actions";

type ApiInboxMensagem = {
  id: string;
  contatoId: string;
  telefone?: string;
  nome: string;
  avatar: string | null;
  fotoPerfil?: string | null;
  texto: string;
  tipo: "recebida" | "enviada";
  enviadoPorMim?: boolean;
  hora: string;
};

type ApiInboxChat = {
  contatoId: string;
  telefone: string;
  nome: string;
  avatar: string | null;
  fotoPerfil: string | null;
  ultimaMensagem: string;
  ultimaMensagemHora: string;
  ultimaMensagemTipo: "recebida" | "enviada";
  mensagens: ApiInboxMensagem[];
  totalMensagens: number;
  isGrupo: boolean;
};

type PesquisaPublica = {
  id: string;
  tipo: "INTENCAO" | "OPINIAO" | "SENSO";
  titulo: string;
  urlPublica: string;
  ativo: boolean;
};

const DEFAULT_CONTACT_PREVIEW = "Toque para abrir a conversa";
const CHATS_POLLING_MS = 20_000;
const INSTANCE_STATUS_POLLING_MS = 8_000;
const WHATSAPP_STATUS_CACHE_TTL_MS = 30 * 1000;
const WHATSAPP_INBOX_CACHE_TTL_MS = 2 * 60 * 1000;
const WHATSAPP_PESQUISAS_CACHE_TTL_MS = 10 * 60 * 1000;
const WHATSAPP_UI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const WHATSAPP_STATUS_CACHE_KEY = CacheManager.generateKey("whatsapp", "panel", "instance-status");
const WHATSAPP_INBOX_CACHE_KEY = CacheManager.generateKey("whatsapp", "panel", "inbox");
const WHATSAPP_PESQUISAS_CACHE_KEY = CacheManager.generateKey("whatsapp", "panel", "pesquisas-publicas");
const WHATSAPP_UI_CACHE_KEY = CacheManager.generateKey("whatsapp", "panel", "ui-state");

type Contact = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  avatarUrl: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  typing?: boolean;
};

type Message = {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
};

type WhatsAppPanelUiCache = {
  activeContactId: string | null;
  selectedPesquisaId: string;
  searchQuery: string;
};

type WhatsAppPanelInboxCache = {
  instanceConnected: boolean;
  chats: Contact[];
  messagesByContact: Record<string, Message[]>;
  activeContactId: string | null;
};

type WhatsAppPanelStatusCache = {
  instanceConnected: boolean | null;
  instanceId: string | null;
  qrCode: string | null;
};

function getInitials(value: string) {
  const clean = value.trim();

  if (!clean) {
    return "--";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : (parts[0]?.[1] ?? "");

  return `${first}${second}`.toUpperCase() || clean.slice(0, 2).toUpperCase();
}

function formatIsoTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatIsoDateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function mapInboxChatToContact(chat: ApiInboxChat): Contact {
  return {
    id: chat.contatoId,
    name: chat.nome || chat.telefone || chat.contatoId,
    phone: chat.telefone || chat.contatoId,
    avatar: getInitials(chat.nome || chat.telefone || chat.contatoId),
    avatarUrl: chat.fotoPerfil || chat.avatar || null,
    lastMessage: chat.ultimaMensagem || DEFAULT_CONTACT_PREVIEW,
    time: formatIsoDateTimeLabel(chat.ultimaMensagemHora),
    unread: 0,
    online: false,
  };
}

function mapHistoricoToMessages(raw: ApiInboxMensagem[]): Message[] {
  return [...raw]
    .sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime())
    .map((item) => ({
      id: item.id,
      contactId: item.contatoId,
      text: item.texto,
      time: formatIsoTimeLabel(item.hora),
      fromMe: item.enviadoPorMim ?? item.tipo === "enviada",
      status: item.tipo === "enviada" ? "delivered" : "read",
    }));
}

function mapInboxToMessagesByContact(chats: ApiInboxChat[]) {
  return chats.reduce<Record<string, Message[]>>((accumulator, chat) => {
    accumulator[chat.contatoId] = mapHistoricoToMessages(chat.mensagens ?? []);
    return accumulator;
  }, {});
}

async function uploadWhatsAppMedia(path: string, formData: FormData) {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok && payload?.ok !== false,
    status: typeof payload?.status === "number" ? payload.status : response.status,
    message: typeof payload?.message === "string" ? payload.message : "Falha ao enviar midia.",
  };
}

// ── Sub-components ─────────────────────────────────────────────────────

function MessageStatus({ status }: { status: Message["status"] }) {
  if (status === "sent") return <Check className="size-3.5 text-slate-400" />;
  if (status === "delivered") return <CheckCheck className="size-3.5 text-slate-400" />;
  return <CheckCheck className="size-3.5 text-cyan-400" />;
}

function Avatar({
  initials,
  src,
  online,
  size = "md",
}: {
  initials: string;
  src?: string | null;
  online?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="relative shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          className={cn(
            "rounded-full object-cover",
            size === "sm" ? "size-10" : "size-12",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 font-bold text-white",
            size === "sm" ? "size-10 text-xs" : "size-12 text-sm",
          )}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-slate-900 bg-emerald-400",
            size === "sm" ? "size-2.5" : "size-3",
          )}
        />
      )}
    </div>
  );
}

// ── Contact list ───────────────────────────────────────────────────────

function ContactList({
  contacts,
  activeId,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  contacts: Contact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone.includes(searchQuery.replace(/\D/g, "")),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-base font-bold text-white">Conversas</h2>
        <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
          <MoreVertical className="size-5" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <Search className="size-4 shrink-0 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar ou começar nova conversa"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            type="button"
            onClick={() => onSelect(contact.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors",
              activeId === contact.id
                ? "bg-cyan-400/10"
                : "hover:bg-white/5",
            )}
          >
            <Avatar initials={contact.avatar} src={contact.avatarUrl} online={contact.online} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-semibold text-white">{contact.name}</span>
                <span
                  className={cn(
                    "shrink-0 text-[11px]",
                    contact.unread > 0 ? "text-cyan-400" : "text-slate-500",
                  )}
                >
                  {contact.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="truncate text-xs text-slate-400">
                  {contact.typing ? (
                    <span className="text-cyan-400">digitando...</span>
                  ) : (
                    `${contact.phone} • ${contact.lastMessage}`
                  )}
                </p>
                {contact.unread > 0 && (
                  <span className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white">
                    {contact.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat view ──────────────────────────────────────────────────────────

function ChatView({
  contact,
  messages,
  loading,
  sending,
  recording,
  pesquisas,
  selectedPesquisaId,
  onBack,
  onSend,
  onFileSelected,
  onToggleRecording,
  onPesquisaChange,
  onSendPesquisa,
}: {
  contact: Contact;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  recording: boolean;
  pesquisas: PesquisaPublica[];
  selectedPesquisaId: string;
  onBack: () => void;
  onSend: (text: string) => void;
  onFileSelected: (file: File) => void;
  onToggleRecording: () => void;
  onPesquisaChange: (value: string) => void;
  onSendPesquisa: () => void;
}) {
  const [inputText, setInputText] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedPesquisa = pesquisas.find((item) => item.id === selectedPesquisaId);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInputText("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Avatar initials={contact.avatar} src={contact.avatarUrl} online={contact.online} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{contact.name}</p>
          <p className="truncate text-[11px] text-slate-400">{contact.phone}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <Video className="size-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <Phone className="size-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <Search className="size-4" />
          </button>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03),transparent_70%)] px-4 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          {/* Date separator */}
          <div className="my-2 flex justify-center">
            <span className="rounded-lg bg-white/10 px-3 py-1 text-[11px] text-slate-400">
              Hoje
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-xs text-slate-400">
              Nenhuma mensagem encontrada para este contato.
            </div>
          ) : null}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "relative max-w-[80%] rounded-2xl px-3 py-2 text-sm sm:max-w-[65%]",
                  msg.fromMe
                    ? "rounded-br-md bg-cyan-600/20 text-white"
                    : "rounded-bl-md bg-white/10 text-slate-100",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1",
                    msg.fromMe ? "justify-end" : "justify-start",
                  )}
                >
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                  {msg.fromMe && <MessageStatus status={msg.status} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-white/10 px-3 py-2.5 sm:px-4">
        <div className="mb-2 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2 sm:flex-row sm:items-center">
          <select
            value={selectedPesquisaId}
            onChange={(event) => onPesquisaChange(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">Selecionar pesquisa publica para enviar</option>
            {pesquisas.map((pesquisa) => (
              <option key={pesquisa.id} value={pesquisa.id}>
                {pesquisa.tipo} - {pesquisa.titulo}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!selectedPesquisaId || sending}
            onClick={onSendPesquisa}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar pesquisa
          </button>
          {selectedPesquisa?.urlPublica ? (
            <a
              href={selectedPesquisa.urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              Abrir URL publica
            </a>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <button type="button" className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white">
            <Smile className="size-5" />
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Paperclip className="size-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) {
                onFileSelected(nextFile);
              }

              event.currentTarget.value = "";
            }}
          />
          <div className="flex min-h-[40px] flex-1 items-center rounded-xl bg-white/5 px-3">
            <input
              type="text"
              placeholder="Mensagem"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          {inputText.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="shrink-0 rounded-full bg-cyan-500 p-2.5 text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleRecording}
              disabled={sending}
              className={cn(
                "shrink-0 rounded-full p-2.5 text-white transition disabled:cursor-not-allowed disabled:opacity-60",
                recording ? "bg-rose-500 hover:bg-rose-400" : "bg-cyan-500 hover:bg-cyan-400",
              )}
            >
              {recording ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            </button>
          )}
        </div>
        {recording ? (
          <p className="mt-2 text-[11px] text-rose-300">Gravando audio... toque novamente no microfone para enviar.</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────

function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/5">
        <Send className="size-8 text-cyan-400/60" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">NeuroTrack WhatsApp</h3>
        <p className="mt-1 text-sm text-slate-400">
          Selecione uma conversa para começar a interagir com sua equipe de campo.
        </p>
      </div>
      <p className="text-xs text-slate-500">
        Mensagens criptografadas de ponta a ponta
      </p>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────

export function WhatsAppPanel() {
  const [chats, setChats] = useState<Contact[]>([]);
  const [messagesByContact, setMessagesByContact] = useState<Record<string, Message[]>>({});
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingConnect, setLoadingConnect] = useState(false);
  const [loadingDisconnect, setLoadingDisconnect] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [instanceConnected, setInstanceConnected] = useState<boolean | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [pesquisasPublicas, setPesquisasPublicas] = useState<PesquisaPublica[]>([]);
  const [selectedPesquisaId, setSelectedPesquisaId] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const cachedStatus = getBrowserCache<WhatsAppPanelStatusCache>(WHATSAPP_STATUS_CACHE_KEY);
    if (cachedStatus) {
      setInstanceConnected(cachedStatus.instanceConnected);
      setInstanceId(cachedStatus.instanceId);
      setQrCode(cachedStatus.qrCode);
    }

    const cachedInbox = getBrowserCache<WhatsAppPanelInboxCache>(WHATSAPP_INBOX_CACHE_KEY);
    if (cachedInbox) {
      setChats(Array.isArray(cachedInbox.chats) ? cachedInbox.chats : []);
      setMessagesByContact(cachedInbox.messagesByContact ?? {});
      setActiveContactId(cachedInbox.activeContactId ?? null);
      setInstanceConnected((current) => current ?? cachedInbox.instanceConnected);
    }

    const cachedPesquisas = getBrowserCache<PesquisaPublica[]>(WHATSAPP_PESQUISAS_CACHE_KEY);
    if (Array.isArray(cachedPesquisas)) {
      setPesquisasPublicas(cachedPesquisas);
    }

    const cachedUi = getBrowserCache<WhatsAppPanelUiCache>(WHATSAPP_UI_CACHE_KEY);
    if (cachedUi) {
      setSearchQuery(cachedUi.searchQuery ?? "");
      setSelectedPesquisaId(cachedUi.selectedPesquisaId ?? "");
      setActiveContactId((current) => current ?? cachedUi.activeContactId ?? null);
    }
  }, []);

  useEffect(() => {
    setBrowserCache(WHATSAPP_STATUS_CACHE_KEY, {
      instanceConnected,
      instanceId,
      qrCode,
    }, { ttl: WHATSAPP_STATUS_CACHE_TTL_MS });
  }, [instanceConnected, instanceId, qrCode]);

  useEffect(() => {
    setBrowserCache(WHATSAPP_INBOX_CACHE_KEY, {
      instanceConnected: Boolean(instanceConnected),
      chats,
      messagesByContact,
      activeContactId,
    }, { ttl: WHATSAPP_INBOX_CACHE_TTL_MS });
  }, [activeContactId, chats, instanceConnected, messagesByContact]);

  useEffect(() => {
    setBrowserCache(WHATSAPP_PESQUISAS_CACHE_KEY, pesquisasPublicas, { ttl: WHATSAPP_PESQUISAS_CACHE_TTL_MS });
  }, [pesquisasPublicas]);

  useEffect(() => {
    setBrowserCache(WHATSAPP_UI_CACHE_KEY, {
      activeContactId,
      selectedPesquisaId,
      searchQuery,
    }, { ttl: WHATSAPP_UI_CACHE_TTL_MS });
  }, [activeContactId, searchQuery, selectedPesquisaId]);

  const appendLocalMessage = useCallback((contactId: string, text: string) => {
    const newMessage: Message = {
      id: `local-${Date.now()}`,
      contactId,
      text,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
      status: "delivered",
    };

    setMessagesByContact((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] ?? []), newMessage],
    }));

    setChats((prev) =>
      prev.map((item) =>
        item.id === contactId
          ? {
              ...item,
              lastMessage: text,
              time: newMessage.time,
            }
          : item,
      ),
    );
  }, []);

  const loadInstanceStatus = useCallback(async () => {
    try {
      const statusResult = await obterStatusInstanciaWhatsAppAction();
      if (!statusResult.ok || !statusResult.data) {
        return;
      }

      const connected = Boolean(statusResult.data.connected);
      setInstanceConnected(connected);
      setInstanceId(statusResult.data.instanceId ?? null);

      if (connected) {
        setQrCode(null);
      }
    } catch {
      // Mantem fluxo silencioso; erros de status nao devem bloquear a tela.
    }
  }, []);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);

    try {
      const result = await obterInboxWhatsAppAction({ perPage: 20, page: 1 });

      if (!result.ok || !result.data) {
        setErrorMessage(result.message || "Nao foi possivel carregar a inbox.");
        return;
      }

      const inbox = result.data;
      setErrorMessage("");
      setInstanceConnected(Boolean(inbox.instanceConnected));

      if (!inbox.instanceConnected) {
        setChats([]);
        setMessagesByContact({});
        setActiveContactId(null);
        removeBrowserCache(WHATSAPP_INBOX_CACHE_KEY);
        return;
      }

      const nextChats = inbox.chats.map((item) => mapInboxChatToContact(item as ApiInboxChat));
      const nextMessagesByContact = mapInboxToMessagesByContact(inbox.chats as ApiInboxChat[]);

      setChats(nextChats);
      setMessagesByContact(nextMessagesByContact);
      setActiveContactId((prev) => {
        if (inbox.chatSelecionado && nextChats.some((item) => item.id === inbox.chatSelecionado)) {
          return inbox.chatSelecionado;
        }

        if (prev && nextChats.some((item) => item.id === prev)) {
          return prev;
        }

        return nextChats[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar a inbox.");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const loadPesquisasPublicas = useCallback(async () => {
    try {
      const result = await listarPesquisasPublicasWhatsAppAction();

      if (!result.ok || !Array.isArray(result.data)) {
        setErrorMessage(result.message || "Nao foi possivel carregar pesquisas publicas.");
        return;
      }

      setPesquisasPublicas(result.data.filter((item): item is PesquisaPublica => Boolean(item?.id && item?.titulo && item?.urlPublica && item?.ativo)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar pesquisas publicas.");
    }
  }, []);

  useEffect(() => {
    void loadPesquisasPublicas();
  }, [loadPesquisasPublicas]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    void loadInstanceStatus();

    const intervalId = setInterval(() => {
      void loadInstanceStatus();
    }, INSTANCE_STATUS_POLLING_MS);

    return () => clearInterval(intervalId);
  }, [loadInstanceStatus]);

  useEffect(() => {
    if (instanceConnected !== true) {
      setChats([]);
      setMessagesByContact({});
      setActiveContactId(null);
      return;
    }

    void loadInbox();

    const intervalId = setInterval(() => {
      void loadInbox();
    }, CHATS_POLLING_MS);

    return () => clearInterval(intervalId);
  }, [instanceConnected, loadInbox]);

  async function handleConnect() {
    setLoadingConnect(true);
    setStatusMessage("");

    try {
      const result = await conectarInstanciaWhatsAppAction({
        image: "enable",
      });

      if (!result.ok || !result.data) {
        setErrorMessage(result.message || "Nao foi possivel gerar o QR Code.");
        return;
      }

      if (result.data.error) {
        setErrorMessage("A API retornou erro ao gerar QR Code para a instancia.");
        setInstanceConnected(false);
        return;
      }

      setErrorMessage("");
      setInstanceId(result.data.instanceId ?? null);
      setQrCode(result.data.qrCode ?? null);

      const statusResult = await obterStatusInstanciaWhatsAppAction();
      const connected = Boolean(statusResult.ok && statusResult.data?.connected);
      setInstanceConnected(connected);
      if (connected) {
        setQrCode(null);
        await loadInbox();
      }

      if (connected) {
        setStatusMessage("Status: instancia conectada.");
      } else if (result.data.qrCode) {
        setStatusMessage("QR Code atualizado. Escaneie para conectar a instancia.");
      } else {
        setStatusMessage(
          "QR vazio e instancia segue desconectada. Verifique credenciais W-API (ID_INSTANCE_WPP/TOKEN_WPP) no backend.",
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao conectar instancia.");
      setInstanceConnected(false);
    } finally {
      setLoadingConnect(false);
    }
  }

  async function handleDisconnect() {
    setLoadingDisconnect(true);
    setStatusMessage("");

    try {
      const result = await desconectarInstanciaWhatsAppAction();

      if (!result.ok) {
        setErrorMessage(result.message || "Nao foi possivel desconectar a instancia.");
        return;
      }

      setErrorMessage("");
      setQrCode(null);
      setInstanceId(null);
      setInstanceConnected(false);
      setChats([]);
      setMessagesByContact({});
      setActiveContactId(null);
      removeBrowserCache(WHATSAPP_STATUS_CACHE_KEY);
      removeBrowserCache(WHATSAPP_INBOX_CACHE_KEY);
      setStatusMessage("Instancia desconectada com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao desconectar instancia.");
    } finally {
      setLoadingDisconnect(false);
    }
  }

  async function handleSendTextMessage(text: string) {
    if (!activeContactId) {
      setErrorMessage("Selecione um contato para enviar mensagem.");
      return;
    }

    setSendingMessage(true);

    try {
      const result = await enviarMensagemTextoWhatsAppAction({
        phone: activeContactId,
        message: text,
        delayMessage: 3,
      });

      if (!result.ok) {
        setErrorMessage(result.message || "Falha ao enviar mensagem de texto.");
        return;
      }

      setErrorMessage("");
      appendLocalMessage(activeContactId, text);
      setStatusMessage("Mensagem de texto enviada.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar mensagem de texto.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSendPesquisaPublica() {
    if (!activeContactId) {
      setErrorMessage("Selecione um contato para enviar pesquisa.");
      return;
    }

    const pesquisa = pesquisasPublicas.find((item) => item.id === selectedPesquisaId);
    if (!pesquisa) {
      setErrorMessage("Selecione uma pesquisa publica valida.");
      return;
    }

    const message = `Ola! Responda nossa pesquisa:\n*${pesquisa.titulo}*\n${pesquisa.urlPublica}`;

    setSendingMessage(true);

    try {
      const result = await enviarMensagemTextoWhatsAppAction({
        phone: activeContactId,
        message,
        delayMessage: 10,
      });

      if (!result.ok) {
        setErrorMessage(result.message || "Falha ao enviar pesquisa publica.");
        return;
      }

      setErrorMessage("");
      appendLocalMessage(activeContactId, message);
      setStatusMessage(`Pesquisa enviada: ${pesquisa.titulo}`);
      setSelectedPesquisaId("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar pesquisa publica.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSendFile(file: File) {
    if (!activeContactId) {
      setErrorMessage("Selecione um contato para enviar arquivo.");
      return;
    }

    setSendingMessage(true);

    try {
      const mime = (file.type || "").toLowerCase();
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");
      const isAudio = mime.startsWith("audio/");

      let result: { ok: boolean; message: string } | null = null;
      let feedback = "Arquivo enviado.";

      if (isImage) {
        const formData = new FormData();
        formData.append("phone", activeContactId);
        formData.append("image", file, file.name);
        formData.append("caption", file.name);
        formData.append("delayMessage", "3");
        result = await uploadWhatsAppMedia("/api/whatsapp/send-image", formData);
        feedback = `Imagem enviada: ${file.name}`;
      } else if (isVideo) {
        const formData = new FormData();
        formData.append("phone", activeContactId);
        formData.append("video", file, file.name);
        formData.append("caption", file.name);
        formData.append("delayMessage", "3");
        result = await uploadWhatsAppMedia("/api/whatsapp/send-video", formData);
        feedback = `Video enviado: ${file.name}`;
      } else if (isAudio) {
        const formData = new FormData();
        formData.append("phone", activeContactId);
        formData.append("audio", file, file.name);
        formData.append("delayMessage", "3");
        result = await uploadWhatsAppMedia("/api/whatsapp/send-audio", formData);
        feedback = `Audio enviado: ${file.name}`;
      } else {
        const formData = new FormData();
        formData.append("phone", activeContactId);
        formData.append("document", file, file.name);
        formData.append("fileName", file.name);
        formData.append("caption", file.name);
        formData.append("delayMessage", "3");
        result = await uploadWhatsAppMedia("/api/whatsapp/send-document", formData);
        feedback = `Documento enviado: ${file.name}`;
      }

      if (!result.ok) {
        setErrorMessage(result.message || "Falha ao enviar arquivo.");
        return;
      }

      setErrorMessage("");
      setStatusMessage(feedback);
      appendLocalMessage(activeContactId, feedback);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar arquivo local.");
    } finally {
      setSendingMessage(false);
    }
  }

  async function stopAndSendRecordedAudio() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      return;
    }

    mediaRecorderRef.current.stop();
    setRecordingAudio(false);
  }

  async function startAudioRecording() {
    if (!activeContactId) {
      setErrorMessage("Selecione um contato para gravar audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        mediaChunksRef.current = [];

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        if (!audioBlob.size || !activeContactId) {
          return;
        }

        setSendingMessage(true);

        try {
          const formData = new FormData();
          formData.append("phone", activeContactId);
          formData.append("audio", audioBlob, "gravacao.webm");
          formData.append("delayMessage", "3");
          const result = await uploadWhatsAppMedia("/api/whatsapp/send-audio", formData);

          if (!result.ok) {
            setErrorMessage(result.message || "Falha ao enviar audio gravado.");
            return;
          }

          setErrorMessage("");
          setStatusMessage("Audio gravado e enviado.");
          appendLocalMessage(activeContactId, "Audio enviado");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar audio gravado.");
        } finally {
          setSendingMessage(false);
        }
      };

      recorder.start();
      setRecordingAudio(true);
      setErrorMessage("");
    } catch (error) {
      setRecordingAudio(false);
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel acessar o microfone.");
    }
  }

  function handleToggleRecording() {
    if (recordingAudio) {
      void stopAndSendRecordedAudio();
      return;
    }

    void startAudioRecording();
  }

  const activeContact = useMemo(
    () => chats.find((c) => c.id === activeContactId) ?? null,
    [activeContactId, chats],
  );

  const activeMessages = useMemo(
    () => (activeContactId ? (messagesByContact[activeContactId] ?? []) : []),
    [activeContactId, messagesByContact],
  );

  const loadingHistory = Boolean(activeContactId) && loadingInbox;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-black text-white">
              <span className="text-emerald-400">●</span> WhatsApp
            </h1>
            <p className="text-xs text-slate-400">Comunicacao com equipe de campo</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void (instanceConnected ? loadInbox() : loadInstanceStatus())}
              disabled={loadingInbox}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("size-4", loadingInbox ? "animate-spin" : "")} />
              Atualizar chats
            </button>

            <button
              type="button"
              onClick={handleConnect}
              disabled={loadingConnect}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingConnect ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
              Gerar QR
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loadingDisconnect}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-400/35 bg-rose-400/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingDisconnect ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Desconectar
            </button>
          </div>
        </div>

        {instanceId ? (
          <p className="mt-3 text-[11px] text-slate-400">Instancia: {instanceId}</p>
        ) : null}

        {instanceConnected != null ? (
          <p className={cn(
            "mt-2 text-[11px]",
            instanceConnected ? "text-emerald-300" : "text-amber-300",
          )}>
            Status: {instanceConnected ? "Conectada" : "Nao conectada"}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
            {statusMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
            {errorMessage}
          </p>
        ) : null}

        {qrCode && !instanceConnected ? (
          <div className="mt-3 inline-flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <p className="text-[11px] font-semibold text-slate-300">Escaneie o QR Code para autenticar:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code de conexao do WhatsApp" className="size-48 rounded-lg bg-white p-2" />
          </div>
        ) : null}
      </div>

      {/* Chat area – responsive split */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-b-2xl border-x border-b border-white/10 bg-slate-900/50">
        {/* Contact list: always visible on lg+, toggles on mobile */}
        <div
          className={cn(
            "w-full shrink-0 border-r border-white/10 lg:w-80 xl:w-96",
            activeContactId ? "hidden lg:flex lg:flex-col" : "flex flex-col",
          )}
        >
          <ContactList
            contacts={chats}
            activeId={activeContactId}
            onSelect={(id) => {
              setActiveContactId(id);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Chat or empty state */}
        <div
          className={cn(
            "min-w-0 flex-1",
            !activeContactId ? "hidden lg:flex" : "flex",
          )}
        >
          {activeContact ? (
            <div className="flex w-full flex-col">
              <ChatView
                contact={activeContact}
                messages={activeMessages}
                loading={loadingHistory}
                sending={sendingMessage}
                recording={recordingAudio}
                pesquisas={pesquisasPublicas}
                selectedPesquisaId={selectedPesquisaId}
                onBack={() => setActiveContactId(null)}
                onSend={handleSendTextMessage}
                onFileSelected={handleSendFile}
                onToggleRecording={handleToggleRecording}
                onPesquisaChange={setSelectedPesquisaId}
                onSendPesquisa={handleSendPesquisaPublica}
              />
            </div>
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </div>
  );
}
