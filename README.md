# Escola Inteligente

Central de salas, professores, turmas e horários com detecção de conflitos e visão da escola em tempo real.
Não precisa instalar nada: é HTML, CSS e JavaScript puro.

## Como rodar no VS Code

1. Abra a pasta `escola-inteligente` no VS Code (Arquivo > Abrir Pasta).
2. Instale a extensão **Live Server** (Ritwick Dey), se ainda não tiver.
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.

Também funciona dando dois cliques em `index.html` (abre direto no navegador).

## Contas de demonstração

| Perfil | E-mail | Senha | Pode |
|---|---|---|---|
| Equipe gestora | gestor@escola.com | admin123 | Tudo, incluindo usuários e configurações |
| Coordenação pedagógica | coordenacao@escola.com | coord123 | Cadastrar e editar horários |
| Professor | professor@escola.com | prof123 | Consultar (com "Minhas aulas" no painel) |

## O que o sistema faz (mapa do projeto)

- **Monitoramento de salas, turmas e professores**: Painel, Salas, Professores e Turmas mostram quem está em aula, quem está livre e a próxima aula, pelo relógio.
- **Programação e gerenciamento de horários**: Horários (grade semanal por turma, professor ou sala). Clique em um espaço vazio para criar uma aula, ou em uma aula para editar.
- **Identificação de conflitos**: professor em duas aulas, sala reservada duas vezes, turma com aulas sobrepostas, sala pequena para a turma e professor em dia em que não atende. Detecção a cada alteração, com sugestões de solução (trocar de sala ou mover de horário) e histórico.
- **Visão geral em tempo real**: Painel com números do momento, linha do tempo das salas e próximas aulas. Atualiza sozinho a cada minuto.
- **Métricas**: conflitos identificados, salas/professores/turmas acompanhados, tempo para identificar e para resolver conflitos, ocupação das salas e carga dos professores.
- **Segmentos e canais**: perfis de acesso (gestão, coordenação, professor) em painel web.
- **Integração futura**: exportar e importar backup em JSON (Configurações).

## Dicas de uso

- Clique no relógio no topo para **simular um horário** (por exemplo, 09:40 de uma terça) e ver o painel funcionando fora do horário de aula.
- Os dados de exemplo incluem 3 conflitos de propósito, para você ver a detecção. Resolva com as sugestões na tela Conflitos.
- Os dados ficam salvos no navegador (localStorage). Use Exportar backup para guardar ou levar para outro computador.
- Senhas ficam salvas em texto no navegador: é um sistema de demonstração, sem servidor.

## Estrutura

```
index.html
css/style.css
js/core.js    dados, conflitos, sugestões, métricas
js/ui.js      ícones, formatação, modais
js/views.js   telas
js/app.js     login, rotas, relógio, eventos
```
