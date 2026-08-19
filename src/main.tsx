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
      <h2 id="app-update-title">Hay una nueva versiÃ³n</h2>
      <p id="app-update-description">ActualizÃ¡ NosVamos para usar las Ãºltimas mejoras.</p>
      <button type="button" class="ui-button ui-button-primary ui-button-medium ui-button-full">Actualizar ahora</button>
      <small class="app-update-status" role="status" aria-live="polite"></small>
    </section>
  `;
  const button = layer.querySelector<HTMLButtonElement>("button")!;
  const status = layer.querySelector<HTMLElement>(".app-update-status")!;
  button.addEventListener("click", () => {
    button.disabled = true;
    button.innerHTML = '<span class="app-update-spinner" aria-hidden="true"></span><span class="ui-button-label">Actualizandoâ€¦</span>';
    void installUpdate().catch(() => {
      button.disabled = false;
      button.innerHTML = '<span class="ui-button-label">Intentar de nuevo</span>';
      status.textContent = "No pudimos actualizar. RevisÃ¡ tu conexiÃ³n e intentÃ¡ nuevamente.";
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
