import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AllScenarios } from "@/components/AllScenarios";
import { ChampionPaths } from "@/components/ChampionPaths";
import { DecisiveMatches } from "@/components/DecisiveMatches";
import { MatchSelector } from "@/components/MatchSelector";
import { MonteCarloView } from "@/components/MonteCarloView";
import { ProbabilityBars } from "@/components/ProbabilityBars";
import { Standings } from "@/components/Standings";
import { StatsCards } from "@/components/StatsCards";
import { TitleRaceChart } from "@/components/TitleRaceChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useControladores } from "@/lib/controladores";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";
import { calculateStandings, type Match, type MatchOutcome, type SimulationResult, type Team } from "@/lib/simulation";

const CUP_ROUNDS = new Set([7, 16, 24, 33]);

function toOutcome(
  localGoals: number | null,
  awayGoals: number | null,
): MatchOutcome | null {
  if (localGoals == null || awayGoals == null) return null;
  if (localGoals === awayGoals) return "draw";
  return localGoals > awayGoals ? "home" : "away";
}

function buildSelectorMatches(controladores: Map<string, string>): Match[] {
  const seen = new Set<string>();
  const matches: Match[] = [];

  for (const clube of liga.clubes) {
    for (const jogo of clube.jogos) {
      if (CUP_ROUNDS.has(jogo.jornada)) continue;
      if (jogo.adversario.toLowerCase() === "indefinido") continue;

      const casa = jogo.casa === true ? clube.nome : jogo.adversario;
      const fora = jogo.casa === true ? jogo.adversario : clube.nome;

      if (!controladores.has(casa) || !controladores.has(fora)) continue;

      const key = `${jogo.jornada}|${casa}|${fora}`;
      if (seen.has(key)) continue;
      seen.add(key);

      matches.push({
        id: key,
        jornada: jogo.jornada,
        casa,
        fora,
        result: null,
        locked: false,
        played: false,
      });
    }
  }

  return matches.sort((a, b) => a.jornada - b.jornada || a.casa.localeCompare(b.casa));
}

function buildAllTeams(controladores: Map<string, string>): Team[] {
  return liga.clubes.map((clube) => ({
    id: clube.nome,
    name: clube.nome,
    controller: controladores.get(clube.nome) ?? null,
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
  }));
}

export const Route = createFileRoute("/simulador")({
  component: SimuladorPage,
});

function SimuladorPage() {
  const { data: controladores } = useControladores();
  const [realMatches, setRealMatches] = useState<Match[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, MatchOutcome | null>>({});
  const [monteCarloResults, setMonteCarloResults] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchResults = async () => {
      try {
        const client = getResultadosClient();
        const { data, error } = await client
          .from("resultados")
          .select("jornada, casa, fora, golos_casa, golos_fora, jogado")
          .eq("jogado", true);

        if (error) throw error;

        const matches: Match[] = [];

        for (const item of data ?? []) {
          const jornada = Number(item.jornada);
          if (CUP_ROUNDS.has(jornada)) continue;

          const casa = String(item.casa ?? "").trim();
          const fora = String(item.fora ?? "").trim();
          if (!casa || !fora) continue;

          const key = `${jornada}|${casa}|${fora}`;
          const outcome = toOutcome(Number(item.golos_casa ?? null), Number(item.golos_fora ?? null));

          matches.push({
            id: key,
            jornada,
            casa,
            fora,
            result: outcome,
            locked: true,
            played: true,
            homeGoals: Number(item.golos_casa ?? 0),
            awayGoals: Number(item.golos_fora ?? 0),
          });
        }

        if (isMounted) {
          setRealMatches(matches);
        }
      } catch {
        if (isMounted) {
          setRealMatches([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectorMatches = useMemo(() => {
    const baseMatches = buildSelectorMatches(controladores ?? new Map());
    const realById = new Map(realMatches.map((match) => [match.id, match]));

    return baseMatches.map((match) => {
      const realMatch = realById.get(match.id);
      if (realMatch) {
        return {
          ...match,
          ...realMatch,
          locked: true,
          played: true,
          result: realMatch.result ?? null,
        };
      }

      return {
        ...match,
        result: selectedOutcomes[match.id] ?? null,
        locked: false,
        played: false,
      };
    });
  }, [controladores, realMatches, selectedOutcomes]);

  const standingsMatches = useMemo(() => {
    const byId = new Map<string, Match>();

    for (const match of realMatches) {
      byId.set(match.id, { ...match, locked: true, played: true });
    }

    for (const match of selectorMatches) {
      if (match.locked || match.played) continue;
      if (match.result == null) continue;
      byId.set(match.id, { ...match, locked: false, played: false });
    }

    return Array.from(byId.values()).sort(
      (a, b) => a.jornada - b.jornada || a.casa.localeCompare(b.casa),
    );
  }, [realMatches, selectorMatches]);

  const teams = useMemo(
    () => buildAllTeams(controladores ?? new Map()),
    [controladores],
  );

  const standings = useMemo(
    () => calculateStandings(teams, standingsMatches),
    [teams, standingsMatches],
  );

  const handleMatchChange = (matchId: string, outcome: MatchOutcome | null) => {
    setSelectedOutcomes((current) => ({
      ...current,
      [matchId]: outcome,
    }));
  };

  const handleReset = () => {
    setSelectedOutcomes((current) => {
      const next = { ...current };
      for (const match of selectorMatches) {
        if (match.locked || match.played) continue;
        delete next[match.id];
      }
      return next;
    });
  };

  const handleSimulateAll = () => {
    const options: MatchOutcome[] = ["home", "draw", "away"];
    const next = { ...selectedOutcomes };

    for (const match of selectorMatches) {
      if (match.locked || match.played) continue;
      next[match.id] = options[Math.floor(Math.random() * options.length)];
    }

    setSelectedOutcomes(next);
  };

  return (
    <div className="page-backdrop min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Simulador</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Corrida ao título OSM
          </h1>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            A carregar simulação...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-6">
              <MatchSelector
                matches={selectorMatches}
                onChange={handleMatchChange}
                onReset={handleReset}
                onSimulateAll={handleSimulateAll}
              />

              <MonteCarloView
                teams={teams}
                matches={selectorMatches}
                onResultsChange={setMonteCarloResults}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <StatsCards teams={standings} matches={standingsMatches} />

              <Standings teams={standings} />

              <Tabs defaultValue="probabilidades" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-auto">
                  <TabsTrigger value="probabilidades">Probabilidades</TabsTrigger>
                  <TabsTrigger value="caminhos">Caminhos</TabsTrigger>
                  <TabsTrigger value="cenarios">Cenários</TabsTrigger>
                  <TabsTrigger value="decisivos">Decisivos</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="probabilidades" className="mt-4">
                  <ProbabilityBars
                    results={monteCarloResults}
                    teams={standings}
                    matches={standingsMatches}
                  />
                </TabsContent>

                <TabsContent value="caminhos" className="mt-4">
                  <ChampionPaths teams={standings} matches={standingsMatches} results={monteCarloResults} />
                </TabsContent>

                <TabsContent value="cenarios" className="mt-4">
                  <AllScenarios teams={standings} matches={standingsMatches} results={monteCarloResults} />
                </TabsContent>

                <TabsContent value="decisivos" className="mt-4">
                  <DecisiveMatches teams={standings} matches={standingsMatches} results={monteCarloResults} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <TitleRaceChart teams={standings} matches={standingsMatches} results={monteCarloResults} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
