import { useState } from "react";
import { escudos } from "@/lib/escudos";
import { iniciais } from "@/lib/liga";
import { cn } from "@/lib/utils";

interface EscudoClubeProps {
  nome: string;
  tamanho: "sm" | "md" | "lg";
  className?: string;
}

const tamanhos = {
  sm: "h-8 w-8 rounded-md text-[10px]",
  md: "h-12 w-12 rounded-lg text-xs",
  lg: "h-16 w-16 rounded-xl text-base",
};

export function EscudoClube({ nome, tamanho, className }: EscudoClubeProps) {
  const [falhou, setFalhou] = useState(false);
  const url = escudos[nome];

  return (
    <span
      className={cn(
        "font-display flex shrink-0 items-center justify-center overflow-hidden bg-secondary font-bold text-primary ring-1 ring-border",
        tamanhos[tamanho],
        className,
      )}
    >
      {url && !falhou ? (
        <img
          src={url}
          alt={`Escudo do ${nome}`}
          className="h-full w-full object-contain p-1"
          loading="lazy"
          onError={() => setFalhou(true)}
        />
      ) : (
        <span aria-label={nome}>{iniciais(nome)}</span>
      )}
    </span>
  );
}