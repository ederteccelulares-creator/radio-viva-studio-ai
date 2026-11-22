# Welcome to your Lovable project

## Integrações de agentes — Sintonia Radio Viva

O servidor MCP fica em `/mcp` e exige OAuth com consentimento da conta conectada. Publique o app antes de conectar clientes externos. Não use tokens copiados de sessões como método de conexão.

Ferramentas somente de consulta:
- `get_station`: nome, slogan, modo, programa ao vivo e regras de pedidos.
- `list_schedule`: até 100 programas, com filtro opcional por dia (0 domingo a 6 sábado).
- `list_queue`: até 50 entradas da fila pública, sem notas privadas nem nomes completos.

As consultas usam a identidade do chamador e mantêm as políticas existentes. Não há ferramentas de alteração, exclusão ou envio. A página inicial também oferece ferramentas WebMCP para ler o que está exibido e filtrar a programação, mantendo os controles normais funcionando.

A autorização usa `/.lovable/oauth/consent`; `/login` preserva esse destino durante entrada e cadastro, inclusive confirmação por e-mail. A lista de redirecionamento configurada inclui os caminhos do domínio do projeto.

Teste as regras e o roteamento com `bunx vitest run src/test/oauth.test.ts src/test/app-routing.test.tsx`.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS