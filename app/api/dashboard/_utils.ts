import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";

export async function requireDashboardSession() {
  const session = await getSession();

  if (!session?.token) {
    return {
      token: null,
      response: NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 }),
    };
  }

  return {
    token: session.token,
    response: null,
  };
}

export function mapSearchParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const query: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    const current = query[key];
    if (current == null) {
      query[key] = value;
      return;
    }

    if (Array.isArray(current)) {
      current.push(value);
      return;
    }

    query[key] = [current, value];
  });

  return query;
}

export function dashboardApiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ExternalApiError) {
    return NextResponse.json(
      {
        message: readExternalApiErrorMessage(error),
        data: error.data,
      },
      { status: error.status },
    );
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
