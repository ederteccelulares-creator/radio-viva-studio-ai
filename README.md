# Radio Viva Studio AI

Primeira versão da interface da rádio online com painel administrativo, fila de pedidos e locução de demonstração por voz do navegador.

## Requisitos
- Node.js 20+
- npm

## Executar localmente
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Estado atual
- Interface responsiva para celular e desktop.
- Player visual com controles de demonstração.
- Pedidos de música adicionados à fila da sessão.
- Locução de teste via Web Speech API do navegador.
- Painel administrativo inicial.

## Próximas integrações
- Backend e banco de dados persistente.
- Provedor de streaming/licenciamento de áudio.
- Pesquisa e reprodução via APIs autorizadas.
- Serviço de voz IA e geração de locuções.
- Autenticação segura do administrador.

**Nota:** nesta versão, os pedidos são mantidos apenas em memória no navegador. O botão de reprodução controla a demonstração da interface, não uma transmissão musical real.