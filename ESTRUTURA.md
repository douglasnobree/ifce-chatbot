# Estrutura do Projeto Next.js + WebSockets + chadcn/ui

- `src/providers/WebSocketProvider.tsx`: Provider global para gerenciar conexões WebSocket e múltiplos canais.
- `src/providers/ActiveChannelsProvider.tsx`: Provider para gerenciar canais ativos e sincronização.
- `src/hooks/useWebSocket.ts`: Hook para consumir o contexto de WebSocket.
- `src/components/ChannelList.tsx`: Componente para listar canais conectados (use chadcn/ui para UI futuramente).
- `src/components/ChatWindow.tsx`: Componente para janela de chat de um canal (use chadcn/ui para UI futuramente).
- `src/components/ui/index.ts`: Centralização de imports dos componentes do chadcn/ui.
- `src/app/AppProviders.tsx`: Componente para agrupar todos os providers globais.
- `src/app/layout.tsx`: Já ajustado para envolver a aplicação com os providers.

## Sugestão de próximos passos
- Instale o chadcn/ui e configure os componentes reais em `src/components/ui`.
- Implemente a lógica de WebSocket e canais nos providers.
- Utilize os componentes `ChannelList` e `ChatWindow` nas páginas conforme necessário.

Estrutura pronta para escalar e manter múltiplos canais WebSocket sincronizados!
