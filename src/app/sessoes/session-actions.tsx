"use client";

import { useRouter } from "next/navigation";
import { closeSession } from "@/actions/session";

type Props = {
  session: { id: string; status: string };
};

export function SessionActions({ session }: Props) {
  const router = useRouter();

  if (session.status !== "open") {
    return null;
  }

  const handleClose = async () => {
    await closeSession(session.id);
    router.refresh();
  };

  return (
    <button
      onClick={handleClose}
      className="text-[11px] font-bold text-red-500 border border-red-200 rounded-lg px-3 py-1.5 active:bg-red-50 transition-colors"
    >
      Fechar
    </button>
  );
}
