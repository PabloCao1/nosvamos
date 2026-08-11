import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AppProviders } from "./app/AppProviders";
import { router } from "./app/router";
import "./styles/index.css";

registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("brujula:update-available"));
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
