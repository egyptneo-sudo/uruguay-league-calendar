import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw } from "lucide-react";
import {
  runExhaustiveSimulation,
  runMonteCarloSimulation,
  type Match,
  type SimulationResult,
  type Team,
} from "@/lib/simulation";

interface MonteCarloViewProps {
  teams: Team[];
  matches: Match[];
  onResultsChange?: (results: SimulationResult[]) => void;
}

function getDelta(a: number, b: number) {
  return Math.abs(a - b);
}

export function MonteCarloView({
  teams,
  matches,
  onResultsChange,
}: MonteCarloViewProps) {
  const [iterations, setIterations] = useState(10_000);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<{
    exact: SimulationResult[] | null;
    mc: SimulationResult[];
  } | null>(null);

  const handleSimulate = () => {
    setLoading(true);

    window.setTimeout(() => {
      const exact = runExhaustiveSimulation(teams, matches);
      const mc = runMonteCarloSimulation(teams, matches, iterations);

      setLastRun({ exact, mc });
      onResultsChange?.(mc);
      setLoading(false);
    }, 50);
  };

  const rows = useMemo(() => {
    if (!lastRun) return [];

    const exactMap = new Map((lastRun.exact ?? []).map((result) => [result.teamId, result]));

    return teams
      .map((team) => {
        const exact = exactMap.get(team.id)?.probability ?? 0;
        const mc = lastRun.mc.find((result) => result.teamId === team.id)?.probability ?? 0;
        return {
          team,
          exact,
          mc,
          delta: getDelta(exact, mc),
        };
      })
      .sort((a, b) => b.mc - a.mc);
  }, [lastRun, teams]);

  const hasExactResults = lastRun?.exact !== null && lastRun?.exact !== undefined;

  const meanDelta =
    hasExactResults && rows.length
      ? rows.reduce((sum, row) => sum + row.delta, 0) / rows.length
      : null;

  const precisionLabel =
    meanDelta == null ? null : meanDelta < 1 ? "Excelente" : meanDelta < 3 ? "Boa" : "Fraca";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Monte Carlo
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Probabilidades</h2>
        </div>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {loading ? "A simular..." : "Simular"}
        </button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Iterações</span>
          <span className="font-semibold text-foreground">{iterations.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={100}
          max={100000}
          step={100}
          value={iterations}
          onChange={(event) => setIterations(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
        />
      </div>

      {lastRun ? (
        <div className="space-y-4">
          {lastRun.exact === null ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Demasiados jogos para cálculo exato. Só Monte Carlo.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Clube</th>
                  <th className="px-3 py-2">Prob. Exata</th>
                  <th className="px-3 py-2">Prob. MC</th>
                  <th className="px-3 py-2">Δ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ team, exact, mc, delta }) => {
                  const deltaTone =
                    delta < 1 ? "text-emerald-500" : delta < 3 ? "text-yellow-500" : "text-red-500";

                  return (
                    <tr key={team.id} className="border-t border-border bg-background/20">
                      <td className="px-3 py-2 font-medium text-foreground">{team.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {lastRun.exact ? `${exact.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{mc.toFixed(2)}%</td>
                      <td className={`px-3 py-2 font-semibold ${lastRun.exact ? deltaTone : "text-muted-foreground"}`}>
                        {lastRun.exact ? `${delta.toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasExactResults && meanDelta !== null ? (
            <div className="rounded-xl border border-border bg-background/30 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Precisão global</span>
                <span className="font-semibold text-foreground">{precisionLabel}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">{meanDelta.toFixed(2)}%</div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/30 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>Precisão global</span>
                <span className="font-semibold text-foreground">N/D</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">N/D</div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-background/20 p-4 text-sm text-muted-foreground">
          Ainda não foi executada nenhuma simulação.
        </div>
      )}
    </motion.div>
  );
}
