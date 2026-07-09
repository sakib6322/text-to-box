import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Separator } from "@/components/ui/separator";
import { useSidebarOpen } from "@/hooks/use-sidebar-open";
import { AppShellHeader } from "@/components/AppShellHeader";

export default function AdminLayout() {
  const [open, setOpen] = useSidebarOpen(true);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <AdminSidebar />
      <SidebarRail />
      <SidebarInset className="app-mesh-bg">
        <AppShellHeader
          title="Admin Panel"
          leftSlot={
            <>
              <SidebarTrigger className="text-primary" />
              <Separator orientation="vertical" className="h-5" />
            </>
          }
        />
        <div className="app-mesh-content flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

