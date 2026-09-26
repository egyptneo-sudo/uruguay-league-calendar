import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, FlaskConical, Settings, Trophy } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getResultadosClient } from "@/lib/resultados-client";

export function AppSidebar() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    try {
      const client = getResultadosClient();
      client.auth.getSession().then(({ data }) => setSession(data.session ?? null));
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession ?? null);
      });

      return () => subscription.unsubscribe();
    } catch {
      setSession(null);
      return undefined;
    }
  }, []);

  const isCalendar = location.pathname === "/" || location.pathname.startsWith("/clube/");
  const isClassificacao = location.pathname.startsWith("/classificacao");
  const isSimulador = location.pathname.startsWith("/simulador");
  const isTaca = location.pathname.startsWith("/taca");
  const isTeamValues = location.pathname.startsWith("/team-values");
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r border-border bg-card/95">
      <SidebarHeader className="border-b border-border/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            aria-label="Liga Uruguaia"
            className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-primary"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden truncate font-display text-base font-bold text-foreground group-data-[collapsible=icon]:hidden md:block">
              Liga Uruguaia
            </span>
          </Link>

          <SidebarTrigger className="h-8 w-8 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isCalendar}
              tooltip="Calendário"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/" aria-label="Calendário" className="flex w-full items-center gap-3">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                  Calendário
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isClassificacao}
              tooltip="Classificação"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/classificacao" aria-label="Classificação" className="flex w-full items-center gap-3">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                  Classificação
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isSimulador}
              tooltip="Simulador"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/simulador" aria-label="Simulador" className="flex w-full items-center gap-3">
                <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                  Simulador
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isTaca}
              tooltip="Taça"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/taca" aria-label="Taça" className="flex w-full items-center gap-3">
                <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                  Taça
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isTeamValues}
              tooltip="Team Values"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/team-values" aria-label="Team Values" className="flex w-full items-center gap-3">
                <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                  Team Values
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {session && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isAdmin}
                tooltip="Admin"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Link to="/admin" aria-label="Admin" className="flex w-full items-center gap-3">
                  <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden truncate group-data-[collapsible=icon]:hidden md:inline">
                    Admin
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}