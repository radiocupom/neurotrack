import { NextResponse } from "next/server";

import { enviarVideoWhatsAppMultipartFromExternalApi } from "@/service/whatsapp.service";

import { jsonError, readOptionalInteger, readOptionalString, readRequiredPhone, readUploadedFile, requireAdminRouteToken } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminRouteToken();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, status: auth.status, data: null, message: auth.message }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const phoneResult = readRequiredPhone(formData);
    if (!phoneResult.ok) {
      return phoneResult.response;
    }

    const video = readUploadedFile(formData, ["video", "videoFile", "file"]);
    if (!video) {
      return NextResponse.json({ ok: false, status: 400, data: null, message: "video e obrigatorio." }, { status: 400 });
    }

    const outbound = new FormData();
    outbound.append("phone", phoneResult.phone);
    outbound.append("video", video, video.name || "video");

    const caption = readOptionalString(formData, "caption");
    const messageId = readOptionalString(formData, "messageId");
    const delayMessage = readOptionalInteger(formData, "delayMessage");

    if (caption) outbound.append("caption", caption);
    if (messageId) outbound.append("messageId", messageId);
    if (delayMessage != null) outbound.append("delayMessage", String(delayMessage));

    const data = await enviarVideoWhatsAppMultipartFromExternalApi(auth.token, outbound);
    return NextResponse.json({ ok: true, status: 200, data, message: "ok" });
  } catch (error) {
    return jsonError(error, "Nao foi possivel enviar video.");
  }
}