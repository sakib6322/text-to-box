import { useCallback } from "react";
import { useNavigate, type To } from "react-router-dom";

function historyCanGoBack(): boolean {
  if (typeof window === "undefined") return false;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === "number") return idx > 0;
  // Same-origin referrer usually means we arrived from another app page
  try {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return window.history.length > 1;
}

/** Prefer browser/SPA previous entry; only use fallback when there is no history. */
export function useAppBack(fallback: To = "/my-suggestions") {
  const navigate = useNavigate();
  return useCallback(() => {
    if (historyCanGoBack()) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [navigate, fallback]);
}
