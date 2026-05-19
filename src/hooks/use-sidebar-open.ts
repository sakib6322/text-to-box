import * as React from "react";

const SIDEBAR_COOKIE_NAME = "sidebar:state";

function readSidebarCookie(defaultOpen: boolean) {
  if (typeof document === "undefined") return defaultOpen;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SIDEBAR_COOKIE_NAME}=(true|false)`));
  return match ? match[1] === "true" : defaultOpen;
}

export function useSidebarOpen(defaultOpen = true) {
  return React.useState(() => readSidebarCookie(defaultOpen));
}
