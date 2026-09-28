export type MatchOutcome = "home" | "draw" | "away";

export interface Team {
  id: string;
  name: string;
  controller?: string | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  maxPoints?: number;
}

export interface Match {
  id: string;
  jornada: number;
  casa: string;
  fora: string;
  result: MatchOutcome | null;
  locked?: boolean;
  played?: boolean;
  homeGoals?: number | null;
  awayGoals?: number | null;
}

export interface SimulationResult {
  teamId: string;
  teamName: string;
  probability: number;
  points: number;
  rank: number;
}

function createEmptyTeam(team: Team): Team {
  return {
    id: team.id,
    name: team.name,
    controller: team.controller ?? null,
    points: 0,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    maxPoints: 0,
  };
}

function getTeamMap(teams: Team[]) {
  return new Map<string, Team>(
    teams.map((team) => [team.id, createEmptyTeam(team)]),
  );
}

export function calculateStandings(teams: Team[], matches: Match[]): Team[] {
  const teamMap = getTeamMap(teams);

  for (const match of matches) {
    if (match.result == null) continue;

    const homeTeam = teamMap.get(match.casa);
    const awayTeam = teamMap.get(match.fora);

    if (!homeTeam || !awayTeam) continue;

    const homeGoals = match.homeGoals ?? 0;
    const awayGoals = match.awayGoals ?? 0;

    homeTeam.played += 1;
    awayTeam.played += 1;
    homeTeam.goalsFor += homeGoals;
    homeTeam.goalsAgainst += awayGoals;
    awayTeam.goalsFor += awayGoals;
    awayTeam.goalsAgainst += homeGoals;

    if (match.result === "home") {
      homeTeam.points += 3;
      homeTeam.wins += 1;
      awayTeam.losses += 1;
    } else if (match.result === "draw") {
      homeTeam.points += 1;
      awayTeam.points += 1;
      homeTeam.draws += 1;
      awayTeam.draws += 1;
    } else {
      awayTeam.points += 3;
      awayTeam.wins += 1;
      homeTeam.losses += 1;
    }

    homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
    awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;
  }

  return Array.from(teamMap.values())
    .map((team) => ({
      ...team,
      maxPoints: typeof team.maxPoints === "number" ? team.maxPoints : team.points,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
}

function randomOutcome(): MatchOutcome {
  return ["home", "draw", "away"][Math.floor(Math.random() * 3)] as MatchOutcome;
}

export function runMonteCarloSimulation(
  teams: Team[],
  matches: Match[],
  numSims: number,
): SimulationResult[] {
  const eligibleTeams = teams.map((team) => ({
    ...team,
    id: team.id,
    name: team.name,
  }));

  const championCounts = new Map<string, number>();
  const pointsAccumulator = new Map<string, number>();

  for (const team of eligibleTeams) {
    championCounts.set(team.id, 0);
    pointsAccumulator.set(team.id, 0);
  }

  for (let sim = 0; sim < numSims; sim += 1) {
    const scenarioMatches = matches.map((match) => ({ ...match }));

    for (const match of scenarioMatches) {
      if (match.locked || match.result !== null) continue;
      match.result = randomOutcome();
    }

    const standings = calculateStandings(eligibleTeams, scenarioMatches);
    const champion = standings[0];
    if (champion) {
      championCounts.set(champion.id, (championCounts.get(champion.id) ?? 0) + 1);
    }

    for (const team of standings) {
      const current = pointsAccumulator.get(team.id) ?? 0;
      pointsAccumulator.set(team.id, current + team.points);
    }
  }

  return eligibleTeams
    .map((team) => {
      const probability = numSims === 0 ? 0 : ((championCounts.get(team.id) ?? 0) / numSims) * 100;
      const averagePoints = numSims === 0 ? 0 : (pointsAccumulator.get(team.id) ?? 0) / numSims;

      return {
        teamId: team.id,
        teamName: team.name,
        probability,
        points: averagePoints,
        rank: 0,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}

export function runExhaustiveSimulation(
  teams: Team[],
  matches: Match[],
): SimulationResult[] | null {
  const openMatches = matches.filter((match) => !match.locked && match.result == null);

  if (openMatches.length > 10) {
    return null;
  }

  const outcomes: MatchOutcome[] = ["home", "draw", "away"];
  const championCounts = new Map<string, number>();

  for (const team of teams) {
    championCounts.set(team.id, 0);
  }

  const buildScenario = (index: number, current: Match[]): Match[] => {
    if (index === openMatches.length) {
      const scenario = matches.map((match) => {
        const openMatch = openMatches.find((candidate) => candidate.id === match.id);
        if (!openMatch) return { ...match };
        return { ...match, result: current.find((item) => item.id === match.id)?.result ?? null };
      });

      const standings = calculateStandings(teams, scenario);
      const champion = standings[0];
      if (champion) {
        championCounts.set(champion.id, (championCounts.get(champion.id) ?? 0) + 1);
      }
      return current;
    }

    const nextMatch = openMatches[index];
    if (!nextMatch) return current;
    for (const outcome of outcomes) {
      buildScenario(index + 1, [...current, { ...nextMatch, result: outcome }]);
    }

    return current;
  };

  const totalScenarios = Math.pow(3, openMatches.length);
  if (totalScenarios === 1) {
    const standings = calculateStandings(teams, matches);
    const champion = standings[0];
    if (champion) {
      championCounts.set(champion.id, 1);
    }
  } else {
    buildScenario(0, []);
  }

  const total = Math.max(totalScenarios, 1);

  return teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      probability: ((championCounts.get(team.id) ?? 0) / total) * 100,
      points: 0,
      rank: 0,
    }))
    .sort((a, b) => b.probability - a.probability);
}

export function getDecidedMatches(matches: Match[]): Match[] {
  return matches.filter((match) => match.result != null && match.locked !== false);
}

export function getUndecidedMatches(matches: Match[]): Match[] {
  return matches.filter((match) => match.result == null || !match.locked);
}

export function findDecisiveMatches(
  teams: Team[],
  matches: Match[],
): { match: Match; impact: number }[] {
  const undecided = matches.filter((match) => !match.locked && match.result == null);

  if (undecided.length === 0) {
    return [];
  }

  const baseline = calculateStandings(teams, matches);
  const baselineChampion = baseline[0]?.id ?? null;

  return undecided
    .map((match) => {
      const variations = ["home", "draw", "away"] as MatchOutcome[];
      const impacts = variations.map((outcome) => {
        const scenario = matches.map((item) => ({
          ...item,
          result: item.id === match.id ? outcome : item.result,
        }));
        const standings = calculateStandings(teams, scenario);
        return standings[0]?.id === baselineChampion ? 0 : 1;
      });

      return {
        match,
        impact: Math.max(...impacts),
      };
    })
    .sort((a, b) => b.impact - a.impact);
}
