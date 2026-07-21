import { useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppShell } from "@/components/AppShellContext";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { resolveDeviceTheme } from "@/lib/uiAppearance";
import type { ReactNode } from "react";

export function AppShellHeader({ title, leftSlot }: { title: string; leftSlot?: ReactNode }) {
  const { search, notifications, markAllRead } = useAppShell();
  const { appearance, activeDevice } = useUiAppearance();
  const headerStyle = resolveDeviceTheme(appearance, activeDevice).global.header;
  const [openNotifs, setOpenNotifs] = useState(false);
  const [visible, setVisible] = useState(true);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const hideOnScroll = headerStyle.hideOnScrollDown;

  useEffect(() => {
    if (!hideOnScroll) {
      setVisible(true);
      return;
    }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 8 || y < lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideOnScroll]);

  return (
    <header className={`app-header-bar app-shell-header ${hideOnScroll && !visible ? "-translate-y-full" : "translate-y-0"}`}>
      <div className="app-header-inner">
        {leftSlot}
        <div className="app-header-title hidden shrink-0 sm:block">{title}</div>
        {search ? (
          <div className="app-header-search relative ml-2 max-w-xl flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onFocus={() => search.onFocus?.()}
              onBlur={() => search.onBlur?.()}
              placeholder={search.placeholder ?? "Search..."}
              className="pl-8"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="app-header-icon-btn"
            aria-label="Notifications"
            onClick={() => {
              if ("Notification" in window && Notification.permission === "default") {
                Notification.requestPermission().catch(() => undefined);
              }
              setOpenNotifs((s) => !s);
              if (unreadCount) markAllRead();
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="app-header-notification-dot absolute right-1.5 top-1.5 h-2 w-2 rounded-full" />
            ) : null}
          </Button>
          {openNotifs ? (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-background p-2 shadow-lg">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Notifications</p>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="rounded-md border p-2">
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
