import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function ResponderIntencaoVotoPrivadoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/areashow?view=voto-aplicar");
  }

  redirect("/areashow?view=voto-aplicar");
}
