import { NextResponse } from "next/server";

import { buscarParticipantePorContato } from "@/service/pesquisa-opiniao.service";
import { requirePesquisaSession } from "@/app/api/pesquisa-de-opniao/_utils";

export async function GET(request: Request) {
  const { token, response } = await requirePesquisaSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const { searchParams } = new URL(request.url);
  const contato = searchParams.get("contato")?.trim() ?? "";

  if (!contato) {
    return NextResponse.json({ message: "Contato invalido." }, { status: 400 });
  }

  const result = await buscarParticipantePorContato(token, contato);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data, { status: 200 });
}
