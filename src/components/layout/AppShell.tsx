import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { FloatingActionButton } from "./FloatingActionButton";
import { OfflineBanner } from "./OfflineBanner";
import { InstallSheet } from "../ui/InstallSheet";
import { SyncStatusBar } from "./SyncStatusBar";

export function AppShell() {
  return (
    <div className="app-frame">
      <OfflineBanner />
      <SyncStatusBar />
      <main className="page-content">
        <Outlet />
      </main>
      <FloatingActionButton />
      <BottomTabBar />
      <InstallSheet />
    </div>
  );
}
