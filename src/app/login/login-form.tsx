"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

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
    <div className="min-h-dvh bg-[#0057B8] flex flex-col items-center justify-center px-6">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="flex gap-[2px] items-end">
              {[3, 5, 2, 4, 3, 5, 2, 4, 3].map((h, i) => (
                <div
                  key={i}
                  className="bg-white/90 rounded-sm"
                  style={{ width: 2, height: h * 4 }}
                />
              ))}
            </div>
            <span className="text-white font-bold text-xl tracking-[0.18em] uppercase ml-1">
              MOVE
            </span>
          </div>
          <div className="text-white/50 text-[10px] tracking-[0.35em] uppercase">
            CHECK
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
