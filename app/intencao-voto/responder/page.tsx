import { redirect } from "next/navigation";

import { ResponderIntencaoVotoPrivadoClient } from "@/app/intencao-voto/responder/responder-privado-client";
import { getSession } from "@/lib/auth/session";

export default async function ResponderIntencaoVotoPrivadoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/intencao-voto/responder");
  }

  return <ResponderIntencaoVotoPrivadoClient />;
}
