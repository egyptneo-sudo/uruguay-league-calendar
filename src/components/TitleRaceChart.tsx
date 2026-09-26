import { motion } from "framer-motion";
import { EscudoClube } from "@/components/EscudoClube";
import type { Match, SimulationResult, Team } from "@/lib/simulation";

interface TitleRaceChartProps {
  teams: Team[];
  matches: Match[];
  results: SimulationResult[];
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

export function TitleRaceChart({ teams, results }: TitleRaceChartProps) {
  const byTeam = new Map(results.map((result) => [result.teamId, result.probability]));

  const data = teams
    .map((team, index) => ({
      team,
      value: byTeam.get(team.id) ?? 0,
      gradient: gradientPalette[index % gradientPalette.length],
    }))
    .sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Sem dados atuais para mostrar o snapshot da corrida.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex h-56 items-end justify-between gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4">
        {data.map(({ team, value, gradient }, index) => (
          <div key={team.id} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div className="text-[10px] font-semibold text-muted-foreground">{value.toFixed(1)}%</div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (value / maxValue) * 100)}%` }}
              transition={{ duration: 0.5, delay: index * 0.04, ease: "easeOut" }}
              className={`w-full rounded-t-xl bg-gradient-to-t ${gradient}`}
            />
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {data.map(({ team, value, gradient }, index) => (
          <div key={team.id} className="flex items-center gap-2 rounded-xl border border-border bg-background/20 p-2">
            <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${gradient}`} />
            <EscudoClube nome={team.name} tamanho="sm" className="h-6 w-6" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{team.name}</div>
              <div className="text-[10px] text-muted-foreground">{value.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
