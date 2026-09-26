import { motion } from "framer-motion";
import { BarChart3, Crown, Flame, Target } from "lucide-react";
import { findDecisiveMatches, type Match, type Team } from "@/lib/simulation";

interface StatsCardsProps {
  teams: Team[];
  matches: Match[];
}

export function StatsCards({ teams, matches }: StatsCardsProps) {
  const leader = [...teams].sort((a, b) => b.points - a.points)[0];
  const rivals = [...teams].filter((team) => team.id !== leader?.id).sort((a, b) => b.points - a.points);
  const magicNumber = leader
    ? Math.max(0, (rivals[0]?.points ?? 0) - leader.points + 1)
    : 0;

  const openMatches = matches.filter((match) => match.result == null && !match.locked && !match.played).length;
  const scenariosValue = openMatches > 0 ? Math.pow(3, openMatches) : 1;
  const scenariosLabel = openMatches > 10 ? "> 3^10 (demasiados)" : `${3}^{openMatches}`;

  const decisiveMatches = findDecisiveMatches(teams, matches).filter((item) => item.impact > 5).length;

  const cards = [
    {
      icon: Crown,
      label: "Líder",
      value: leader ? `${leader.name} • ${leader.points} pts` : "—",
      accent: "text-yellow-500",
    },
    {
      icon: Target,
      label: "Magic Number",
      value: leader ? `${magicNumber} pts` : "—",
      accent: "text-blue-500",
    },
    {
      icon: BarChart3,
      label: "Cenários",
      value: openMatches > 10 ? "> 3^10 (demasiados)" : `${scenariosValue.toLocaleString()}`,
      accent: "text-emerald-500",
    },
    {
      icon: Flame,
      label: "Jogos decisivos",
      value: `${decisiveMatches}`,
      accent: "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ icon: Icon, label, value, accent }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
            <span>{label}</span>
          </div>
          <div className="text-base font-bold text-foreground">{value}</div>
        </motion.div>
      ))}
    </div>
  );
}
