"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";
import { BrandedBackground } from "@/components/branded-background";
import { MoveCheckLogo } from "@/components/move-check-logo";

export function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await loginAction(password);
    if ("ok" in result) {
      router.replace("/");
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <BrandedBackground variant="hero" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <MoveCheckLogo size={96} priority className="drop-shadow-2xl" />
          <div className="text-white/55 text-[10px] tracking-[0.4em] uppercase mt-3">
            Operational Scan Cockpit
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
          <div className="text-center">
            <div className="text-gray-900 font-bold text-lg">Acesso restrito</div>
            <div className="text-gray-400 text-sm mt-0.5">
              Digite a senha para continuar
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha de acesso"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#0057B8] focus:ring-2 focus:ring-[#0057B8]/15 text-gray-900"
            />

            {error && (
              <div className="text-sm text-red-600 text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!password.trim() || loading}
              className="w-full bg-[#0057B8] text-white font-bold text-base rounded-xl py-4 active:bg-[#003F8A] disabled:opacity-40 transition-colors shadow-md"
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-white/30 text-[10px] tracking-[0.3em] uppercase">
          MOVE · Logística Inteligente
        </div>
      </div>
    </div>
  );
}
