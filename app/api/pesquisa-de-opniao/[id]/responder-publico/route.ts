import { NextResponse } from "next/server";

import { responderPesquisaPublica } from "@/service/pesquisa-opiniao.service";
import type { PayloadResponderPublico } from "@/types/pesquisa-opiniao";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as PayloadResponderPublico | null;

  if (!payload) {
    return NextResponse.json({ message: "Payload invalido para resposta publica." }, { status: 400 });
  }

  const result = await responderPesquisaPublica(id, payload);

  if (!result.ok && result.status !== 202) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(
    {
      message: result.message,
      data: result.data,
      status: result.status === 202 ? "queued" : "success",
    },
    { status: result.status || 201 },
  );
}
