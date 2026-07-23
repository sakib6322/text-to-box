import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function PageFallback({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground" role="status">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function withPageSuspense(children: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/** Route-level lazy page with its own Suspense boundary (layout stays mounted). */
export function lazyPage<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Comp = lazy(loader);
  function LazyRoutePage(props: P) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Comp {...props} />
      </Suspense>
    );
  }
  return LazyRoutePage;
}
