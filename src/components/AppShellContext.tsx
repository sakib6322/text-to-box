import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type HeaderSearchConfig = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read?: boolean;
};

type AppShellContextValue = {
  search: HeaderSearchConfig | null;
  setSearch: (config: HeaderSearchConfig | null) => void;
  notifications: AppNotification[];
  pushNotification: (input: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState<HeaderSearchConfig | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const pushNotification = (input: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    const item: AppNotification = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 50));

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(input.title, { body: input.message });
    }
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const value = useMemo(
    () => ({
      search,
      setSearch,
      notifications,
      pushNotification,
      markAllRead,
    }),
    [search, notifications],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used inside AppShellProvider");
  return ctx;
}

export function useHeaderSearch(config: HeaderSearchConfig | null) {
  const { setSearch } = useAppShell();
  useEffect(() => {
    setSearch(config);
    return () => setSearch(null);
  }, [config, setSearch]);
}
