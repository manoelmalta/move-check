"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CameraState = "starting" | "active" | "permission_denied" | "unsupported" | "error";

type Props = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CameraScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<CameraState>("starting");

  // Always-current callback ref — avoids stale closure inside the ZXing callback
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const pausedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    let unmounted = false;

    async function start() {
      // Check for MediaDevices API support
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraState("unsupported");
        return;
      }

      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (unmounted || !videoRef.current) return;

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || pausedRef.current) return;

            const raw = result.getText();
            const clean = raw.replace(/\D/g, "");
            if (!clean) return;

            // Debounce: pause for 1.5s after each detection
            pausedRef.current = true;
            onDetectedRef.current(clean);

            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              pausedRef.current = false;
            }, 1500);
          }
        );

        if (unmounted) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        setCameraState("active");
      } catch (err) {
        if (unmounted) return;
        const name = (err as { name?: string }).name ?? "";
        if (
          name === "NotAllowedError" ||
          name === "PermissionDeniedError" ||
          name === "NotGrantedError"
        ) {
          setCameraState("permission_denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCameraState("unsupported");
        } else {
          setCameraState("error");
        }
      }
    }

    start();

    return () => {
      unmounted = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controlsRef.current?.stop();
    };
  }, []);

  // ─── Error states ─────────────────────────────────────────────────────────

  if (cameraState === "permission_denied") {
    return (
      <ErrorBanner
        icon={<CameraOffIcon />}
        title="Câmera bloqueada"
        message="Não foi possível acessar a câmera. Use o campo manual ou leitor Bluetooth."
        variant="red"
        onClose={onClose}
      />
    );
  }

  if (cameraState === "unsupported") {
    return (
      <ErrorBanner
        icon={<CameraOffIcon />}
        title="Câmera não disponível"
        message="Este navegador não suporta leitura por câmera. Use o campo manual ou leitor Bluetooth."
        variant="amber"
        onClose={onClose}
      />
    );
  }

  if (cameraState === "error") {
    return (
      <ErrorBanner
        icon={<CameraOffIcon />}
        title="Erro ao iniciar câmera"
        message="Não foi possível acessar a câmera. Use o campo manual ou leitor Bluetooth."
        variant="red"
        onClose={onClose}
      />
    );
  }

  // ─── Camera view ──────────────────────────────────────────────────────────

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
      {/* Video feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Overlay elements — only shown when active */}
      {cameraState === "active" && (
        <>
          {/* Corner brackets (MOVE CHECK identity) */}
          <div className="absolute top-4 left-4 w-9 h-9 border-t-[3px] border-l-[3px] border-[#0057B8] rounded-tl-sm" />
          <div className="absolute top-4 right-4 w-9 h-9 border-t-[3px] border-r-[3px] border-[#0057B8] rounded-tr-sm" />
          <div className="absolute bottom-10 left-4 w-9 h-9 border-b-[3px] border-l-[3px] border-[#0057B8] rounded-bl-sm" />
          <div className="absolute bottom-10 right-4 w-9 h-9 border-b-[3px] border-r-[3px] border-[#0057B8] rounded-br-sm" />

          {/* Animated scan line */}
          <div className="camera-scan-line" />

          {/* Hint label */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <span className="bg-black/55 text-white text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-full">
              Aponte para o código de barras
            </span>
          </div>
        </>
      )}

      {/* Starting spinner */}
      {cameraState === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-white/70 text-xs tracking-wider uppercase">Iniciando câmera…</span>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white active:bg-black/70 transition-colors z-10"
        aria-label="Fechar câmera"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ErrorBannerProps = {
  icon: React.ReactNode;
  title: string;
  message: string;
  variant: "red" | "amber";
  onClose: () => void;
};

function ErrorBanner({ icon, title, message, variant, onClose }: ErrorBannerProps) {
  const styles = {
    red: {
      wrapper: "bg-red-50 border-red-200",
      icon: "text-red-400",
      title: "text-red-600",
      message: "text-red-500",
      close: "text-red-300 active:text-red-500",
    },
    amber: {
      wrapper: "bg-amber-50 border-amber-200",
      icon: "text-amber-500",
      title: "text-amber-700",
      message: "text-amber-600",
      close: "text-amber-300 active:text-amber-600",
    },
  }[variant];

  return (
    <div className={`border-2 rounded-2xl px-4 py-4 flex items-start gap-3 slide-up ${styles.wrapper}`}>
      <div className={`mt-0.5 shrink-0 ${styles.icon}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${styles.title}`}>{title}</div>
        <div className={`text-sm ${styles.message}`}>{message}</div>
      </div>
      <button onClick={onClose} className={`shrink-0 mt-0.5 ${styles.close}`} aria-label="Fechar">
        <CloseIcon />
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
    </svg>
  );
}
