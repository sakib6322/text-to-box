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
  FileCheck,
  BarChart3,
} from "lucide-react";
import { logout, isAdmin } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { resolveDeviceTheme, type SidebarLabels } from "@/lib/uiAppearance";
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
  labelKey?: keyof SidebarLabels;
  to?: string;
  icon?: ComponentType<{ className?: string }>;
  children?: { label: string; labelKey?: keyof SidebarLabels; to: string }[];
};

const userItems: NavItem[] = [
  { label: "My progress", labelKey: "myProgress", to: "/study/progress", icon: BarChart3 },
  { label: "My Suggestions", labelKey: "mySuggestions", to: "/my-suggestions", icon: Target },
  { label: "My exams", labelKey: "myExams", to: "/my-exams", icon: FileCheck },
];

const adminUserItems: NavItem[] = [
  { label: "Home", labelKey: "home", to: "/", icon: School },
  { label: "Suggestions", labelKey: "suggestions", to: "/suggestions", icon: Target },
  { label: "My Suggestions", labelKey: "mySuggestions", to: "/my-suggestions", icon: Target },
  { label: "My progress", labelKey: "myProgress", to: "/study/progress", icon: BarChart3 },
  { label: "My exams", labelKey: "myExams", to: "/my-exams", icon: FileCheck },
];

const adminItems: NavItem[] = [
  { label: "Dashboard", labelKey: "dashboard", to: "/admin", icon: LayoutDashboard },
  {
    label: "Question bank",
    labelKey: "questionBank",
    icon: BookOpen,
    children: [
      { label: "Create question (AI)", labelKey: "createQuestionAi", to: "/admin/question-bank/create-ai" },
      { label: "All questions", labelKey: "allQuestions", to: "/admin/question-bank/questions" },
    ],
  },
  {
    label: "Exam",
    labelKey: "exam",
    icon: ClipboardList,
    children: [
      { label: "Create exam", labelKey: "createExam", to: "/admin/exam/create" },
      { label: "Schedules", labelKey: "schedules", to: "/admin/exam/schedules" },
    ],
  },
  { label: "Student", labelKey: "student", to: "/admin/students", icon: GraduationCap },
  { label: "Teacher", labelKey: "teacher", to: "/admin/teachers", icon: Users },
  { label: "Organization", labelKey: "organization", to: "/admin/organization", icon: Bell },
  {
    label: "Settings",
    labelKey: "settings",
    icon: Settings,
    children: [
      { label: "General", labelKey: "general", to: "/admin/settings" },
      { label: "Appearance", labelKey: "appearance", to: "/admin/settings/appearance" },
    ],
  },
];

const items: NavItem[] = [...adminUserItems, ...adminItems];

function NavDropdown({
  item,
  isActive,
  labelFor,
}: {
  item: NavItem;
  isActive: (to?: string) => boolean;
  labelFor: (key: keyof SidebarLabels | undefined, fallback: string) => string;
}) {
  const isMobile = useIsMobile();
  const Icon = item.icon;
  const childActive = item.children?.some((c) => isActive(c.to)) ?? false;
  const [open, setOpen] = useState(childActive);
  const isOpen = open || childActive;
  const itemLabel = labelFor(item.labelKey, item.label);

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
          <SidebarMenuButton tooltip={itemLabel} isActive={childActive}>
            {Icon ? <Icon /> : null}
            <span>{itemLabel}</span>
            <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden">
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                  <Link to={child.to}>
                    <span>{labelFor(child.labelKey, child.label)}</span>
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
  const { appearance, activeDevice } = useUiAppearance();
  const admin = isAdmin();
  const navItems = admin ? items : userItems;
  const sidebarLabels = resolveDeviceTheme(appearance, activeDevice).global.sidebarLabels;
  const isActive = (to?: string) =>
    to ? location.pathname === to || location.pathname.startsWith(`${to}/`) : false;
  const labelFor = (key: keyof SidebarLabels | undefined, fallback: string) => (key ? sidebarLabels[key] || fallback : fallback);

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
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.children?.length) {
                  return <NavDropdown key={item.label} item={item} isActive={isActive} labelFor={labelFor} />;
                }

                const itemLabel = labelFor(item.labelKey, item.label);
                return (
                  <SidebarMenuItem key={item.to ?? item.label}>
                    <SidebarMenuButton asChild tooltip={itemLabel} isActive={isActive(item.to)}>
                      <Link to={item.to ?? "#"}>
                        {Icon ? <Icon /> : null}
                        <span>{itemLabel}</span>
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
                <SidebarMenuButton onClick={handleLogout} tooltip={sidebarLabels.signOut}>
                  <LogOut />
                  <span>{sidebarLabels.signOut}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
