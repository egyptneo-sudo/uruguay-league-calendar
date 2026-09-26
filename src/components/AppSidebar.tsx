import { BarChart3, CalendarDays, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const itemClass =
  "flex h-12 items-center justify-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:justify-start";

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-20 flex-col border-r border-border bg-card/95 px-3 py-5 backdrop-blur md:w-64 md:px-4 md:py-7">
      <Link
        to="/"
        aria-label="Liga Uruguaia"
        className="mb-8 flex h-12 items-center justify-center gap-3 text-primary md:justify-start md:px-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-display hidden text-lg font-bold text-foreground md:block">
          Liga Uruguaia
        </span>
      </Link>

      <nav aria-label="Navegação principal" className="space-y-2">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          aria-label="Calendário"
          title="Calendário"
          className={itemClass}
          activeProps={{
            className: cn(itemClass, "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"),
          }}
        >
          <CalendarDays className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="hidden md:block">Calendário</span>
        </Link>
        <Link
          to="/team-values"
          aria-label="Team Values"
          title="Team Values"
          className={itemClass}
          activeProps={{
            className: cn(itemClass, "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"),
          }}
        >
          <BarChart3 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="hidden md:block">Team Values</span>
        </Link>
      </nav>
    </aside>
  );
}