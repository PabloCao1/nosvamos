import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AppProviders } from "./app/AppProviders";
import { router } from "./app/router";
import "./styles/index.css";

const showUpdatePrompt = (installUpdate: () => Promise<void>) => {
  if (document.getElementById("app-update-prompt")) return;
  const layer = document.createElement("div");
  layer.id = "app-update-prompt";
  layer.className = "app-update-layer";
  layer.innerHTML = `
    <section class="app-update-dialog" role="alertdialog" aria-modal="true" aria-labelledby="app-update-title" aria-describedby="app-update-description">
      <span class="app-update-icon" aria-hidden="true">\u2191</span>
      <h2 id="app-update-title">Hay una nueva versi\u00f3n</h2>
      <p id="app-update-description">Actualiz\u00e1 NosVamos para usar las \u00faltimas mejoras.</p>
      <button type="button" class="ui-button ui-button-primary ui-button-medium ui-button-full">Actualizar ahora</button>
      <small class="app-update-status" role="status" aria-live="polite"></small>
    </section>
  `;
  const button = layer.querySelector<HTMLButtonElement>("button")!;
  const status = layer.querySelector<HTMLElement>(".app-update-status")!;
  button.addEventListener("click", () => {
    button.disabled = true;
    button.innerHTML = '<span class="app-update-spinner" aria-hidden="true"></span><span class="ui-button-label">Actualizando\u2026</span>';
    void installUpdate().catch(() => {
      button.disabled = false;
      button.innerHTML = '<span class="ui-button-label">Intentar de nuevo</span>';
      status.textContent = "No pudimos actualizar. Revis\u00e1 tu conexi\u00f3n e intent\u00e1 nuevamente.";
    });
  });
  document.body.appendChild(layer);
  button.focus();
};

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    showUpdatePrompt(() => updateSW(true));
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
