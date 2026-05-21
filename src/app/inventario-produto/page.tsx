import { getMostRecentOpenSessionByType, getSessionById } from "@/actions/session";
import { getSessionEntries } from "@/actions/scan";
import { ScannerCockpit } from "../coletar/scanner-cockpit";
import { NoSession } from "../coletar/no-session";
import { ClosedSession } from "../coletar/closed-session";

export default async function InventarioProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;

  const session = sessionId
    ? await getSessionById(sessionId)
    : await getMostRecentOpenSessionByType("PRODUCT_INVENTORY");

  if (!session) {
    return <NoSession operationType="PRODUCT_INVENTORY" />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} />;
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
