import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { calculateStandings, type Match, type SimulationResult, type Team } from "@/lib/simulation";
import { enumerateAllScenarios } from "@/lib/scenarios";

interface AllScenariosProps {
  teams: Team[];
  matches: Match[];
  results: SimulationResult[];
}

const PAGE_SIZE = 50;

export function AllScenarios({ teams, matches }: AllScenariosProps) {
  const [selectedChampion, setSelectedChampion] = useState<string>("all");
  const [selectedOutcome, setSelectedOutcome] = useState<"all" | "home" | "draw" | "away">("all");
  const [page, setPage] = useState(1);

  const openMatches = matches.filter((match) => match.result == null && !match.locked && !match.played).length;

  const scenarios = useMemo(() => {
    if (openMatches > 10) return [];
    return enumerateAllScenarios(teams, matches).map((scenario, index) => {
      const scenarioMatches = matches.map((match) => ({
        ...match,
        result: match.locked || match.result != null ? match.result : scenario[match.id] ?? null,
      }));

      const standings = calculateStandings(teams, scenarioMatches);
      const champion = standings[0]?.name ?? "—";
      const homeWins = Object.values(scenario).filter((value) => value === "home").length;
      const drawWins = Object.values(scenario).filter((value) => value === "draw").length;
      const awayWins = Object.values(scenario).filter((value) => value === "away").length;

      return {
        id: index + 1,
        champion,
        homeWins,
        drawWins,
        awayWins,
        outcome: Object.values(scenario).reduce(
          (acc, val) => {
            if (val === "home") return "home";
            if (val === "away") return "away";
            return acc;
          },
          "draw" as "home" | "draw" | "away",
        ),
      };
    });
  }, [matches, openMatches, teams]);

  const totalScenarios = Math.pow(3, openMatches);

  if (openMatches > 10) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        Demasiados jogos em aberto (N = {openMatches}). Cenários totais = 3^{openMatches} = impossível de enumerar. Reduz jogos em aberto para ver.
      </div>
    );
  }

  const filteredScenarios = scenarios.filter((scenario) => {
    const championMatch = selectedChampion === "all" || scenario.champion === selectedChampion;
    const outcomeMatch =
      selectedOutcome === "all" ||
      (selectedOutcome === "home" && scenario.homeWins > 0) ||
      (selectedOutcome === "draw" && scenario.drawWins > 0) ||
      (selectedOutcome === "away" && scenario.awayWins > 0);

    return championMatch && outcomeMatch;
  });

  const pageCount = Math.max(1, Math.ceil(filteredScenarios.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedScenarios = filteredScenarios.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedChampion}
            onChange={(event) => {
              setSelectedChampion(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">Todos</option>
            {teams.map((team) => (
              <option key={team.id} value={team.name}>
                {team.name}
              </option>
            ))}
          </select>

          <select
            value={selectedOutcome}
            onChange={(event) => {
              setSelectedOutcome(event.target.value as "all" | "home" | "draw" | "away");
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">Todos os resultados</option>
            <option value="home">Vitória Casa</option>
            <option value="draw">Empate</option>
            <option value="away">Vitória Fora</option>
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredScenarios.length} cenários totais · {totalScenarios.toLocaleString()} possíveis
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Resultado Casa</th>
              <th className="px-3 py-2">Resultado Fora</th>
              <th className="px-3 py-2">Campeão</th>
            </tr>
          </thead>
          <tbody>
            {pagedScenarios.map((scenario) => (
              <motion.tr
                key={scenario.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-t border-border bg-background/20"
              >
                <td className="px-3 py-2 text-foreground">{scenario.id}</td>
                <td className="px-3 py-2 text-muted-foreground">{scenario.homeWins}</td>
                <td className="px-3 py-2 text-muted-foreground">{scenario.awayWins}</td>
                <td className="px-3 py-2 font-medium text-foreground">{scenario.champion}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={safePage <= 1}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        <span className="text-sm text-muted-foreground">
          Página {safePage} / {pageCount}
        </span>

        <button
          type="button"
          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          disabled={safePage >= pageCount}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Seguinte
        </button>
      </div>
    </div>
  );
}
