import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Separator } from "@/components/ui/separator";
import { useSidebarOpen } from "@/hooks/use-sidebar-open";

export default function AdminLayout() {
  const [open, setOpen] = useSidebarOpen(true);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AdminSidebar />
      <SidebarRail />
      <SidebarInset className="app-mesh-bg">
        <header className="app-header-bar flex h-14 items-center gap-2 px-4">
          <SidebarTrigger className="text-primary" />
          <Separator orientation="vertical" className="h-5" />
          <div className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Panel
          </div>
        </header>
        <div className="app-mesh-content flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

