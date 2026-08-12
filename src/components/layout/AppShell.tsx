import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { FloatingActionButton } from "./FloatingActionButton";
import { OfflineBanner } from "./OfflineBanner";
import { ProfileDrawer } from "./ProfileDrawer";

export function AppShell() {
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <div className="app-frame">
      <OfflineBanner />
      <main className="page-content">
        <Outlet />
      </main>
      <FloatingActionButton />
      <BottomTabBar onOpenProfile={() => setProfileOpen(true)} />
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
