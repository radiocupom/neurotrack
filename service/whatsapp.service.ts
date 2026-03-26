import { CacheManager, cacheManager } from "@/lib/cache/cache-manager";
import { getExternalApiConfig } from "@/service/api";
import { ExternalApiError, externalApiRequest } from "@/service/api";

const WHATSAPP_BASE_PATH = "/whatsapp";
const DEFAULT_CHAT_PER_PAGE = 20;
const MAX_CHAT_PER_PAGE = 100;
const DEFAULT_CHAT_PAGE = 1;
const HISTORICO_CACHE_TTL_MS = 60 * 1000;

export type WhatsAppToggle = "enable" | "disable";

export type WhatsAppQrCodeQuery = {
  image?: WhatsAppToggle;
  syncContacts?: WhatsAppToggle;
};

export type WhatsAppQrCodeApiResponse = {
  error: boolean;
  instanceId: string;
  qrcode?: string | null;
  qrCode?: string | null;
};

export type WhatsAppQrCodeResponse = {
  error: boolean;
  instanceId: string;
  qrCode: string | null;
  qrcode: string | null;
};

export type WhatsAppDisconnectResponse = {
  error?: boolean;
  message?: string;
} & Record<string, unknown>;

export type WhatsAppInstanceStatusResponse = {
  connected: boolean;
  instanceId: string | null;
  status?: string | null;
  message?: string | null;
  error?: boolean;
} & Record<string, unknown>;

export type WhatsAppChat = {
  id: string;
  name: string;
  lastMessageTime: number;
};

export type WhatsAppMensagemTipo = "recebida" | "enviada";

export type WhatsAppMensagem = {
  id: string;
  contatoId: string;
  telefone?: string;
  nome: string;
  avatar: string | null;
  fotoPerfil?: string | null;
  texto: string;
  tipo: WhatsAppMensagemTipo;
  enviadoPorMim?: boolean;
  hora: string;
};

export type WhatsAppInboxChat = {
  contatoId: string;
  telefone: string;
  nome: string;
  avatar: string | null;
  fotoPerfil: string | null;
  ultimaMensagem: string;
  ultimaMensagemHora: string;
  ultimaMensagemTipo: WhatsAppMensagemTipo;
  mensagens: WhatsAppMensagem[];
  totalMensagens: number;
  isGrupo: boolean;
};

export type WhatsAppInboxResponse = {
  instanceConnected: boolean;
  page: number;
  perPage: number;
  messagesLimit: number;
  total: number;
  chats: WhatsAppInboxChat[];
  chatSelecionado: string | null;
};

export type WhatsAppSendResponse = Record<string, unknown>;

export type WhatsAppPesquisaPublica = {
  id: string;
  tipo: "INTENCAO" | "OPINIAO" | "SENSO";
  titulo: string;
  urlPublica: string;
  ativo: boolean;
};

export type WhatsAppSendTextPayload = {
  phone: string;
  message: string;
  delayMessage?: number;
};

export type WhatsAppSendImagePayload = {
  phone: string;
  // Para este projeto o envio deve ser base64 do arquivo local (nao URL remota).
  image: string;
  caption?: string;
  messageId?: string;
  delayMessage?: number;
};

export type WhatsAppSendAudioPayload = {
  phone: string;
  // Para este projeto o envio deve ser base64 do arquivo local/captura de microfone.
  audio: string;
  messageId?: string;
  delayMessage?: number;
};

export type WhatsAppSendVideoPayload = {
  phone: string;
  // Para este projeto o envio deve ser base64 do arquivo local (nao URL remota).
  video: string;
  caption?: string;
  messageId?: string;
  delayMessage?: number;
};

export type WhatsAppSendDocumentPayload = {
  phone: string;
  // Para este projeto o envio deve ser base64 do arquivo local (nao URL remota).
  document: string;
  extension: string;
  fileName?: string;
  caption?: string;
  messageId?: string;
  delayMessage?: number;
};

type ListarChatsParams = {
  perPage?: number;
  page?: number;
};

type HistoricoMensagensOptions = {
  ttl?: number;
  forceRefresh?: boolean;
};

function trimOrUndefined(value: string | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeDelay(value: number | undefined) {
  if (!Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.trunc(value as number);
  return normalized >= 0 ? normalized : undefined;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").trim();
}

function assertRequiredString(value: string | undefined, fieldName: string) {
  if (!value) {
    throw new ExternalApiError(`${fieldName} e obrigatorio para envio no WhatsApp.`, 400, {
      error: "Payload invalido para envio de mensagem.",
      issues: [{ path: [fieldName], message: `${fieldName} e obrigatorio.` }],
    });
  }

  return value;
}

function normalizeTextPayload(payload: WhatsAppSendTextPayload) {
  return {
    phone: assertRequiredString(normalizePhone(payload.phone), "phone"),
    message: assertRequiredString(trimOrUndefined(payload.message), "message"),
    delayMessage: normalizeDelay(payload.delayMessage),
  };
}

function normalizeImagePayload(payload: WhatsAppSendImagePayload) {
  return {
    phone: assertRequiredString(normalizePhone(payload.phone), "phone"),
    image: assertRequiredString(trimOrUndefined(payload.image), "image"),
    caption: trimOrUndefined(payload.caption),
    messageId: trimOrUndefined(payload.messageId),
    delayMessage: normalizeDelay(payload.delayMessage),
  };
}

function normalizeAudioPayload(payload: WhatsAppSendAudioPayload) {
  return {
    phone: assertRequiredString(normalizePhone(payload.phone), "phone"),
    audio: assertRequiredString(trimOrUndefined(payload.audio), "audio"),
    messageId: trimOrUndefined(payload.messageId),
    delayMessage: normalizeDelay(payload.delayMessage),
  };
}

function normalizeVideoPayload(payload: WhatsAppSendVideoPayload) {
  return {
    phone: assertRequiredString(normalizePhone(payload.phone), "phone"),
    video: assertRequiredString(trimOrUndefined(payload.video), "video"),
    caption: trimOrUndefined(payload.caption),
    messageId: trimOrUndefined(payload.messageId),
    delayMessage: normalizeDelay(payload.delayMessage),
  };
}

function normalizeDocumentPayload(payload: WhatsAppSendDocumentPayload) {
  return {
    phone: assertRequiredString(normalizePhone(payload.phone), "phone"),
    document: assertRequiredString(trimOrUndefined(payload.document), "document"),
    extension: assertRequiredString(trimOrUndefined(payload.extension), "extension"),
    fileName: trimOrUndefined(payload.fileName),
    caption: trimOrUndefined(payload.caption),
    messageId: trimOrUndefined(payload.messageId),
    delayMessage: normalizeDelay(payload.delayMessage),
  };
}

function clampPositiveInteger(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value as number);
  return normalized > 0 ? normalized : fallback;
}

function normalizeChatsPagination(params?: ListarChatsParams) {
  const perPage = clampPositiveInteger(params?.perPage, DEFAULT_CHAT_PER_PAGE);
  const page = clampPositiveInteger(params?.page, DEFAULT_CHAT_PAGE);

  return {
    perPage: Math.min(perPage, MAX_CHAT_PER_PAGE),
    page,
  };
}

function buildHistoricoCacheKey(contatoId: string) {
  return CacheManager.generateKey("whatsapp", "mensagens", contatoId);
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function getApiOrigin() {
  try {
    const baseUrl = getExternalApiConfig().baseUrl;
    if (!baseUrl) {
      return "";
    }

    return new URL(baseUrl).origin;
  } catch {
    return "";
  }
}

function resolveMediaUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }

  const origin = getApiOrigin();
  if (!origin) {
    return value;
  }

  return value.startsWith("/") ? `${origin}${value}` : `${origin}/${value}`;
}

function ensureDataImageUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("data:image")) {
    return value;
  }

  if (/^[A-Za-z0-9+/=]+$/.test(value)) {
    return `data:image/png;base64,${value}`;
  }

  return value;
}

function extractPayloadContainer(data: unknown) {
  const root = readObject(data);
  if (!root) {
    return null;
  }

  const direct = readObject(root.data);
  if (direct) {
    return direct;
  }

  const payload = readObject(root.payload);
  if (payload) {
    return payload;
  }

  const result = readObject(root.result);
  if (result) {
    return result;
  }

  return root;
}

function normalizeQrCodeApiResponse(data: unknown): WhatsAppQrCodeApiResponse {
  const payload = extractPayloadContainer(data);

  return {
    error: readBoolean(payload?.error) ?? false,
    instanceId: readString(payload?.instanceId) ?? "",
    qrcode: readString(payload?.qrcode),
    qrCode: readString(payload?.qrCode),
  };
}

function normalizeQrCodeResponse(data: WhatsAppQrCodeApiResponse): WhatsAppQrCodeResponse {
  const primaryQrCode = ensureDataImageUrl(readString(data.qrCode));
  const fallbackQrCode = ensureDataImageUrl(readString(data.qrcode));

  return {
    error: data.error,
    instanceId: data.instanceId,
    qrCode: primaryQrCode || fallbackQrCode || null,
    qrcode: fallbackQrCode || null,
  };
}

function normalizeInstanceStatusResponse(data: unknown): WhatsAppInstanceStatusResponse {
  const payload = extractPayloadContainer(data);
  const statusText = readString(payload?.status);
  const connectedByFlag = readBoolean(payload?.connected) ?? readBoolean(payload?.isConnected);
  const connectedByStatus = statusText
    ? ["connected", "open", "online", "authenticated"].includes(statusText.toLowerCase())
    : null;

  return {
    ...payload,
    connected: connectedByFlag ?? connectedByStatus ?? false,
    instanceId: readString(payload?.instanceId),
    status: statusText,
    message: readString(payload?.message),
    error: readBoolean(payload?.error) ?? undefined,
  };
}

function normalizeMensagemTipo(value: unknown): WhatsAppMensagemTipo {
  return readString(value) === "enviada" ? "enviada" : "recebida";
}

function normalizeInboxMessage(value: unknown, fallbackContatoId: string, fallbackIndex: number): WhatsAppMensagem {
  const raw = readObject(value) ?? {};
  const telefone = readString(raw.telefone) ?? fallbackContatoId;
  const avatar = resolveMediaUrl(readString(raw.avatar));
  const fotoPerfil = resolveMediaUrl(readString(raw.fotoPerfil));

  return {
    id: readString(raw.id) ?? `${fallbackContatoId}-${fallbackIndex}`,
    contatoId: readString(raw.contatoId) ?? fallbackContatoId,
    telefone,
    nome: readString(raw.nome) ?? telefone,
    avatar: avatar ?? fotoPerfil,
    fotoPerfil: fotoPerfil ?? avatar,
    texto: readString(raw.texto) ?? "",
    tipo: normalizeMensagemTipo(raw.tipo),
    enviadoPorMim: readBoolean(raw.enviadoPorMim) ?? normalizeMensagemTipo(raw.tipo) === "enviada",
    hora: readString(raw.hora) ?? "",
  };
}

function normalizeInboxChat(value: unknown, fallbackIndex: number): WhatsAppInboxChat {
  const raw = readObject(value) ?? {};
  const contatoId = readString(raw.contatoId) ?? readString(raw.telefone) ?? `chat-${fallbackIndex}`;
  const telefone = readString(raw.telefone) ?? contatoId;
  const avatar = resolveMediaUrl(readString(raw.avatar));
  const fotoPerfil = resolveMediaUrl(readString(raw.fotoPerfil));
  const mensagensRaw = Array.isArray(raw.mensagens) ? raw.mensagens : [];

  return {
    contatoId,
    telefone,
    nome: readString(raw.nome) ?? telefone,
    avatar: avatar ?? fotoPerfil,
    fotoPerfil: fotoPerfil ?? avatar,
    ultimaMensagem: readString(raw.ultimaMensagem) ?? "",
    ultimaMensagemHora: readString(raw.ultimaMensagemHora) ?? "",
    ultimaMensagemTipo: normalizeMensagemTipo(raw.ultimaMensagemTipo),
    mensagens: mensagensRaw.map((mensagem, index) => normalizeInboxMessage(mensagem, contatoId, index)),
    totalMensagens: readNumber(raw.totalMensagens) ?? mensagensRaw.length,
    isGrupo: readBoolean(raw.isGrupo) ?? false,
  };
}

function normalizeInboxResponse(data: unknown): WhatsAppInboxResponse {
  const payload = extractPayloadContainer(data);
  const chatsRaw = Array.isArray(payload?.chats) ? payload.chats : [];

  return {
    instanceConnected: readBoolean(payload?.instanceConnected) ?? false,
    page: readNumber(payload?.page) ?? DEFAULT_CHAT_PAGE,
    perPage: readNumber(payload?.perPage) ?? DEFAULT_CHAT_PER_PAGE,
    messagesLimit: readNumber(payload?.messagesLimit) ?? 40,
    total: readNumber(payload?.total) ?? chatsRaw.length,
    chats: chatsRaw.map((chat, index) => normalizeInboxChat(chat, index)),
    chatSelecionado: readString(payload?.chatSelecionado),
  };
}

export function invalidarHistoricoMensagensWhatsAppCache(contatoId?: string) {
  if (contatoId) {
    cacheManager.invalidate(buildHistoricoCacheKey(contatoId));
    return;
  }

  cacheManager.invalidateByPattern("whatsapp::mensagens::*");
}

export async function conectarInstanciaWhatsAppFromExternalApi(
  token: string,
  query?: WhatsAppQrCodeQuery,
) {
  const response = await externalApiRequest<unknown>(`${WHATSAPP_BASE_PATH}/qr-code`, {
    method: "GET",
    token,
    query,
    requiresAuth: true,
    requiresPrivateToken: true,
  });

  return normalizeQrCodeResponse(normalizeQrCodeApiResponse(response));
}

export async function obterStatusInstanciaWhatsAppFromExternalApi(token: string) {
  const response = await externalApiRequest<unknown>(`${WHATSAPP_BASE_PATH}/instance-status`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });

  return normalizeInstanceStatusResponse(response);
}

export function desconectarInstanciaWhatsAppFromExternalApi(token: string) {
  invalidarHistoricoMensagensWhatsAppCache();

  return externalApiRequest<WhatsAppDisconnectResponse>(`${WHATSAPP_BASE_PATH}/disconnect`, {
    method: "POST",
    body: {},
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function listarChatsWhatsAppFromExternalApi(token: string, params?: ListarChatsParams) {
  const pagination = normalizeChatsPagination(params);

  return externalApiRequest<WhatsAppChat[]>(`${WHATSAPP_BASE_PATH}/chats`, {
    method: "GET",
    query: pagination,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export async function obterInboxWhatsAppFromExternalApi(token: string, params?: ListarChatsParams) {
  const pagination = normalizeChatsPagination(params);
  const response = await externalApiRequest<unknown>(`${WHATSAPP_BASE_PATH}/inbox`, {
    method: "GET",
    query: pagination,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });

  return normalizeInboxResponse(response);
}

export async function obterHistoricoMensagensWhatsAppFromExternalApi(
  token: string,
  contatoId: string,
  options?: HistoricoMensagensOptions,
) {
  const normalizedContatoId = contatoId.trim();
  const cacheKey = buildHistoricoCacheKey(normalizedContatoId);

  if (options?.forceRefresh) {
    cacheManager.invalidate(cacheKey);
  }

  return cacheManager.getOrExecute(
    cacheKey,
    () =>
      externalApiRequest<WhatsAppMensagem[]>(
        `${WHATSAPP_BASE_PATH}/mensagens/${encodeURIComponent(normalizedContatoId)}`,
        {
          method: "GET",
          token,
          requiresAuth: true,
          requiresPrivateToken: true,
        },
      ),
    {
      ttl: options?.ttl ?? HISTORICO_CACHE_TTL_MS,
    },
  );
}

export function listarMensagensRecentesWhatsAppFromExternalApi(token: string, numero: string) {
  return externalApiRequest<unknown>(`${WHATSAPP_BASE_PATH}/messages/${encodeURIComponent(numero.trim())}`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function listarPesquisasPublicasWhatsAppFromExternalApi(token: string) {
  return externalApiRequest<WhatsAppPesquisaPublica[]>(`${WHATSAPP_BASE_PATH}/pesquisas-publicas`, {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarMensagemTextoWhatsAppFromExternalApi(
  token: string,
  payload: WhatsAppSendTextPayload,
) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-message`, {
    method: "POST",
    body: normalizeTextPayload(payload),
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarImagemWhatsAppFromExternalApi(
  token: string,
  payload: WhatsAppSendImagePayload,
) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-image`, {
    method: "POST",
    body: normalizeImagePayload(payload),
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarImagemWhatsAppMultipartFromExternalApi(token: string, formData: FormData) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-image`, {
    method: "POST",
    body: formData,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarAudioWhatsAppFromExternalApi(
  token: string,
  payload: WhatsAppSendAudioPayload,
) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-audio`, {
    method: "POST",
    body: normalizeAudioPayload(payload),
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarAudioWhatsAppMultipartFromExternalApi(token: string, formData: FormData) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-audio`, {
    method: "POST",
    body: formData,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarVideoWhatsAppFromExternalApi(
  token: string,
  payload: WhatsAppSendVideoPayload,
) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-video`, {
    method: "POST",
    body: normalizeVideoPayload(payload),
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarVideoWhatsAppMultipartFromExternalApi(token: string, formData: FormData) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-video`, {
    method: "POST",
    body: formData,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarDocumentoWhatsAppFromExternalApi(
  token: string,
  payload: WhatsAppSendDocumentPayload,
) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-document`, {
    method: "POST",
    body: normalizeDocumentPayload(payload),
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function enviarDocumentoWhatsAppMultipartFromExternalApi(token: string, formData: FormData) {
  return externalApiRequest<WhatsAppSendResponse>(`${WHATSAPP_BASE_PATH}/send-document`, {
    method: "POST",
    body: formData,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
