import { Trophy } from "lucide-react";
import type { Team } from "@/lib/simulation";

interface StandingsProps {
  teams: Team[];
}

export function Standings({ teams }: StandingsProps) {
  const first = teams[0];
  const second = teams[1];
  const hasLeaderBadge = !!first && !!second && first.points > second.points;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-foreground">Classificação da corrida</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Clube</th>
              <th className="px-3 py-3">Pts</th>
              <th className="px-3 py-3">PJ</th>
              <th className="px-3 py-3">Máx</th>
              <th className="px-3 py-3">%</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <tr key={team.id} className="border-t border-border bg-background/20">
                <td className="px-3 py-3 font-semibold text-foreground">{index + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{team.name}</span>
                    {index === 0 && hasLeaderBadge ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                        Lider
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 font-semibold text-foreground">{team.points}</td>
                <td className="px-3 py-3 text-muted-foreground">{team.played}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {team.maxPoints === team.points ? "—" : team.maxPoints ?? team.points}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{Math.max(0, team.points)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
