import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Lock, RefreshCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Match, MatchOutcome } from "@/lib/simulation";

interface MatchSelectorProps {
  matches: Match[];
  onChange: (matchId: string, outcome: MatchOutcome | null) => void;
  onReset: () => void;
  onSimulateAll: () => void;
}

const outcomeLabels: Record<MatchOutcome, string> = {
  home: "Casa",
  draw: "Empate",
  away: "Fora",
};

export function MatchSelector({
  matches,
  onChange,
  onReset,
  onSimulateAll,
}: MatchSelectorProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const jornadaGroups = useMemo(() => {
    const groups = new Map<number, Match[]>();

    for (const match of matches) {
      const jornada = match.jornada;
      const current = groups.get(jornada) ?? [];
      current.push(match);
      groups.set(jornada, current);
    }

    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [matches]);

  const toggleJornada = (jornada: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(jornada)) {
        next.delete(jornada);
      } else {
        next.add(jornada);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(jornadaGroups.map(([jornada]) => jornada)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Jogos em aberto
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Match selector</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            Expandir Tudo
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            Colapsar Tudo
          </button>
          <button
            type="button"
            onClick={onSimulateAll}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Simular Tudo
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            Nenhum jogo elegível para simulação.
          </div>
        ) : (
          jornadaGroups.map(([jornada, jornadaMatches]) => {
            const isExpanded = expanded.has(jornada);
            const simulatedCount = jornadaMatches.filter((match) => match.result != null).length;

            return (
              <div
                key={jornada}
                className="overflow-hidden rounded-xl border border-border bg-background/20"
              >
                <button
                  type="button"
                  onClick={() => toggleJornada(jornada)}
                  className="flex w-full items-center justify-between gap-3 bg-card px-3 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="text-sm">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <span className="text-sm font-bold">Jornada {jornada}</span>
                    <span className="text-xs text-muted-foreground">
                      {jornadaMatches.length} jogo{jornadaMatches.length === 1 ? "" : "s"} em aberto
                    </span>
                  </div>

                  {simulatedCount > 0 ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                      {simulatedCount} simulad{simulatedCount === 1 ? "o" : "os"}
                    </span>
                  ) : null}
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 border-t border-border bg-background/20 p-3">
                        {jornadaMatches.map((match) => {
                          const selected = match.result;
                          const isLocked = Boolean(match.locked || match.played);

                          return (
                            <div
                              key={match.id}
                              className="rounded-xl border border-border bg-background/30 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-semibold uppercase tracking-[0.12em] text-foreground">
                                    J{match.jornada}
                                  </span>
                                  {isLocked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                                </div>
                                {isLocked ? (
                                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                    Bloqueado
                                  </span>
                                ) : null}
                              </div>

                              <div className="mb-3 text-sm font-semibold text-foreground">
                                <div className="flex items-center justify-between gap-2">
                                  <span>{match.casa}</span>
                                  <span className="text-muted-foreground">vs</span>
                                  <span>{match.fora}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {(["home", "draw", "away"] as MatchOutcome[]).map((outcome) => {
                                  const isActive = selected === outcome;
                                  return (
                                    <button
                                      key={`${match.id}-${outcome}`}
                                      type="button"
                                      disabled={isLocked}
                                      onClick={() => onChange(match.id, outcome)}
                                      className={cn(
                                        "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                                        isActive && !isLocked
                                          ? "border-primary bg-primary/15 text-primary"
                                          : "border-border bg-background text-foreground hover:bg-accent",
                                        isLocked && "cursor-not-allowed opacity-60",
                                      )}
                                    >
                                      {outcomeLabels[outcome]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
