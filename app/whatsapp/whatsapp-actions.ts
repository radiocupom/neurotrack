"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  conectarInstanciaWhatsAppFromExternalApi,
  desconectarInstanciaWhatsAppFromExternalApi,
  enviarAudioWhatsAppFromExternalApi,
  enviarDocumentoWhatsAppFromExternalApi,
  enviarImagemWhatsAppFromExternalApi,
  enviarMensagemTextoWhatsAppFromExternalApi,
  enviarVideoWhatsAppFromExternalApi,
  listarChatsWhatsAppFromExternalApi,
  listarPesquisasPublicasWhatsAppFromExternalApi,
  listarMensagensRecentesWhatsAppFromExternalApi,
  obterInboxWhatsAppFromExternalApi,
  obterStatusInstanciaWhatsAppFromExternalApi,
  obterHistoricoMensagensWhatsAppFromExternalApi,
  type WhatsAppChat,
  type WhatsAppDisconnectResponse,
  type WhatsAppInboxResponse,
  type WhatsAppInstanceStatusResponse,
  type WhatsAppMensagem,
  type WhatsAppPesquisaPublica,
  type WhatsAppSendAudioPayload,
  type WhatsAppSendDocumentPayload,
  type WhatsAppSendImagePayload,
  type WhatsAppSendResponse,
  type WhatsAppSendTextPayload,
  type WhatsAppSendVideoPayload,
  type WhatsAppQrCodeQuery,
  type WhatsAppQrCodeResponse,
} from "@/service/whatsapp.service";

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];

type ActionResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

async function requireAdminToken() {
  const session = await getSession();

  if (!session?.token || !session.user?.papel) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  if (!isAdminRole(session.user.papel)) {
    return { ok: false as const, status: 403, message: "Perfil sem permissao para esta operacao." };
  }

  return { ok: true as const, token: session.token };
}

function mapError<T>(error: unknown, fallbackMessage: string): ActionResult<T> {
  if (error instanceof ExternalApiError) {
    return {
      ok: false,
      status: error.status,
      data: null,
      message: readExternalApiErrorMessage(error),
    };
  }

  return {
    ok: false,
    status: 500,
    data: null,
    message: fallbackMessage,
  };
}

export async function conectarInstanciaWhatsAppAction(
  query?: WhatsAppQrCodeQuery,
): Promise<ActionResult<WhatsAppQrCodeResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await conectarInstanciaWhatsAppFromExternalApi(auth.token, query);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel conectar a instancia do WhatsApp.");
  }
}

export async function obterStatusInstanciaWhatsAppAction(): Promise<ActionResult<WhatsAppInstanceStatusResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await obterStatusInstanciaWhatsAppFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel consultar o status da instancia do WhatsApp.");
  }
}

export async function desconectarInstanciaWhatsAppAction(): Promise<ActionResult<WhatsAppDisconnectResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await desconectarInstanciaWhatsAppFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel desconectar a instancia do WhatsApp.");
  }
}

export async function listarChatsWhatsAppAction(params?: {
  perPage?: number;
  page?: number;
}): Promise<ActionResult<WhatsAppChat[]>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await listarChatsWhatsAppFromExternalApi(auth.token, params);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel listar os chats do WhatsApp.");
  }
}

export async function obterInboxWhatsAppAction(params?: {
  perPage?: number;
  page?: number;
}): Promise<ActionResult<WhatsAppInboxResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await obterInboxWhatsAppFromExternalApi(auth.token, params);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel carregar a inbox do WhatsApp.");
  }
}

export async function obterHistoricoMensagensWhatsAppAction(
  contatoId: string,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
  },
): Promise<ActionResult<WhatsAppMensagem[]>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  if (!contatoId?.trim()) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "contatoId e obrigatorio.",
    };
  }

  try {
    const data = await obterHistoricoMensagensWhatsAppFromExternalApi(auth.token, contatoId, options);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel obter o historico de mensagens.");
  }
}

export async function listarMensagensRecentesWhatsAppAction(
  numero: string,
): Promise<ActionResult<unknown>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  if (!numero?.trim()) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: "numero e obrigatorio.",
    };
  }

  try {
    const data = await listarMensagensRecentesWhatsAppFromExternalApi(auth.token, numero);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel listar mensagens recentes da W-API.");
  }
}

export async function listarPesquisasPublicasWhatsAppAction(): Promise<ActionResult<WhatsAppPesquisaPublica[]>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await listarPesquisasPublicasWhatsAppFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel listar pesquisas publicas do WhatsApp.");
  }
}

export async function enviarMensagemTextoWhatsAppAction(
  payload: WhatsAppSendTextPayload,
): Promise<ActionResult<WhatsAppSendResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await enviarMensagemTextoWhatsAppFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel enviar mensagem de texto.");
  }
}

export async function enviarImagemWhatsAppAction(
  payload: WhatsAppSendImagePayload,
): Promise<ActionResult<WhatsAppSendResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await enviarImagemWhatsAppFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel enviar imagem.");
  }
}

export async function enviarAudioWhatsAppAction(
  payload: WhatsAppSendAudioPayload,
): Promise<ActionResult<WhatsAppSendResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await enviarAudioWhatsAppFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel enviar audio.");
  }
}

export async function enviarVideoWhatsAppAction(
  payload: WhatsAppSendVideoPayload,
): Promise<ActionResult<WhatsAppSendResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await enviarVideoWhatsAppFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel enviar video.");
  }
}

export async function enviarDocumentoWhatsAppAction(
  payload: WhatsAppSendDocumentPayload,
): Promise<ActionResult<WhatsAppSendResponse>> {
  const auth = await requireAdminToken();
  if (!auth.ok) {
    return { ok: false, status: auth.status, data: null, message: auth.message };
  }

  try {
    const data = await enviarDocumentoWhatsAppFromExternalApi(auth.token, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel enviar documento.");
  }
}
