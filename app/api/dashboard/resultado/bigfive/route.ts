import { NextResponse } from "next/server";

import { obterResumoBigFiveDashboardFromExternalApi } from "@/service/dashboard.service";
import { dashboardApiErrorResponse, mapSearchParams, requireDashboardSession } from "@/app/api/dashboard/_utils";

export async function GET(request: Request) {
  const { token, response } = await requireDashboardSession();
  if (response || !token) {
    return response as NextResponse;
  }

  try {
    const result = await obterResumoBigFiveDashboardFromExternalApi(token, mapSearchParams(request));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return dashboardApiErrorResponse(error, "Falha ao carregar resumo do dashboard Big Five.");
  }
}
