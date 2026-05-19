import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Separator } from "@/components/ui/separator";
import { useSidebarOpen } from "@/hooks/use-sidebar-open";

export default function AppSidebarLayout() {
  const [open, setOpen] = useSidebarOpen(true);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AdminSidebar />
      <SidebarRail />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="text-sm text-muted-foreground">Question Bank</div>
        </header>
        <div className="flex-1 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
