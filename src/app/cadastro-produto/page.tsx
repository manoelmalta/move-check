import { getSessionById } from "@/actions/session";
import { getRegistrationLogs } from "@/actions/registration";
import { RegistrationCockpit } from "../coletar/registration-cockpit";
import { NoSession } from "../coletar/no-session";
import { ClosedSession } from "../coletar/closed-session";

export default async function CadastroProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  const session = sessionId
    ? await getSessionById(sessionId)
    : null;

  if (!session) {
    return <NoSession operationType="PRODUCT_REGISTRATION" />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} />;
  }

  const initialLogs = await getRegistrationLogs(session.id);
  return <RegistrationCockpit session={session} initialLogs={initialLogs} companyId={session.companyId} />;
}
