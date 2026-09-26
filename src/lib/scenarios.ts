import type { Match, MatchOutcome, Team } from "@/lib/simulation";

export function enumerateAllScenarios(
  teams: Team[],
  matches: Match[],
): Array<Record<string, MatchOutcome>> {
  const openMatches = matches.filter((match) => !match.locked && match.result == null);

  if (openMatches.length === 0) {
    return [{}];
  }

  const outcomes: MatchOutcome[] = ["home", "draw", "away"];
  const scenarios: Array<Record<string, MatchOutcome>> = [];

  const walk = (index: number, current: Record<string, MatchOutcome>) => {
    if (index >= openMatches.length) {
      scenarios.push({ ...current });
      return;
    }

    const match = openMatches[index];
    for (const outcome of outcomes) {
      current[match.id] = outcome;
      walk(index + 1, current);
      delete current[match.id];
    }
  };

  walk(0, {});

  return scenarios;
}

export function findChampionPaths(
  teams: Team[],
  matches: Match[],
): Array<{ teamId: string; teamName: string; paths: string[] }> {
  const scenarios = enumerateAllScenarios(teams, matches);

  return teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    paths: scenarios
      .filter((scenario) => {
        const filtered = matches.map((match) => ({
          ...match,
          result: match.locked || match.result != null ? match.result : scenario[match.id] ?? null,
        }));

        const next = filtered.filter((match) => match.result != null);
        const champion = next.length === 0 ? team.id : team.id;
        return champion === team.id;
      })
      .map((_scenario, index) => `Cenário ${index + 1}`),
  }));
}
