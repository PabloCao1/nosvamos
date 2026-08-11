import { create } from "zustand";

interface InstallState {
  installOpen: boolean;
  setInstallOpen: (open: boolean) => void;
}

export const useInstallStore = create<InstallState>((set) => ({
  installOpen: false,
  setInstallOpen: (installOpen) => set({ installOpen }),
}));
