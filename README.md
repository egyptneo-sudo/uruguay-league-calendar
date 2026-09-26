# Liga Uruguaia Calendar

Cria um site chamado "Calendário Liga Uruguaia" que mostre o calendário 

de jogos dos 16 clubes da Primeira Divisão do Uruguai.

FUNCIONALIDADES:

- Página inicial: lista de 16 clubes (cards com nome)

- Ao clicar num clube: mostra tabela com as 34 jornadas

- Colunas: Jornada | Adversário

- Filtro por jornada (1-34)

- Barra de pesquisa de clubes

- Design responsivo, tema escuro com detalhes azuis

DADOS:

Usa o JSON em anexo. Estrutura:

- liga, total_jornadas, jornadas_taca

- clubes[] com { nome, jogos[] { jornada, adversario } }

NOTAS:

- "Indefinido" = jornada de taça ainda sem sorteio

- NÃO mostrar casa/fora (não temos esses dados)

- Destaque as jornadas de taça (7, 16, 24, 33) com cor diferente

- Interface em português

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://uruguay-league-calendar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1206aeeb-9e58-482a-9835-3751d95fc90c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
