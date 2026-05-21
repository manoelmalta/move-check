type Props = {
  variant?: "hero" | "light";
};

/**
 * Background institucional MOVE CHECK.
 *
 * - "hero": fundo azul oficial + imagem técnica em screen + grid sutil. Para login, home, hub.
 * - "light": fundo claro com padrão técnico discreto. Para cabeçalhos institucionais.
 *
 * Renderiza absolute fills — colocar dentro de um container `relative`.
 */
export function BrandedBackground({ variant = "hero" }: Props) {
  if (variant === "light") {
    return (
      <>
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-[0.10] pointer-events-none"
          style={{
            backgroundImage: "url('/branding/background-check.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,87,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,87,184,0.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </>
    );
  }

  return (
    <>
      <div aria-hidden className="absolute inset-0 z-0 bg-[#0057B8]" />
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-[0.22] pointer-events-none mix-blend-screen"
        style={{
          backgroundImage: "url('/branding/background-check.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#0057B8]/30 via-transparent to-[#003F8A]/45"
      />
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1 z-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
    </>
  );
}
