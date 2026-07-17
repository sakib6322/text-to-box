/** Shared responsive shells for study / practice / exam user pages */
export const userPageShell =
  "mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl min-h-[80vh] pb-24 md:pb-10 space-y-4 md:space-y-6 px-0 md:px-2 min-w-0 overflow-x-hidden";

export const userPageShellTight =
  "mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl pb-8 md:pb-10 space-y-4 md:space-y-6 px-0 md:px-2 min-w-0 overflow-x-hidden";

/** Mobile: two-row chrome (title + actions). Desktop: single row. */
export const userStickyHeader =
  "sticky top-0 z-20 bg-background/95 border-b px-3 py-2.5 md:px-2 md:py-4 md:rounded-lg flex flex-wrap items-center gap-x-2 gap-y-2 min-w-0";

export const userStickyHeaderActions =
  "flex items-center justify-end gap-1.5 w-full sm:w-auto sm:ml-auto shrink-0";

export const userContentCard = "mx-3 md:mx-0 p-4 md:p-6 space-y-4 min-w-0 overflow-x-hidden";

export const userBottomBar =
  "fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 p-3 safe-area-pb md:static md:border-0 md:bg-transparent md:p-0 md:mt-4";

export const userBottomBarInner =
  "mx-auto flex w-full max-w-lg md:max-w-3xl lg:max-w-5xl gap-2 min-w-0";

/** Icon-only on narrow phones; label visible from sm up */
export const userHeaderActionBtn = "h-8 shrink-0 px-2 text-xs sm:px-3";
export const userHeaderActionLabel = "hidden sm:inline";
