import raw from "@/data/liga-uruguai.json";

export interface Jogo {
  jornada: number;
  adversario: string;
  casa: boolean | null;
}

export interface Clube {
  nome: string;
  jogos: Jogo[];
}

export interface LigaData {
  liga: string;
  total_jornadas: number;
  jornadas_taca: number[];
  clubes: Clube[];
}

export const liga = raw as unknown as LigaData;

export const jornadasTaca = new Set(liga.jornadas_taca);

export function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getClube(slug: string): Clube | undefined {
  return liga.clubes.find((c) => slugify(c.nome) === slug);
}

export function iniciais(nome: string): string {
  const palavras = nome
    .replace(/^(CA|CD|FC|SC)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 1) return palavras[0]!.slice(0, 2).toUpperCase();
  return palavras
    .slice(0, 2)
    .map((p) => p[0]!)
    .join("")
    .toUpperCase();
}
