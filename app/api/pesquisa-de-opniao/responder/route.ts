import { NextResponse } from "next/server";

import { responderPesquisaPrivada } from "@/service/pesquisa-opiniao.service";
import type { PayloadResponderPrivado } from "@/types/pesquisa-opiniao";
import { requirePesquisaSession } from "@/app/api/pesquisa-de-opniao/_utils";

export async function POST(request: Request) {
  const { token, response } = await requirePesquisaSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const payload = (await request.json().catch(() => null)) as PayloadResponderPrivado | null;
  if (!payload) {
    return NextResponse.json({ message: "Payload invalido para responder pesquisa." }, { status: 400 });
  }

  const result = await responderPesquisaPrivada(token, payload);

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
