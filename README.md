# Sintonia Radio Viva

Aplicação web de rádio online com DJ de IA, pedidos musicais e painel de administração.

## Tecnologias

- TanStack Start
- React + TypeScript
- Supabase (autenticação e dados)
- Bun
- Vitest e ESLint

## Requisitos

- Bun (versão compatível com o lockfile)
- Projeto Supabase próprio para implantação fora do Lovable Cloud

## Executar localmente

```bash
git clone https://github.com/ederteccelulares-creator/radio-viva-studio-ai.git
cd radio-viva-studio-ai
git checkout sintonia-radio-viva-import
bun install --frozen-lockfile
cp .env.example .env
```

Preencha as variáveis do arquivo `.env` com os dados do seu projeto Supabase. Depois execute:

```bash
bun run dev
```

## Variáveis de ambiente

Veja [.env.example](.env.example).

- `VITE_SUPABASE_URL`: URL pública do projeto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: chave publicável/anon do Supabase, usada no navegador.
- `SUPABASE_URL`: URL do Supabase para operações no servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: chave de serviço, exclusivamente no servidor. Nunca use prefixo `VITE_`, nunca a envie ao navegador e nunca a coloque no Git.
- `LOVABLE_DB_MIGRATION_URL`: variável opcional usada pela configuração de migrações Drizzle, se aplicável.

Não coloque chaves, tokens ou senhas em arquivos versionados. Use os Secrets do provedor de hospedagem para valores de produção. O arquivo `.env` deve permanecer local.

## Verificações

```bash
bun run test
bun run lint
bun run build
```

O GitHub Actions executa essas verificações automaticamente em commits e pull requests para a branch de integração.

## Segurança e implantação

Antes de publicar, configure as URLs de autenticação e os redirecionamentos OAuth no Supabase para o domínio definitivo. Revise também as políticas RLS e os segredos do ambiente de produção.

A integração com o Lovable Cloud pode exigir configuração ou substituição ao migrar para uma infraestrutura própria. A cópia deste repositório não configura automaticamente um projeto Supabase externo nem publica a aplicação.

## Fluxo Git

O trabalho importado está na branch `sintonia-radio-viva-import`. A branch `main` foi preservada; a integração está aguardando revisão no pull request #1.
