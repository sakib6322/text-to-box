import { useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { logout } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  to?: string;
  icon?: ComponentType<{ className?: string }>;
  children?: { label: string; to: string }[];
};

const items: NavItem[] = [
  { label: "Home", to: "/", icon: School },
  { label: "Suggestions", to: "/suggestions", icon: Target },
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  {
    label: "Question bank",
    icon: BookOpen,
    children: [
      { label: "Create question (AI)", to: "/admin/question-bank/create-ai" },
      { label: "All questions", to: "/admin/question-bank/questions" },
    ],
  },
  {
    label: "Exam",
    icon: ClipboardList,
    children: [
      { label: "Create exam", to: "/admin/exam/create" },
      { label: "Schedules", to: "/admin/exam/schedules" },
    ],
  },
  { label: "Student", to: "/admin/students", icon: GraduationCap },
  { label: "Teacher", to: "/admin/teachers", icon: Users },
  { label: "Organization", to: "/admin/organization", icon: Bell },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

function NavDropdown({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: (to?: string) => boolean;
}) {
  const isMobile = useIsMobile();
  const Icon = item.icon;
  const childActive = item.children?.some((c) => isActive(c.to)) ?? false;
  const [open, setOpen] = useState(childActive);
  const isOpen = open || childActive;

  return (
    <Collapsible open={isOpen} onOpenChange={setOpen}>
      <SidebarMenuItem
        onMouseEnter={() => {
          if (!isMobile) setOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile && !childActive) setOpen(false);
        }}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.label} isActive={childActive}>
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
            <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                  <Link to={child.to}>
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (to?: string) =>
    to ? location.pathname === to || location.pathname.startsWith(`${to}/`) : false;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="sidebar-brand border-b border-sidebar-border">
          <p className="sidebar-brand-title">PG Diary</p>
          <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Question Bank</p>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                if (item.children?.length) {
                  return <NavDropdown key={item.label} item={item} isActive={isActive} />;
                }

                return (
                  <SidebarMenuItem key={item.to ?? item.label}>
                    <SidebarMenuButton asChild tooltip={item.label} isActive={isActive(item.to)}>
                      <Link to={item.to ?? "#"}>
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Sign out">
                  <LogOut />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
