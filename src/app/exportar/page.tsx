import { getSessions } from "@/actions/session";
import { PageHeader } from "@/components/ui/page-header";
import { ExportPanel } from "./export-panel";

export default async function ExportarPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;
  const sessions = await getSessions();

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      <PageHeader title="Exportar" subtitle="MOVE CHECK" />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">
        <ExportPanel
          sessions={sessions.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            totalEntries: s.totalEntries,
            pendenteCount: s.pendenteCount,
          }))}
          preSelectedId={sessionId}
        />
      </div>
    </div>
  );
}
