import { NextResponse } from "next/server";

import { obterStatusFila } from "@/service/pesquisa-opiniao.service";
import { requirePesquisaAdminSession } from "@/app/api/pesquisa-de-opniao/_utils";

export async function GET() {
  const { token, response } = await requirePesquisaAdminSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const result = await obterStatusFila(token);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data, { status: 200 });
}
