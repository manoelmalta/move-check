import { getMostRecentOpenSession, getSessionById } from "@/actions/session";
import { getSessionEntries } from "@/actions/scan";
import { getRegistrationLogs } from "@/actions/registration";
import { ScannerCockpit } from "./scanner-cockpit";
import { RegistrationCockpit } from "./registration-cockpit";
import { NoSession } from "./no-session";
import { ClosedSession } from "./closed-session";

export default async function ColetarPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  const session = sessionId
    ? await getSessionById(sessionId)
    : await getMostRecentOpenSession();

  if (!session) {
    return <NoSession />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} />;
  }

  if (session.operationType === "PRODUCT_REGISTRATION") {
    const initialLogs = await getRegistrationLogs(session.id);
    return <RegistrationCockpit session={session} initialLogs={initialLogs} />;
  }

  const recentEntries = await getSessionEntries(session.id);

  return (
    <ScannerCockpit
      session={session}
      initialEntries={recentEntries.map((e) => ({
        id: e.id,
        code: e.code,
        codeType: e.codeType,
        quantity: e.quantity,
        status: e.status,
        scannedAt: e.scannedAt,
        product: e.product
          ? { codigoInterno: e.product.codigoInterno, descricao: e.product.descricao }
          : null,
      }))}
    />
  );
}
