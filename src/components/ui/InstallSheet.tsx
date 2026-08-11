import { useEffect, useRef, useState } from "react";
import { useInstallStore } from "../../stores/installStore";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type MobilePlatform = "ios" | "android" | "other";

function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator
      && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function getMobilePlatform(): MobilePlatform {
  const agent = navigator.userAgent.toLowerCase();
  const isiPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(agent) || isiPad) return "ios";
  if (/android/.test(agent)) return "android";
  return "other";
}

const instructions: Record<MobilePlatform, string[][]> = {
  ios: [
    ["1", "Abrí NosVamos en Safari"],
    ["2", "Pulsá el botón Compartir"],
    ["3", "Elegí “Añadir a pantalla de inicio”"],
    ["4", "Activá “Abrir como app web” y confirmá"],
  ],
  android: [
    ["1", "Tocá “Instalar ahora”"],
    ["2", "Confirmá la instalación de NosVamos"],
    ["3", "Abrila desde el nuevo ícono"],
  ],
  other: [
    ["1", "Abrí el menú de tu navegador"],
    ["2", "Elegí “Instalar aplicación” o “Añadir a inicio”"],
    ["3", "Abrí NosVamos desde el nuevo ícono"],
  ],
};

export function InstallSheet() {
  const open = useInstallStore((state) => state.installOpen);
  const setOpen = useInstallStore((state) => state.setInstallOpen);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [platform] = useState(getMobilePlatform);
  const autoOpened = useRef(false);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  useEffect(() => {
    if (autoOpened.current || isInstalled() || platform === "other") return;
    autoOpened.current = true;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [platform, setOpen]);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(undefined);
    if (choice.outcome === "accepted") setOpen(false);
  };

  const steps = platform === "android" && !installPrompt
    ? [
        ["1", "Abrí el menú ⋮ de Chrome"],
        ["2", "Elegí “Instalar aplicación”"],
        ["3", "Abrí NosVamos desde el nuevo ícono"],
      ]
    : instructions[platform];
  const copy = platform === "ios"
    ? "Instalala desde Safari para recibir avisos y consultar tu viaje incluso sin conexión."
    : "Instalala para abrirla como una app, recibir avisos y usar tus viajes sin conexión.";

  return (
    <BottomSheet open={open && !isInstalled()} onClose={() => setOpen(false)} title="Instalá NosVamos">
      <img className="install-app-icon" src={`${import.meta.env.BASE_URL}icons/pwa-192x192.png`} alt="Ícono de NosVamos" />
      <p className="sheet-copy">{copy}</p>
      <ol className="install-steps">
        {steps.map(([number, text]) => (
          <li key={number}><span>{number}</span><p>{text}</p></li>
        ))}
      </ol>
      {platform === "android" && installPrompt ? (
        <Button variant="primary" fullWidth onClick={() => void install()}>Instalar ahora</Button>
      ) : (
        <Button variant="primary" fullWidth onClick={() => setOpen(false)}>Entendido</Button>
      )}
    </BottomSheet>
  );
}
