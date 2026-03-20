import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { normalizeParticipanteResponse } from "@/lib/participantes/normalize";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  buscarParticipantePorContatoFromExternalApi,
  criarParticipanteFromExternalApi,
  listarParticipantesFromExternalApi,
} from "@/service/participantes.service";

function readFirstParticipant(payload: unknown) {
  const direct = normalizeParticipanteResponse(payload);
  if (direct) {
    return direct;
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizeParticipanteResponse).find(Boolean) ?? null;
  }

  if (payload && typeof payload === "object") {
    const root = payload as { data?: unknown; items?: unknown };

    if (Array.isArray(root.data)) {
      return root.data.map(normalizeParticipanteResponse).find(Boolean) ?? null;
    }

    if (Array.isArray(root.items)) {
      return root.items.map(normalizeParticipanteResponse).find(Boolean) ?? null;
    }
  }

  return null;
}

function readAllParticipants(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeParticipanteResponse)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
  }

  if (payload && typeof payload === "object") {
    const root = payload as { data?: unknown; items?: unknown };

    if (Array.isArray(root.data)) {
      return root.data
        .map(normalizeParticipanteResponse)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
    }

    if (Array.isArray(root.items)) {
      return root.items
        .map(normalizeParticipanteResponse)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
    }
  }

  return [];
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function buildFallbackParticipant(payload: Body, created: unknown) {
  const createdObj = readObject(created);
  const id = typeof createdObj?.id === "string" ? createdObj.id : undefined;

  return {
    ...(id ? { id } : {}),
    nome:
      typeof createdObj?.nome === "string" && createdObj.nome.trim()
        ? createdObj.nome
        : payload.nome,
    email:
      typeof createdObj?.email === "string" && createdObj.email.trim()
        ? createdObj.email
        : payload.email,
    telefone:
      typeof createdObj?.telefone === "string" && createdObj.telefone.trim()
        ? createdObj.telefone
        : payload.contatoOpcional,
    contatoOpcional:
      typeof createdObj?.contatoOpcional === "string" && createdObj.contatoOpcional.trim()
        ? createdObj.contatoOpcional
        : payload.contatoOpcional,
  };
}

function normalizeContact(value: string) {
  return value.replace(/\D/g, "");
}

type Body = {
  nome: string;
  email?: string;
  contatoOpcional: string;
};

function normalizeBody(body: unknown): Body | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (typeof input.nome !== "string" || typeof input.contatoOpcional !== "string") {
    return null;
  }

  const nome = input.nome.trim();
  const contatoOpcional = input.contatoOpcional.trim();
  const email = typeof input.email === "string" ? input.email.trim() : undefined;

  if (!nome || !contatoOpcional) {
    return null;
  }

  return { nome, contatoOpcional, email };
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json(
      { message: "Payload invalido para criar participante." },
      { status: 400 },
    );
  }

  try {
    const created = await criarParticipanteFromExternalApi(session.token, payload);
    const normalizedFromCreate = readFirstParticipant(created);

    if (normalizedFromCreate) {
      return NextResponse.json(normalizedFromCreate, { status: 201 });
    }

    const participante = await buscarParticipantePorContatoFromExternalApi(
      session.token,
      payload.contatoOpcional,
    );
    let normalized = readFirstParticipant(participante);

    if (!normalized) {
      const allParticipants = await listarParticipantesFromExternalApi(session.token);
      const list = readAllParticipants(allParticipants);
      const target = normalizeContact(payload.contatoOpcional);

      normalized =
        list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
        list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
        null;
    }

    if (!normalized) {
      return NextResponse.json(buildFallbackParticipant(payload, created), { status: 201 });
    }

    return NextResponse.json(normalized, { status: 201 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      if (error.status === 409) {
        try {
          const participante = await buscarParticipantePorContatoFromExternalApi(
            session.token,
            payload.contatoOpcional,
          );
          let normalized = readFirstParticipant(participante);

          if (!normalized) {
            const allParticipants = await listarParticipantesFromExternalApi(session.token);
            const list = readAllParticipants(allParticipants);
            const target = normalizeContact(payload.contatoOpcional);

            normalized =
              list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
              list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
              null;
          }

          if (normalized) {
            return NextResponse.json(normalized, { status: 200 });
          }
        } catch {
          // Mantem retorno padrao de conflito quando fallback falhar.
        }
      }

      return NextResponse.json(
        {
          message: readExternalApiErrorMessage(error),
          data: error.data,
        },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Falha ao criar participante." }, { status: 500 });
  }
}
