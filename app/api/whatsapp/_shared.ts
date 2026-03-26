import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];

function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

export async function requireAdminRouteToken() {
  const session = await getSession();

  if (!session?.token || !session.user?.papel) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  if (!isAdminRole(session.user.papel)) {
    return { ok: false as const, status: 403, message: "Perfil sem permissao para esta operacao." };
  }

  return { ok: true as const, token: session.token };
}

export function jsonError(error: unknown, fallbackMessage: string) {
  if (error instanceof ExternalApiError) {
    return NextResponse.json(
      {
        ok: false,
        status: error.status,
        data: null,
        message: readExternalApiErrorMessage(error),
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      status: 500,
      data: null,
      message: fallbackMessage,
    },
    { status: 500 },
  );
}

export function readRequiredPhone(formData: FormData) {
  const rawPhone = formData.get("phone");
  const phone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "").trim() : "";

  if (!phone) {
    return { ok: false as const, response: NextResponse.json({ ok: false, status: 400, data: null, message: "phone e obrigatorio." }, { status: 400 }) };
  }

  return { ok: true as const, phone };
}

export function readOptionalString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readOptionalInteger(formData: FormData, fieldName: string) {
  const value = readOptionalString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readUploadedFile(formData: FormData, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    const candidate = formData.get(fieldName);
    if (candidate instanceof File && candidate.size > 0) {
      return candidate;
    }
  }

  return null;
}