import { NextResponse } from "next/server";

import { enviarDocumentoWhatsAppMultipartFromExternalApi } from "@/service/whatsapp.service";

import { jsonError, readOptionalInteger, readOptionalString, readRequiredPhone, readUploadedFile, requireAdminRouteToken } from "../_shared";

export const runtime = "nodejs";

function readFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) {
    return "bin";
  }

  const extension = fileName.slice(dotIndex + 1).trim().toLowerCase();
  return extension || "bin";
}

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

    const document = readUploadedFile(formData, ["document", "documentFile", "file"]);
    if (!document) {
      return NextResponse.json({ ok: false, status: 400, data: null, message: "document e obrigatorio." }, { status: 400 });
    }

    const outbound = new FormData();
    outbound.append("phone", phoneResult.phone);
    outbound.append("document", document, document.name || "documento");

    const caption = readOptionalString(formData, "caption");
    const messageId = readOptionalString(formData, "messageId");
    const delayMessage = readOptionalInteger(formData, "delayMessage");
    const fileName = readOptionalString(formData, "fileName") || document.name || "documento";
    const extension = readOptionalString(formData, "extension") || readFileExtension(fileName);

    outbound.append("fileName", fileName);
    outbound.append("extension", extension);
    if (caption) outbound.append("caption", caption);
    if (messageId) outbound.append("messageId", messageId);
    if (delayMessage != null) outbound.append("delayMessage", String(delayMessage));

    const data = await enviarDocumentoWhatsAppMultipartFromExternalApi(auth.token, outbound);
    return NextResponse.json({ ok: true, status: 200, data, message: "ok" });
  } catch (error) {
    return jsonError(error, "Nao foi possivel enviar documento.");
  }
}