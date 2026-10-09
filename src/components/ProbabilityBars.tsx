import { motion } from "framer-motion";
import { EscudoClube } from "@/components/EscudoClube";
import { useControladores } from "@/lib/controladores";
import type { SimulationResult, Team } from "@/lib/simulation";
import { cn } from "@/lib/utils";

interface ProbabilityBarsProps {
  results: SimulationResult[];
  teams: Team[];
}

const gradientPalette = [
  "from-emerald-500 via-green-400 to-lime-400",
  "from-sky-500 via-cyan-400 to-blue-400",
  "from-violet-500 via-purple-400 to-fuchsia-400",
  "from-amber-500 via-orange-400 to-yellow-400",
  "from-rose-500 via-pink-400 to-red-400",
  "from-slate-500 via-zinc-400 to-stone-400",
  "from-teal-500 via-emerald-400 to-green-400",
  "from-indigo-500 via-blue-400 to-cyan-400",
  "from-fuchsia-500 via-violet-400 to-purple-400",
  "from-red-500 via-rose-400 to-orange-400",
];

export function ProbabilityBars({ results, teams }: ProbabilityBarsProps) {
  const { data: controladores } = useControladores();
  const leader = [...teams].sort((a, b) => b.points - a.points)[0];
  const leaderIsChampion = Boolean(
    leader && teams.every((team) => team.id === leader.id || (team.maxPoints ?? team.points) < leader.points),
  );

  const resultMap = new Map(results.map((result) => [result.teamId, result]));

  const allTeams = teams.map((team) => {
    const result = resultMap.get(team.id);
    const hasManager = Boolean(controladores?.has(team.name));
    const probability = hasManager ? result?.probability ?? 0 : 0;

    const maxPossible = team.maxPoints ?? team.points;
    const status = hasManager
      ? leaderIsChampion && team.id === leader?.id
        ? "Campeão"
        : leader && team.id !== leader.id && maxPossible < leader.points
          ? "Eliminado"
          : "Na corrida"
      : "Sem manager";

    return {
      team,
      hasManager,
      probability,
      controller: controladores?.get(team.name) ?? "Sem controlador",
      status,
    };
  });

  const ordered = [...allTeams].sort((a, b) => {
    if (a.hasManager !== b.hasManager) return a.hasManager ? -1 : 1;
    if (a.hasManager && b.hasManager) return b.probability - a.probability;
    return a.team.name.localeCompare(b.team.name);
  });

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Ainda não há probabilidades calculadas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ordered.map(({ team, hasManager, probability, controller, status }, index) => {
        const gradient = hasManager
          ? probability >= 100
            ? "from-emerald-500 via-green-400 to-lime-400"
            : probability <= 0
              ? "from-slate-300 via-slate-200 to-slate-100"
              : gradientPalette[index % gradientPalette.length]
          : "from-slate-400 via-slate-300 to-slate-200";

        const badgeText = hasManager
          ? status === "Campeão"
            ? "🟢 Campeão"
            : status === "Eliminado"
              ? "🔴 Eliminado"
              : "🟡 Na corrida"
          : "Sem manager";

        return (
          <div key={team.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <EscudoClube nome={team.name} tamanho="sm" className="h-6 w-6" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{team.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {hasManager ? controller : "Não simulado"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                  !hasManager && "bg-slate-500/15 text-slate-400",
                  hasManager && status === "Campeão" && "bg-emerald-500/15 text-emerald-500",
                  hasManager && status === "Na corrida" && "bg-yellow-500/15 text-yellow-500",
                  hasManager && status === "Eliminado" && "bg-red-500/15 text-red-500",
                )}>
                  {badgeText}
                </span>
                <span className={cn("text-sm font-bold", hasManager ? "text-foreground" : "text-slate-400")}>
                  {hasManager ? `${probability.toFixed(1)}%` : "0.0%"}
                </span>
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: hasManager ? `${Math.min(100, Math.max(0, probability))}%` : "0%" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 }}
                className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
