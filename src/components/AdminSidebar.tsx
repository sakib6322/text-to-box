import { useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Target,
  User,
  FileCheck,
  BarChart3,
} from "lucide-react";
import { logout, canAccessAdmin, hasPermission, isAdmin } from "@/lib/auth";
import { SETTINGS_TAB_ANY_VIEW } from "@/lib/permissions";
import { prefetchRoute } from "@/lib/routeModules";
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
  permission?: string;
  children?: { label: string; labelKey?: keyof SidebarLabels; to: string; permission?: string }[];
};

const userItems: NavItem[] = [
  { label: "My courses", to: "/my-courses", icon: BookOpenCheck, permission: "user.courses.view" },
  { label: "My progress", labelKey: "myProgress", to: "/study/progress", icon: BarChart3, permission: "user.my_progress.view" },
  { label: "My Suggestions", labelKey: "mySuggestions", to: "/my-suggestions", icon: Target, permission: "user.my_suggestions.view" },
  { label: "My exams", labelKey: "myExams", to: "/my-exams", icon: FileCheck, permission: "user.my_exams.view" },
];

const adminUserItems: NavItem[] = [
  { label: "Home", labelKey: "home", to: "/builder", icon: School, permission: "home.view" },
  { label: "Suggestions", labelKey: "suggestions", to: "/suggestions", icon: Target, permission: "suggestions.view" },
  { label: "My Suggestions", labelKey: "mySuggestions", to: "/my-suggestions", icon: Target, permission: "user.my_suggestions.view" },
  { label: "My courses", to: "/my-courses", icon: BookOpenCheck, permission: "user.courses.view" },
  { label: "My progress", labelKey: "myProgress", to: "/study/progress", icon: BarChart3, permission: "user.my_progress.view" },
  { label: "My exams", labelKey: "myExams", to: "/my-exams", icon: FileCheck, permission: "user.my_exams.view" },
];

const adminItems: NavItem[] = [
  { label: "Dashboard", labelKey: "dashboard", to: "/admin", icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "Courses", to: "/admin/courses", icon: BookMarked, permission: "courses.view" },
  {
    label: "Question bank",
    labelKey: "questionBank",
    icon: BookOpen,
    children: [
      {
        label: "Create question (AI)",
        labelKey: "createQuestionAi",
        to: "/admin/question-bank/create-ai",
        permission: "question_bank.create_ai.view",
      },
      {
        label: "All questions",
        labelKey: "allQuestions",
        to: "/admin/question-bank/questions",
        permission: "question_bank.questions.view",
      },
    ],
  },
  {
    label: "Exam",
    labelKey: "exam",
    icon: ClipboardList,
    children: [
      { label: "Create exam", labelKey: "createExam", to: "/admin/exam/create", permission: "exam.create.view" },
      { label: "Schedules", labelKey: "schedules", to: "/admin/exam/schedules", permission: "exam.schedules.view" },
    ],
  },
  { label: "Organization", labelKey: "organization", to: "/admin/organization", icon: Bell, permission: "organization.view" },
  {
    label: "Settings",
    labelKey: "settings",
    icon: Settings,
    children: [
      { label: "General", labelKey: "general", to: "/admin/settings" },
      { label: "Appearance", labelKey: "appearance", to: "/admin/settings/appearance", permission: "settings.appearance.view" },
    ],
  },
];

function navItemVisible(item: NavItem): boolean {
  if (isAdmin()) return true;
  if (item.children?.length) {
    return item.children.some((c) => !c.permission || hasPermission(c.permission));
  }
  if (item.to === "/admin/settings") {
    return hasPermission("settings.connection.view") || hasPermission("settings.appearance.view");
  }
  return !item.permission || hasPermission(item.permission);
}

function filterNavItems(items: NavItem[]): NavItem[] {
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = item.children.filter((c) => {
          if (isAdmin()) return true;
          if (c.to === "/admin/settings") {
            return SETTINGS_TAB_ANY_VIEW.some((k) => hasPermission(k));
          }
          return !c.permission || hasPermission(c.permission);
        });
        if (children.length === 0) return null;
        return { ...item, children };
      }
      return navItemVisible(item) ? item : null;
    })
    .filter(Boolean) as NavItem[];
}

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
                  <Link
                    to={child.to}
                    onMouseEnter={() => prefetchRoute(child.to)}
                    onFocus={() => prefetchRoute(child.to)}
                  >
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
  const admin = canAccessAdmin();
  const navItems = admin
    ? filterNavItems([...adminUserItems, ...adminItems])
    : filterNavItems(userItems);
  const sidebarLabels = resolveDeviceTheme(appearance, activeDevice).global.sidebarLabels;
  const sidebarStyle = resolveDeviceTheme(appearance, activeDevice).global.sidebar;
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
        <div
          className={cn("sidebar-brand", sidebarStyle.brandShowBorder && "border-b border-sidebar-border")}
        >
          <p className="sidebar-brand-title">{sidebarStyle.brandTitle}</p>
          {sidebarStyle.brandSubtitle.trim() ? (
            <p className="sidebar-brand-subtitle">{sidebarStyle.brandSubtitle}</p>
          ) : null}
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
                      <Link
                        to={item.to ?? "#"}
                        onMouseEnter={() => item.to && prefetchRoute(item.to)}
                        onFocus={() => item.to && prefetchRoute(item.to)}
                      >
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
                <SidebarMenuButton asChild tooltip="My profile" isActive={isActive("/profile")}>
                  <Link
                    to="/profile"
                    onMouseEnter={() => prefetchRoute("/profile")}
                    onFocus={() => prefetchRoute("/profile")}
                  >
                    <User />
                    <span>My profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
