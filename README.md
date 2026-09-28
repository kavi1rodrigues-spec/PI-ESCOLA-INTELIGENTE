# Escola Inteligente

Protótipo funcional em React + TypeScript criado a partir do documento do PI **Escola Inteligente**.

## O que está implementado
- Painel geral da escola
- Monitoramento de salas, professores e turmas
- Programação e gerenciamento de horários
- Detecção automática de conflitos de **sala**, **professor** e **turma**
- Visão operacional em tempo real (simulada no protótipo)
- Cadastro e remoção de salas, professores, turmas e aulas
- Busca
- Métricas: conflitos, salas, professores/turmas acompanhados e aulas
- Persistência local no navegador (localStorage)
- Layout responsivo para desktop e celular

## Rodar no VS Code
1. Instale Node.js LTS (18+ ou 20+).
2. Extraia esta pasta e abra `escola-inteligente` no VS Code.
3. Abra **Terminal > New Terminal**.
4. Rode:

```bash
npm install
npm run dev
```

5. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Build
```bash
npm run build
npm run preview
```

## Observação
O documento do PI define um sistema/painel web e as funções de monitoramento, horários, conflitos e visão geral. Ele não exige uma tecnologia específica nem define autenticação, banco de dados, receita ou custos. Por isso esta entrega é um protótipo web funcional, sem backend externo. Os dados ficam persistidos no navegador para facilitar a apresentação no VS Code.
