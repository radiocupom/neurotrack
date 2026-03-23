"use client";

import { useState } from "react";
import {
  BarChart2,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  ClipboardCheck,
  LayoutDashboard,
  List,
  MessageCircle,
  MessageSquare,
  PenLine,
  PieChart,
  PlayCircle,
  Plus,
  Smartphone,
  Menu,
  X,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/auth/types";

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];
const ALL_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN", "ENTREVISTADOR"];

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

type NavSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "usuarios",
    label: "Usuários do Sistema",
    icon: Users,
    roles: ADMIN_ROLES,
    items: [
      { id: "usuarios-listar", label: "Listar usuários", icon: List, roles: ADMIN_ROLES },
      { id: "usuarios-cadastrar", label: "Cadastrar usuário", icon: UserPlus, roles: ADMIN_ROLES },
      { id: "usuarios-editar", label: "Editar usuário", icon: UserCog, roles: ADMIN_ROLES },
    ],
  },
  {
    id: "senso",
    label: "Senso Populacional + Big Five",
    icon: Brain,
    roles: ALL_ROLES,
    items: [
      { id: "senso-criar-campanha", label: "Criar campanha", icon: Plus, roles: ADMIN_ROLES },
      { id: "senso-aplicar", label: "Aplicar pesquisa", icon: ClipboardCheck, roles: ALL_ROLES },
    ],
  },
  {
    id: "opiniao",
    label: "Pesquisa de Opinião",
    icon: MessageSquare,
    roles: ALL_ROLES,
    items: [
      { id: "opiniao-criar", label: "Criar pesquisa", icon: Plus, roles: ADMIN_ROLES },
      { id: "opiniao-listar", label: "Listar pesquisas", icon: List, roles: ALL_ROLES },
      { id: "opiniao-editar", label: "Editar pesquisa", icon: PenLine, roles: ADMIN_ROLES },
      { id: "opiniao-aplicar", label: "Aplicar pesquisa", icon: PlayCircle, roles: ALL_ROLES },
    ],
  },
  {
    id: "voto",
    label: "Intenção de Voto",
    icon: BarChart2,
    roles: ALL_ROLES,
    items: [
      { id: "voto-criar", label: "Criar pesquisa", icon: Plus, roles: ADMIN_ROLES },
      { id: "voto-listar", label: "Listar pesquisas", icon: List, roles: ALL_ROLES },
      { id: "voto-editar", label: "Editar pesquisa", icon: PenLine, roles: ADMIN_ROLES },
      { id: "voto-aplicar", label: "Aplicar pesquisa", icon: PlayCircle, roles: ALL_ROLES },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    roles: ADMIN_ROLES,
    items: [
      { id: "whatsapp-abrir", label: "Abrir WhatsApp", icon: Smartphone, roles: ADMIN_ROLES },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
    items: [
      { id: "dashboard-senso", label: "Senso + Big Five", icon: Brain, roles: ADMIN_ROLES },
      { id: "dashboard-opiniao", label: "Pesquisa de Opinião", icon: PieChart, roles: ADMIN_ROLES },
      { id: "dashboard-voto", label: "Pesquisa de Voto", icon: BarChart3, roles: ADMIN_ROLES },
      {
        id: "dashboard-entrevistadores",
        label: "Entrevistadores",
        icon: UserCheck,
        roles: ADMIN_ROLES,
      },
    ],
  },
];

function hasAccess(itemRoles: UserRole[], userRole: UserRole): boolean {
  return (itemRoles as string[]).includes(userRole as string);
}

export type SidebarProps = {
  userRole: UserRole;
  activeView: string;
  onViewChange: (view: string) => void;
};

type TooltipState = { label: string; y: number } | null;

export function Sidebar({ userRole, activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAccess(item.roles, userRole)),
  })).filter(
    (section) => hasAccess(section.roles, userRole) && section.items.length > 0,
  );

  function handleItemHover(e: React.MouseEvent<HTMLButtonElement>, label: string) {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, y: rect.top + rect.height / 2 });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu lateral"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-20 z-40 flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-slate-900/95 px-3 text-sm font-semibold text-slate-200 shadow-lg md:hidden"
      >
        <Menu className="size-4" />
        Menu
      </button>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/65 md:hidden"
        />
      ) : null}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-white/10 bg-slate-950/95 transition-transform duration-300 md:relative md:inset-auto md:z-auto md:max-w-none md:bg-slate-950/90",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-64",
        )}
      >
      {/* Collapse toggle */}
      <button
        type="button"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        onClick={() => {
          setTooltip(null);
          setCollapsed((c) => !c);
        }}
        className="absolute -right-3.5 top-6 z-20 hidden size-7 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-slate-400 shadow-md hover:border-cyan-400/40 hover:text-cyan-300 md:flex"
      >
        {collapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
      </button>

      {/* Branding strip */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-white/10 px-4 py-5",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <CircleUser className="size-4" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
                Plataforma
              </p>
              <p className="text-[10px] text-slate-500">Senso</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg border border-white/15 p-1.5 text-slate-300 md:hidden"
          aria-label="Fechar menu"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 overflow-y-auto py-3">
        {visibleSections.map((section, idx) => (
          <div key={section.id}>
            {idx > 0 && <div className="mx-3 my-2 border-t border-white/10" />}

            {/* Section header – only when expanded */}
            {!collapsed && (
              <div className="mb-1 flex items-center gap-2 px-4 pt-1">
                <section.icon className="size-3.5 shrink-0 text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
                  {section.label}
                </span>
              </div>
            )}

            {/* Items */}
            {section.items.map((item) => (
              <div
                key={item.id}
                className={cn("px-2", collapsed && "flex justify-center")}
              >
                <button
                  type="button"
                  onClick={() => {
                    onViewChange(item.id);
                    setMobileOpen(false);
                  }}
                  onMouseEnter={(e) => handleItemHover(e, item.label)}
                  onMouseLeave={() => setTooltip(null)}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    collapsed && "w-fit justify-center px-2.5",
                    activeView === item.id
                      ? "bg-cyan-400/15 text-cyan-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                  )}
                >
                  {/* Active indicator bar */}
                  {activeView === item.id && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan-400" />
                  )}
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fixed-position tooltip rendered outside overflow container */}
      {collapsed && tooltip && (
        <div
          className="pointer-events-none fixed left-[4.5rem] z-[9999] -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 shadow-xl"
          style={{ top: tooltip.y }}
        >
          {tooltip.label}
        </div>
      )}
      </nav>
    </>
  );
}
