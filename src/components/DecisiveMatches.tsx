import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EscudoClube } from "@/components/EscudoClube";
import type { Match, SimulationResult, Team } from "@/lib/simulation";
import { findDecisiveMatches } from "@/lib/simulation";

interface DecisiveMatchesProps {
  teams: Team[];
  matches: Match[];
  results: SimulationResult[];
}

function getOutcomeImpact(match: Match, outcome: "home" | "draw" | "away", teams: Team[], matches: Match[], results: SimulationResult[]) {
  const resultMap = new Map(results.map((result) => [result.teamId, result.probability]));
  const baseline = Array.from(resultMap.values()).reduce((sum, value) => sum + value, 0);
  const scenario = matches.map((item) => ({
    ...item,
    result: item.id === match.id ? outcome : item.result,
  }));

  const standings = teams
    .map((team) => ({
      id: team.id,
      name: team.name,
      points: scenario.filter((item) => item.result != null).reduce((sum, item) => {
        if (item.casa === team.name && item.result === "home") return sum + 3;
        if (item.fora === team.name && item.result === "away") return sum + 3;
        if (item.casa === team.name && item.result === "draw") return sum + 1;
        if (item.fora === team.name && item.result === "draw") return sum + 1;
        return sum;
      }, 0),
    }))
    .sort((a, b) => b.points - a.points);

  const totalAfter = standings.reduce((sum, team) => sum + team.points, 0);
  return Math.max(0, (Math.abs(totalAfter - baseline) / Math.max(1, teams.length)) * 0.1);
}

export function DecisiveMatches({ teams, matches, results }: DecisiveMatchesProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const decisive = useMemo(() => {
    return findDecisiveMatches(teams, matches)
      .map((entry) => {
        const homeImpact = getOutcomeImpact(entry.match, "home", teams, matches, results);
        const drawImpact = getOutcomeImpact(entry.match, "draw", teams, matches, results);
        const awayImpact = getOutcomeImpact(entry.match, "away", teams, matches, results);
        return {
          ...entry,
          homeImpact,
          drawImpact,
          awayImpact,
          totalImpact: homeImpact + drawImpact + awayImpact,
        };
      })
      .sort((a, b) => b.totalImpact - a.totalImpact)
      .slice(0, 5);
  }, [matches, results, teams]);

  if (decisive.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Nenhum jogo decisivo encontrado.
      </div>
    );
  }

  const maxImpact = Math.max(...decisive.map((entry) => entry.totalImpact), 1);

  return (
    <div className="space-y-3">
      {decisive.map((entry, index) => {
        const match = entry.match;
        const isExpanded = Boolean(expanded[match.id]);
        const impactPercent = (entry.totalImpact / maxImpact) * 100;

        return (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  J{match.jornada}
                </div>
                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  <div className="flex items-center gap-1">
                    <EscudoClube nome={match.casa} tamanho="sm" className="h-6 w-6" />
                    <span className="truncate">{match.casa}</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center gap-1">
                    <span className="truncate">{match.fora}</span>
                    <EscudoClube nome={match.fora} tamanho="sm" className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpanded((current) => ({ ...current, [match.id]: !isExpanded }))}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {isExpanded ? "Fechar" : "Detalhes"}
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, impactPercent)}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-red-500"
              />
            </div>

            {isExpanded ? (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/20 p-2">
                  <div className="font-semibold uppercase tracking-[0.12em] text-foreground">Casa</div>
                  <div className="mt-1">{entry.homeImpact.toFixed(2)}%</div>
                </div>
                <div className="rounded-lg border border-border bg-background/20 p-2">
                  <div className="font-semibold uppercase tracking-[0.12em] text-foreground">Empate</div>
                  <div className="mt-1">{entry.drawImpact.toFixed(2)}%</div>
                </div>
                <div className="rounded-lg border border-border bg-background/20 p-2">
                  <div className="font-semibold uppercase tracking-[0.12em] text-foreground">Fora</div>
                  <div className="mt-1">{entry.awayImpact.toFixed(2)}%</div>
                </div>
              </div>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
