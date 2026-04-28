import type { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  School,
  Settings,
  Target,
  Users,
} from "lucide-react";

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
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  {
    label: "Academic",
    icon: Target,
    children: [
      { label: "Classes", to: "/admin/academic/classes" },
      { label: "Subjects", to: "/admin/academic/subjects" },
    ],
  },
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
  { label: "Practice sheet", to: "/admin/practice-sheets", icon: School },
  { label: "Student", to: "/admin/students", icon: GraduationCap },
  { label: "Teacher", to: "/admin/teachers", icon: Users },
  { label: "Organization", to: "/admin/organization", icon: Bell },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const isActive = (to?: string) => (to ? location.pathname === to || location.pathname.startsWith(`${to}/`) : false);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                if (item.children?.length) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton tooltip={item.label} isActive={item.children.some((c) => isActive(c.to))}>
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.to}>
                            <SidebarMenuSubButton asChild isActive={isActive(child.to)}>
                              <Link to={child.to}>
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                  );
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
      </SidebarContent>
    </Sidebar>
  );
}
