import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { AreaShell } from "./area-shell";

export default async function AreaShowPage() {
  const session = await getSession();

  if (!session) {
    redirect("/?login=1&redirect=/areashow");
  }

  return <AreaShell user={session.user} />;
}
