import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { findChampionPaths } from "@/lib/scenarios";
import type { Match, SimulationResult, Team } from "@/lib/simulation";

interface ChampionPathsProps {
  teams: Team[];
  matches: Match[];
  results: SimulationResult[];
}

export function ChampionPaths({ teams, matches, results }: ChampionPathsProps) {
  const openMatches = matches.filter((match) => match.result == null && !match.locked && !match.played).length;
  const championPaths = findChampionPaths(teams, matches);
  const liveTeams = results.filter((result) => result.probability > 0);

  if (openMatches > 15) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        Cálculo exato indisponível. Ver aba Probabilidades.
      </div>
    );
  }

  if (liveTeams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Nenhum clube pode ser campeão nas condições atuais.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {liveTeams.map((result, index) => {
        const team = teams.find((candidate) => candidate.id === result.teamId);
        const paths = championPaths.find((entry) => entry.teamId === result.teamId)?.paths ?? [];
        const teamName = team?.name ?? result.teamName;
        const leader = [...teams].sort((a, b) => b.points - a.points)[0];
        const leaderName = leader?.name ?? "lider";
        const teamPoints = team?.points ?? 0;
        const needed = Math.max(0, (leader?.points ?? 0) - teamPoints + 1);

        const bullets = team && team.id === leader?.id
          ? [
              "Lidera a corrida e pode garantir o título com um bom encaixe nas restantes jornadas.",
              `Precisa de manter pelo menos ${Math.max(0, needed)} pontos de vantagem sobre o próximo rival.`,
              `Cenários favoráveis: ${paths.length || 1} combinações detectadas.`,
            ]
          : [
              `${teamName} precisa de ganhar ${Math.max(0, needed)} pontos e esperar que ${leaderName} perca ${Math.max(0, (leader?.points ?? 0) - teamPoints)} pontos.`,
              `Há ${paths.length || 0} combinações favoráveis em caminho para o título.`,
              "Se conseguir fechar a vantagem do líder, a corrida abre para o campeonato.",
            ];

        return (
          <motion.div
            key={result.teamId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Clube em risco
                </p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{teamName}</h3>
              </div>
              <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {result.probability.toFixed(1)}%
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
                {team && team.id === leader?.id ? (
                  <span>{teamName} lidera. Pode garantir o título se:</span>
                ) : (
                  <span>{teamName} precisa de:</span>
                )}
              </div>

              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
