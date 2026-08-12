import { useLayoutEffect, useState } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { FloatingActionButton } from "./FloatingActionButton";
import { OfflineBanner } from "./OfflineBanner";
import { ProfileDrawer } from "./ProfileDrawer";

export function AppShell() {
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigationType = useNavigationType();
  const isMainTab = location.pathname === "/" || location.pathname === "/hoy";
  const transitionKind = navigationType === "POP"
    ? "route-transition-back"
    : isMainTab ? "route-transition-tab" : "route-transition-push";

  useLayoutEffect(() => {
    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [location.pathname, navigationType]);

  return (
    <div className="app-frame">
      <OfflineBanner />
      <main className="page-content">
        <div className={`route-transition ${transitionKind}`} key={location.key}>
          <Outlet />
        </div>
      </main>
      <FloatingActionButton />
      <BottomTabBar onOpenProfile={() => setProfileOpen(true)} />
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
