import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AppProviders } from "./app/AppProviders";
import { router } from "./app/router";
import "./styles/index.css";

const showUpdateIndicator = () => {
  if (document.getElementById("app-update-indicator")) return;
  const indicator = document.createElement("div");
  indicator.id = "app-update-indicator";
  indicator.className = "app-update-indicator";
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-live", "polite");
  indicator.innerHTML = `
    <span class="app-update-spinner" aria-hidden="true"></span>
    <span><strong>Actualizando NosVamos…</strong><small>La nueva versión estará lista en unos segundos.</small></span>
  `;
  document.body.appendChild(indicator);
};

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    showUpdateIndicator();
    void updateSW(true).catch(() => document.getElementById("app-update-indicator")?.remove());
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
