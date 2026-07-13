import { useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppShell } from "@/components/AppShellContext";
import type { ReactNode } from "react";

export function AppShellHeader({ title, leftSlot }: { title: string; leftSlot?: ReactNode }) {
  const { search, notifications, markAllRead } = useAppShell();
  const [openNotifs, setOpenNotifs] = useState(false);
  const [visible, setVisible] = useState(true);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 8 || y < lastY);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`app-header-bar app-shell-header ${visible ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="flex h-14 items-center gap-2 px-4">
        {leftSlot}
        <div className="hidden sm:block text-sm font-medium text-primary shrink-0">{title}</div>
        {search ? (
          <div className="relative ml-2 flex-1 max-w-xl">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onFocus={() => search.onFocus?.()}
              onBlur={() => search.onBlur?.()}
              placeholder={search.placeholder ?? "Search..."}
              className="pl-8 h-9"
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
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
            {unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" /> : null}
          </Button>
          {openNotifs ? (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-lg border bg-background shadow-lg p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Notifications</p>
              <div className="max-h-72 overflow-y-auto space-y-1">
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
