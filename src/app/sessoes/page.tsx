export const dynamic = "force-dynamic";

import { getSessions } from "@/actions/session";
import { PageHeader } from "@/components/ui/page-header";
import { NewSessionForm } from "./new-session-form";
import { SessionCard } from "./session-card";

export default async function SessoesPage() {
  const sessions = await getSessions();
  const openCount = sessions.filter((s) => s.status === "open").length;

  return (
    <div className="min-h-dvh bg-[#f4f6f9] flex flex-col">
      <PageHeader title="Sessões de Coleta" subtitle="MOVE CHECK" />

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* New session */}
        <NewSessionForm />

        {/* Summary */}
        {sessions.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Total</div>
              <div className="text-lg font-bold text-gray-900">{sessions.length}</div>
            </div>
            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-center">
              <div className="text-[10px] text-green-600 tracking-wider uppercase">Abertas</div>
              <div className="text-lg font-bold text-green-700">{openCount}</div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-center shadow-sm">
              <div className="text-[10px] text-gray-400 tracking-wider uppercase">Fechadas</div>
              <div className="text-lg font-bold text-gray-500">{sessions.length - openCount}</div>
            </div>
          </div>
        )}

        {/* List */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-10 text-center shadow-sm">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-gray-400 text-sm">Nenhuma sessão ainda</div>
            <div className="text-gray-300 text-xs mt-1">Crie uma acima para começar</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
