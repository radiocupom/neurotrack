import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { normalizeParticipanteResponse } from "@/lib/participantes/normalize";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  buscarParticipantePorContatoFromExternalApi,
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

function normalizeContact(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ telefone: string }> },
) {
  const session = await getSession();
  const params = await context.params;
  const telefone = params.telefone;

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  if (!telefone?.trim()) {
    return NextResponse.json({ message: "Telefone invalido." }, { status: 400 });
  }

  try {
    const participante = await buscarParticipantePorContatoFromExternalApi(session.token, telefone.trim());
    let normalized = readFirstParticipant(participante);

    if (!normalized) {
      const allParticipants = await listarParticipantesFromExternalApi(session.token);
      const list = readAllParticipants(allParticipants);
      const target = normalizeContact(telefone.trim());

      normalized =
        list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
        list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
        null;
    }

    if (!normalized) {
      return NextResponse.json(
        {
          found: false,
          participante: null,
          message: "Participante nao encontrado para o contato informado.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ found: true, participante: normalized }, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      if (error.status === 404) {
        try {
          const allParticipants = await listarParticipantesFromExternalApi(session.token);
          const list = readAllParticipants(allParticipants);
          const target = normalizeContact(telefone.trim());

          const normalized =
            list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
            list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
            null;

          if (normalized) {
            return NextResponse.json({ found: true, participante: normalized }, { status: 200 });
          }
        } catch {
          // Mantem resposta de not-found padrao quando fallback falhar.
        }

        return NextResponse.json(
          {
            found: false,
            participante: null,
            message: "Participante nao encontrado para o contato informado.",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          message: readExternalApiErrorMessage(error),
          data: error.data,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Falha ao consultar participante por telefone." },
      { status: 500 },
    );
  }
}
