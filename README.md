# Radio Viva Studio AI

Rádio web com pesquisa de vídeos pela YouTube Data API v3 e reprodução incorporada pelo YouTube IFrame Player API.

## Requisitos
- Node.js 20+
- npm
- Chave da YouTube Data API v3 (Google Cloud)

## Configuração
1. No Google Cloud Console, crie ou selecione um projeto.
2. Ative **YouTube Data API v3**.
3. Crie uma API key e restrinja-a à YouTube Data API v3.
4. Copie `.env.example` para `.env` e informe `YOUTUBE_API_KEY`.
5. Não publique o arquivo `.env` nem coloque a chave em variáveis `VITE_*`.

## Executar em desenvolvimento
```bash
npm install
cp .env.example .env
# Edite .env e informe sua chave
npm run dev
```
Vite inicia na porta 5173 e a API Express na 3001. O Vite encaminha `/api` para o servidor.

## Produção
```bash
npm install
npm run build
npm start
```
O Express serve a pasta `dist` e os endpoints `/api` na porta definida por `PORT`.

## Funcionalidades
- Pesquisa de vídeos incorporáveis em português e região Brasil.
- Resultados com miniatura, título e canal.
- Adição à fila e reprodução pelo player oficial do YouTube.
- Avanço automático quando o vídeo termina.
- Controle de volume e locução do DJ via voz do navegador.
- Cache de pesquisa de 5 minutos.

## Limitações importantes
- O método `search.list` tem uma cota padrão separada de 100 chamadas por dia, sujeita às regras atuais do Google.
- A reprodução ocorre dentro do player oficial incorporado; alguns vídeos bloqueiam incorporação ou autoplay.
- Isto não é uma transmissão de áudio contínua: o player de vídeo oficial permanece visível.
- Verifique os direitos de execução pública das músicas e os termos aplicáveis ao uso comercial.

## Endpoints
- `GET /api/health`
- `GET /api/youtube/search?q=nome+da+musica`
