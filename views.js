/* ==========================================================================
   Escola Inteligente - telas
   Cada tela devolve HTML; as ações, mudanças e formulários ficam em V.acoes,
   V.mudar e V.forms e são ligados por app.js.
   ========================================================================== */
(function (root) {
  'use strict';
  const E = root.EI;
  const { ic, esc, $, hora, dataLonga, duracao, haTempo, nomeCurto, matiz, horasTexto, Modal, campo, checkDias, toast } = root.UI;

  const V = {
    est: {
      filtro: { sala: 'todos', professor: 'todos', turma: 'todos' },
      horarios: { modo: 'turma', id: null },
      sugestoes: []
    },
    acoes: {}, mudar: {}, forms: {}
  };

  const st = () => E.estado();
  const get = (lista, id) => st()[lista].find((o) => o.id === id);
  const nomeDe = (lista, id) => { const x = get(lista, id); return x ? x.nome : '(removido)'; };
  const H = (m) => E.paraHHMM(m);
  const render = () => root.App.render();
  const dataHora = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  /* ---------- peças comuns ---------- */
  const ROTULOS = {
    sala: { ocupado: 'Em uso', livre: 'Livre', conflito: 'Conflito', fechado: 'Fechada', ausente: 'Livre' },
    professor: { ocupado: 'Em aula', livre: 'Disponível', conflito: 'Conflito', fechado: 'Fora do horário', ausente: 'Não atende hoje' },
    turma: { ocupado: 'Em aula', livre: 'Sem aula agora', conflito: 'Conflito', fechado: 'Fora do horário', ausente: '-' }
  };
  const pilula = (tipo, estado) => `<span class="pilula est-${estado}">${ROTULOS[tipo][estado]}</span>`;

  function vazio(icone, titulo, texto, botao) {
    return `<div class="vazio">${ic(icone, 28)}<p>${esc(titulo)}</p><span>${esc(texto)}</span>${botao || ''}</div>`;
  }
  const textoAula = (a, omitir) => {
    const p = [];
    if (omitir !== 'turma') p.push(nomeDe('turmas', a.turmaId));
    if (omitir !== 'professor') p.push(nomeCurto(nomeDe('professores', a.professorId)));
    if (omitir !== 'sala') p.push(nomeDe('salas', a.salaId));
    return p.join(', ');
  };

  // organiza aulas sobrepostas em colunas (faixas) lado a lado
  function colunas(aulas) {
    const s = aulas.slice().sort((x, y) => E.paraMin(x.inicio) - E.paraMin(y.inicio) || E.paraMin(x.fim) - E.paraMin(y.fim));
    const saida = [];
    let grupo = [], fimGrupo = -1;
    const fechar = () => {
      const n = Math.max(1, ...grupo.map((c) => c.lane + 1));
      grupo.forEach((c) => { c.n = n; });
      saida.push(...grupo);
      grupo = [];
    };
    s.forEach((a) => {
      const i = E.paraMin(a.inicio), f = E.paraMin(a.fim);
      if (grupo.length && i >= fimGrupo) fechar();
      if (!grupo.length) fimGrupo = -1;
      const fins = [];
      grupo.forEach((c) => { fins[c.lane] = Math.max(fins[c.lane] || 0, E.paraMin(c.a.fim)); });
      let lane = 0;
      while (fins[lane] !== undefined && fins[lane] > i) lane++;
      grupo.push({ a, lane, n: 1 });
      fimGrupo = Math.max(fimGrupo, f);
    });
    if (grupo.length) fechar();
    return saida;
  }
  function faixaHoras() {
    const cfg = st().config;
    let ini = E.paraMin(cfg.inicioDia), fim = E.paraMin(cfg.fimDia);
    st().aulas.forEach((a) => { ini = Math.min(ini, E.paraMin(a.inicio)); fim = Math.max(fim, E.paraMin(a.fim)); });
    return { ini: Math.floor(ini / 60) * 60, fim: Math.ceil(fim / 60) * 60 };
  }
  const idsEmConflito = () => new Set(E.conflitos().flatMap((c) => c.aulaIds));

  /* ==========================================================================
     PAINEL
     ========================================================================== */
  function timeline(dia, t, mostrarAgora) {
    const s = st();
    const { ini, fim } = faixaHoras();
    const total = fim - ini;
    const pct = (m) => (m - ini) / total * 100;
    const conf = idsEmConflito();
    const aulasDia = E.aulasDoDia(dia);
    const horas = [];
    for (let m = ini; m <= fim; m += 60) horas.push(m);

    const linhas = s.salas.map((sala) => {
      const cols = colunas(aulasDia.filter((a) => a.salaId === sala.id));
      const n = Math.max(1, ...cols.map((c) => c.lane + 1));
      const blocos = cols.map(({ a, lane }) => {
        const l = pct(E.paraMin(a.inicio)), w = pct(E.paraMin(a.fim)) - l;
        const ativa = mostrarAgora && E.paraMin(a.inicio) <= t.min && t.min < E.paraMin(a.fim);
        const dica = `${a.inicio} às ${a.fim}: ${a.disciplina}, ${textoAula(a)}`;
        return `<button type="button" class="bloco ${conf.has(a.id) ? 'conf' : ''} ${ativa ? 'ativa' : ''}" style="--h:${matiz(a.disciplina)};left:${l}%;width:${w}%;top:${lane * 34 + 3}px" data-acao="ver-aula" data-id="${a.id}" title="${esc(dica)}"><span>${esc(nomeDe('turmas', a.turmaId))}</span></button>`;
      }).join('');
      return `<div class="tl-linha"><div class="tl-rotulo"><strong>${esc(sala.nome)}</strong><small>${esc(sala.capacidade)} lugares</small></div><div class="tl-pista" style="height:${n * 34 + 6}px">${blocos}</div></div>`;
    }).join('');

    const escala = horas.map((m) => `<span style="left:${pct(m)}%">${m / 60}h</span>`).join('');
    const guias = horas.map((m) => `<i style="left:${pct(m)}%"></i>`).join('');
    const agora = mostrarAgora && t.min >= ini && t.min <= fim
      ? `<b class="tl-agora" style="left:${pct(t.min)}%"><span>${H(t.min)}</span></b>` : '';

    if (!s.salas.length) return vazio('sala', 'Nenhuma sala cadastrada', 'Cadastre as salas para acompanhar o uso ao longo do dia.');
    return `
      <div class="tl">
        <div class="tl-escala"><div class="tl-escala-in">${escala}</div></div>
        <div class="tl-corpo">${linhas}<div class="tl-guias">${guias}${agora}</div></div>
      </div>`;
  }

  V.painel = function () {
    const agora = E.Relogio.agora();
    const t = E.tempo(agora);
    const s = st();
    const aberta = E.escolaAberta(t);
    const conf = E.conflitos();
    const criticos = conf.filter((c) => c.severidade === 'critico').length;

    const stSalas = s.salas.map((x) => E.statusRecurso('sala', x.id, t));
    const stProfs = s.professores.map((x) => E.statusRecurso('professor', x.id, t));
    const stTurmas = s.turmas.map((x) => E.statusRecurso('turma', x.id, t));
    const conta = (arr, ...estados) => arr.filter((x) => estados.includes(x.estado)).length;
    const salasUso = conta(stSalas, 'ocupado', 'conflito');
    const profsAula = conta(stProfs, 'ocupado', 'conflito');
    const turmasAula = conta(stTurmas, 'ocupado', 'conflito');

    let situacao;
    if (!E.diaLetivo(t.dia)) situacao = 'Hoje não é dia letivo.';
    else if (t.min < E.paraMin(s.config.inicioDia)) situacao = `As aulas começam às ${s.config.inicioDia}.`;
    else if (t.min >= E.paraMin(s.config.fimDia)) situacao = 'As aulas de hoje já terminaram.';
    else situacao = '';

    const aviso = aberta ? '' : `
      <div class="faixa-aviso">
        ${ic('relogio', 20)}
        <div><strong>${esc(situacao)}</strong><span>Os números abaixo mostram a escola parada. Para ver o painel funcionando, simule um horário de aula.</span></div>
        <button type="button" class="btn btn-sm" data-acao="simular-aula">Simular uma manhã de aulas</button>
      </div>`;

    const diaTl = E.diaLetivo(t.dia) ? t.dia : s.config.dias[0];
    const nota = diaTl !== t.dia ? `Mostrando ${E.DIAS[diaTl].toLowerCase()}, o próximo dia de aulas.` : dataLonga(agora);

    // aulas em andamento
    const ativas = E.aulasAgora(t).sort((a, b) => nomeDe('salas', a.salaId).localeCompare(nomeDe('salas', b.salaId)));
    const conflAulas = idsEmConflito();
    const listaAgora = ativas.length ? `<ul class="lista-aulas">${ativas.map((a) => {
      const ini = E.paraMin(a.inicio), fim = E.paraMin(a.fim);
      const prog = Math.max(0, Math.min(100, (t.min - ini) / (fim - ini) * 100));
      return `<li>
        <button type="button" class="linha-aula ${conflAulas.has(a.id) ? 'conf' : ''}" style="--h:${matiz(a.disciplina)}" data-acao="ver-aula" data-id="${a.id}">
          <span class="marca"></span>
          <span class="linha-txt"><strong>${esc(nomeDe('turmas', a.turmaId))}, ${esc(a.disciplina)}</strong><small>${esc(nomeCurto(nomeDe('professores', a.professorId)))} na ${esc(nomeDe('salas', a.salaId))}</small></span>
          <span class="linha-fim"><b>faltam ${fim - t.min} min</b><i class="prog"><u style="width:${prog}%"></u></i></span>
        </button></li>`;
    }).join('')}</ul>` : `<p class="muted pad">${aberta ? 'Nenhuma aula em andamento neste momento (intervalo ou janela livre).' : 'Nenhuma aula em andamento.'}</p>`;

    // próximas aulas
    const proximas = s.aulas.filter((a) => a.dia === t.dia && E.paraMin(a.inicio) > t.min)
      .sort((a, b) => E.paraMin(a.inicio) - E.paraMin(b.inicio)).slice(0, 6);
    const listaProx = proximas.length ? `<ul class="lista-simples">${proximas.map((a) => `
      <li><button type="button" class="linha-prox" data-acao="ver-aula" data-id="${a.id}">
        <time>${a.inicio}</time><span><strong>${esc(nomeDe('turmas', a.turmaId))}, ${esc(a.disciplina)}</strong><small>${esc(nomeCurto(nomeDe('professores', a.professorId)))} na ${esc(nomeDe('salas', a.salaId))}</small></span>
        <em>em ${E.paraMin(a.inicio) - t.min} min</em>
      </button></li>`).join('')}</ul>` : `<p class="muted pad">Não há mais aulas começando hoje.</p>`;

    // alertas
    const listaConf = conf.length ? `<ul class="lista-simples">${conf.slice(0, 4).map((c) => `
      <li><a class="linha-conf ${c.severidade}" href="#/conflitos">${ic('alerta', 18)}<span><strong>${esc(c.titulo)}</strong><small>${esc(c.descricao)}</small></span></a></li>`).join('')}</ul>
      ${conf.length > 4 ? `<a class="link-mais" href="#/conflitos">Ver todos os ${conf.length} conflitos</a>` : `<a class="link-mais" href="#/conflitos">Abrir central de conflitos</a>`}`
      : `<div class="tudo-certo">${ic('ok', 22)}<div><strong>Nenhum conflito nos horários.</strong><span>O sistema confere professores, salas e turmas a cada alteração.</span></div></div>`;

    // aulas do professor logado
    const u = E.usuarioAtual();
    let minhas = '';
    if (u && u.perfil === 'professor' && u.professorId) {
      const doDia = s.aulas.filter((a) => a.professorId === u.professorId && a.dia === diaTl).sort((a, b) => E.paraMin(a.inicio) - E.paraMin(b.inicio));
      minhas = `
        <section class="painel">
          <header class="painel-topo"><h3>Minhas aulas ${diaTl === t.dia ? 'de hoje' : 'na ' + E.DIAS[diaTl].toLowerCase()}</h3></header>
          ${doDia.length ? `<ul class="lista-simples">${doDia.map((a) => {
            const emCurso = diaTl === t.dia && E.paraMin(a.inicio) <= t.min && t.min < E.paraMin(a.fim);
            return `<li><button type="button" class="linha-prox ${emCurso ? 'em-curso' : ''}" data-acao="ver-aula" data-id="${a.id}">
              <time>${a.inicio}</time><span><strong>${esc(nomeDe('turmas', a.turmaId))}, ${esc(a.disciplina)}</strong><small>${esc(nomeDe('salas', a.salaId))}, até ${a.fim}</small></span>
              <em>${emCurso ? 'em andamento' : ''}</em></button></li>`;
          }).join('')}</ul>` : '<p class="muted pad">Você não tem aulas neste dia.</p>'}
        </section>`;
    }

    return `
      ${aviso}
      <section class="faixa-numeros" aria-label="Resumo do momento">
        <div class="numero"><strong>${salasUso}<em>/${s.salas.length}</em></strong><span>salas em uso</span><small>${conta(stSalas, 'livre')} livres agora</small></div>
        <div class="numero"><strong>${profsAula}<em>/${s.professores.length}</em></strong><span>professores em aula</span><small>${conta(stProfs, 'livre')} disponíveis</small></div>
        <div class="numero"><strong>${turmasAula}<em>/${s.turmas.length}</em></strong><span>turmas em aula</span><small>${conta(stTurmas, 'livre')} sem aula agora</small></div>
        <a class="numero ${conf.length ? 'alerta' : 'certo'}" href="#/conflitos"><strong>${conf.length}</strong><span>conflitos abertos</span><small>${criticos} críticos, ${conf.length - criticos} de atenção</small></a>
      </section>

      <section class="painel">
        <header class="painel-topo">
          <div><h3>Salas ao longo do dia</h3><p class="muted">${esc(nota)}</p></div>
          <div class="legenda"><span><i class="lg lg-aula"></i>Aula</span><span><i class="lg lg-conf"></i>Conflito</span>${aberta && diaTl === t.dia ? '<span><i class="lg lg-agora"></i>Agora</span>' : ''}</div>
        </header>
        <div class="rolagem-x">${timeline(diaTl, t, aberta && diaTl === t.dia)}</div>
      </section>

      <div class="duas-col">
        <section class="painel"><header class="painel-topo"><h3>Acontecendo agora</h3></header>${listaAgora}</section>
        <section class="painel"><header class="painel-topo"><h3>Precisam de atenção</h3></header>${listaConf}</section>
      </div>
      <div class="duas-col">
        <section class="painel"><header class="painel-topo"><h3>Próximas aulas</h3></header>${listaProx}</section>
        ${minhas}
      </div>`;
  };

  /* ==========================================================================
     CADASTROS: SALAS, PROFESSORES, TURMAS
     ========================================================================== */
  const RCFG = {
    sala: { colecao: 'salas', plural: 'Salas', singular: 'sala', novo: 'Nova sala', uma: 'uma sala', salvo: 'Sala salva.', icone: 'sala', busca: 'Buscar sala', cabecalho: ['Sala', 'Tipo', 'Capacidade'] },
    professor: { colecao: 'professores', plural: 'Professores', singular: 'professor', novo: 'Novo professor', uma: 'um professor', salvo: 'Professor salvo.', icone: 'professor', busca: 'Buscar professor', cabecalho: ['Professor', 'Disciplina', 'Atende'] },
    turma: { colecao: 'turmas', plural: 'Turmas', singular: 'turma', novo: 'Nova turma', uma: 'uma turma', salvo: 'Turma salva.', icone: 'turma', busca: 'Buscar turma', cabecalho: ['Turma', 'Turno', 'Alunos'] }
  };
  const CAMPO_AULA = { sala: 'salaId', professor: 'professorId', turma: 'turmaId' };

  function celulasBase(tipo, r) {
    if (tipo === 'sala') return [`<strong>${esc(r.nome)}</strong><small>${esc(r.bloco || '')}</small>`, esc(r.tipo), `${esc(r.capacidade)} lugares`];
    if (tipo === 'professor') {
      const dias = (r.dias || []);
      const txt = dias.length === st().config.dias.length ? 'Todos os dias letivos' : dias.map((d) => E.DIAS_CURTO[d]).join(', ');
      return [`<strong>${esc(r.nome)}</strong><small>${esc(r.email || '')}</small>`, esc(r.disciplina), esc(txt || '-')];
    }
    return [`<strong>${esc(r.nome)}</strong>`, esc(r.turno), `${esc(r.alunos)} alunos`];
  }

  V.recursos = function (tipo) {
    const cfg = RCFG[tipo];
    const s = st();
    const agora = E.Relogio.agora();
    const t = E.tempo(agora);
    const editar = E.pode('editar');
    const linhas = s[cfg.colecao].map((r) => ({ r, s: E.statusRecurso(tipo, r.id, t) }));
    const ocupados = linhas.filter((x) => x.s.estado === 'ocupado' || x.s.estado === 'conflito').length;
    const livres = linhas.filter((x) => x.s.estado === 'livre').length;
    const filtro = V.est.filtro[tipo];
    const visiveis = linhas.filter((x) => filtro === 'todos' || (filtro === 'ocupado' && (x.s.estado === 'ocupado' || x.s.estado === 'conflito')) || (filtro === 'livre' && x.s.estado === 'livre'));
    const rOcup = { sala: 'Em uso', professor: 'Em aula', turma: 'Em aula' }[tipo];
    const rLivre = { sala: 'Livres', professor: 'Disponíveis', turma: 'Sem aula' }[tipo];

    const corpo = visiveis.map(({ r, s: sr }) => {
      const base = celulasBase(tipo, r);
      let desc = '';
      if (sr.estado === 'ocupado') { const a = sr.ativas[0]; desc = `${a.disciplina}, ${textoAula(a, tipo)}, até ${a.fim}`; }
      else if (sr.estado === 'conflito') desc = `${sr.ativas.length} aulas ao mesmo tempo`;
      else if (sr.estado === 'livre') desc = sr.proxima ? `livre até ${sr.proxima.inicio}` : 'sem mais aulas hoje';
      const prox = sr.proxima ? `<strong>${sr.proxima.inicio}</strong><small>${esc(sr.proxima.disciplina)}, ${esc(textoAula(sr.proxima, tipo))}</small>` : '<span class="muted">-</span>';
      const aulas = s.aulas.filter((a) => a[CAMPO_AULA[tipo]] === r.id);
      const carga = aulas.reduce((sum, a) => sum + E.paraMin(a.fim) - E.paraMin(a.inicio), 0) / 60;
      const cAulas = `<strong>${aulas.length}</strong><small>${horasTexto(carga)} por semana</small>`;
      const acoes = `
        <button type="button" class="btn-icone" data-acao="ver-horario" data-tipo="${tipo}" data-id="${r.id}" title="Ver horário" aria-label="Ver horário de ${esc(r.nome)}">${ic('horarios', 17)}</button>
        ${editar ? `<button type="button" class="btn-icone" data-acao="editar" data-tipo="${tipo}" data-id="${r.id}" title="Editar" aria-label="Editar ${esc(r.nome)}">${ic('editar', 17)}</button>
        <button type="button" class="btn-icone perigo" data-acao="excluir" data-tipo="${tipo}" data-id="${r.id}" title="Excluir" aria-label="Excluir ${esc(r.nome)}">${ic('lixo', 17)}</button>` : ''}`;
      return `<tr data-busca="${esc((r.nome + ' ' + (r.disciplina || '') + ' ' + (r.tipo || '') + ' ' + (r.turno || '')).toLowerCase())}">
        <td class="c-nome">${base[0]}</td><td>${base[1]}</td><td>${base[2]}</td>
        <td>${pilula(tipo, sr.estado)}${desc ? `<small>${esc(desc)}</small>` : ''}</td>
        <td>${prox}</td><td>${cAulas}</td><td class="c-acoes">${acoes}</td></tr>`;
    }).join('');

    const chip = (v, txt, n) => `<button type="button" class="chip ${filtro === v ? 'ativo' : ''}" data-acao="filtrar" data-tipo="${tipo}" data-valor="${v}">${txt} <b>${n}</b></button>`;

    const tabela = s[cfg.colecao].length ? `
      <div class="tabela-wrap"><table class="tabela">
        <thead><tr><th>${cfg.cabecalho[0]}</th><th>${cfg.cabecalho[1]}</th><th>${cfg.cabecalho[2]}</th><th>Agora</th><th>Próxima aula</th><th>Na semana</th><th><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${corpo || `<tr><td colspan="7" class="muted pad">Nenhum item neste filtro.</td></tr>`}</tbody>
      </table></div>`
      : vazio(cfg.icone, `Nenhum item em ${cfg.plural.toLowerCase()}`, editar ? `Cadastre ${cfg.uma} para começar a montar os horários.` : 'A equipe gestora ainda não cadastrou itens aqui.',
        editar ? `<button type="button" class="btn btn-primario" data-acao="novo" data-tipo="${tipo}">${ic('mais', 16)} ${cfg.novo}</button>` : '');

    return `
      <div class="barra-topo">
        <p class="muted">${esc(E.Relogio.simulado() ? 'Situação no horário simulado.' : 'Situação em tempo real.')} ${esc(dataLonga(agora))}, ${hora(agora)}.</p>
        ${editar ? `<button type="button" class="btn btn-primario" data-acao="novo" data-tipo="${tipo}">${ic('mais', 16)} ${cfg.novo}</button>` : ''}
      </div>
      <div class="barra-filtros">
        <div class="chips">${chip('todos', 'Todos', linhas.length)}${chip('ocupado', rOcup, ocupados)}${chip('livre', rLivre, livres)}</div>
        <label class="busca">${ic('busca', 16)}<input type="search" data-busca placeholder="${cfg.busca}" aria-label="${cfg.busca}"></label>
      </div>
      <section class="painel sem-pad">${tabela}</section>`;
  };
  V.salas = () => V.recursos('sala');
  V.professores = () => V.recursos('professor');
  V.turmas = () => V.recursos('turma');

  V.formRecurso = function (tipo, id) {
    const cfg = RCFG[tipo];
    const s = st();
    const item = id ? get(cfg.colecao, id) : {};
    const g2 = (a, b) => `<div class="grade-2">${a}${b}</div>`;
    let campos = '';
    if (tipo === 'sala') {
      const tipos = ['Sala de aula', 'Laboratório', 'Espaço esportivo', 'Espaço de estudo', 'Auditório', 'Outro'].map((x) => ({ valor: x, texto: x }));
      campos = g2(campo({ nome: 'nome', rotulo: 'Nome da sala', valor: item.nome || '', obrigatorio: true }), campo({ nome: 'categoria', rotulo: 'Tipo', tipo: 'select', opcoes: tipos, valor: item.tipo || 'Sala de aula' })) +
        g2(campo({ nome: 'capacidade', rotulo: 'Capacidade (lugares)', tipo: 'number', valor: item.capacidade || 30, extra: 'min="1" max="500"' }), campo({ nome: 'bloco', rotulo: 'Bloco ou local', valor: item.bloco || '', dica: 'Opcional' }));
    } else if (tipo === 'professor') {
      campos = g2(campo({ nome: 'nome', rotulo: 'Nome completo', valor: item.nome || '', obrigatorio: true }), campo({ nome: 'disciplina', rotulo: 'Disciplina principal', valor: item.disciplina || '' })) +
        campo({ nome: 'email', rotulo: 'E-mail', tipo: 'email', valor: item.email || '', dica: 'Opcional' }) +
        `<div class="campo"><label>Dias em que atende</label>${checkDias('dias', s.config.dias, item.dias || s.config.dias)}<small>Aulas marcadas fora desses dias geram um alerta de atenção.</small></div>`;
    } else {
      const turnos = ['Matutino', 'Vespertino', 'Noturno', 'Integral'].map((x) => ({ valor: x, texto: x }));
      campos = g2(campo({ nome: 'nome', rotulo: 'Nome da turma', valor: item.nome || '', obrigatorio: true }), campo({ nome: 'turno', rotulo: 'Turno', tipo: 'select', opcoes: turnos, valor: item.turno || 'Matutino' })) +
        campo({ nome: 'alunos', rotulo: 'Número de alunos', tipo: 'number', valor: item.alunos || 30, extra: 'min="1" max="500"', dica: 'Usado para avisar quando a sala é pequena demais.' });
    }
    Modal.abrir(id ? `Editar ${cfg.singular}` : cfg.novo, `
      <form data-form="recurso" data-tipo="${tipo}" data-id="${id || ''}" novalidate>
        ${campos}
        <div class="dlg-rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>
      </form>`);
    setTimeout(() => { const f = $('#c-nome'); if (f) f.focus(); }, 40);
  };

  V.forms.recurso = function (form) {
    const tipo = form.dataset.tipo, cfg = RCFG[tipo], fd = new FormData(form);
    const id = form.dataset.id || undefined;
    const nome = String(fd.get('nome') || '').trim();
    if (!nome) return toast('Informe o nome.', 'erro');
    if (st()[cfg.colecao].some((x) => x.id !== id && x.nome.toLowerCase() === nome.toLowerCase())) return toast(`Já existe ${cfg.uma} com este nome.`, 'erro');
    const dados = { id, nome };
    if (tipo === 'sala') {
      const cap = parseInt(fd.get('capacidade'), 10);
      if (!(cap > 0)) return toast('Informe a capacidade da sala.', 'erro');
      Object.assign(dados, { tipo: fd.get('categoria'), capacidade: cap, bloco: String(fd.get('bloco') || '').trim() });
    } else if (tipo === 'professor') {
      const dias = fd.getAll('dias').map(Number);
      if (!dias.length) return toast('Marque pelo menos um dia em que o professor atende.', 'erro');
      Object.assign(dados, { disciplina: String(fd.get('disciplina') || '').trim(), email: String(fd.get('email') || '').trim(), dias });
    } else {
      const al = parseInt(fd.get('alunos'), 10);
      if (!(al > 0)) return toast('Informe o número de alunos.', 'erro');
      Object.assign(dados, { turno: fd.get('turno'), alunos: al });
    }
    E.salvarItem(cfg.colecao, dados);
    Modal.fechar();
    toast(cfg.salvo);
    render();
  };

  V.acoes.novo = (el) => V.formRecurso(el.dataset.tipo);
  V.acoes.editar = (el) => V.formRecurso(el.dataset.tipo, el.dataset.id);
  V.acoes.excluir = async (el) => {
    const tipo = el.dataset.tipo, cfg = RCFG[tipo], id = el.dataset.id;
    const item = get(cfg.colecao, id);
    if (!item) return;
    const n = E.contarAulasDe(cfg.colecao, id);
    const ok = await Modal.confirmar({
      titulo: `Excluir ${cfg.singular}?`,
      texto: `<strong>${esc(item.nome)}</strong> será removido.${n ? ` As ${n} aulas ligadas a ${tipo === 'professor' ? 'este professor' : tipo === 'sala' ? 'esta sala' : 'esta turma'} também serão removidas dos horários.` : ''}`,
      botao: 'Excluir', perigo: true
    });
    if (!ok) return;
    E.removerItem(cfg.colecao, id);
    toast(`${item.nome} foi excluído.`);
    render();
  };
  V.acoes.filtrar = (el) => { V.est.filtro[el.dataset.tipo] = el.dataset.valor; render(); };
  V.acoes['ver-horario'] = (el) => {
    V.est.horarios = { modo: el.dataset.tipo, id: el.dataset.id };
    location.hash = '#/horarios';
  };

  /* ==========================================================================
     HORÁRIOS (grade semanal)
     ========================================================================== */
  const MODOS = {
    turma: { lista: 'turmas', campo: 'turmaId', rotulo: 'Turma' },
    professor: { lista: 'professores', campo: 'professorId', rotulo: 'Professor' },
    sala: { lista: 'salas', campo: 'salaId', rotulo: 'Sala' }
  };

  function gradeSemanal(aulas, modo, live, t) {
    const { ini, fim } = faixaHoras();
    const hh = 60;
    const conf = idsEmConflito();
    const dias = st().config.dias;
    const cab = dias.map((d) => `<div class="sem-dia ${live && t.dia === d ? 'hoje' : ''}">${E.DIAS[d]}</div>`).join('');
    const eixo = [];
    for (let m = ini; m < fim; m += 60) eixo.push(`<span style="top:${(m - ini) / 60 * hh}px">${H(m)}</span>`);
    const cols = dias.map((d) => {
      const itens = colunas(aulas.filter((a) => a.dia === d)).map(({ a, lane, n }) => {
        const top = (E.paraMin(a.inicio) - ini) / 60 * hh;
        const alt = (E.paraMin(a.fim) - E.paraMin(a.inicio)) / 60 * hh;
        const linha = modo === 'turma' ? `${nomeCurto(nomeDe('professores', a.professorId))}, ${nomeDe('salas', a.salaId)}`
          : modo === 'professor' ? `${nomeDe('turmas', a.turmaId)}, ${nomeDe('salas', a.salaId)}`
            : `${nomeDe('turmas', a.turmaId)}, ${nomeCurto(nomeDe('professores', a.professorId))}`;
        return `<button type="button" class="bloco-sem ${conf.has(a.id) ? 'conf' : ''}" style="--h:${matiz(a.disciplina)};top:${top}px;height:${alt - 2}px;left:calc(${lane} * 100% / ${n} + 2px);width:calc(100% / ${n} - 4px)" data-acao="ver-aula" data-id="${a.id}" title="${esc(a.disciplina + ', ' + linha + ', ' + a.inicio + ' às ' + a.fim)}">
          <b>${esc(a.disciplina)}</b><span>${esc(linha)}</span><time>${a.inicio} às ${a.fim}</time></button>`;
      }).join('');
      const agora = live && t.dia === d && t.min >= ini && t.min <= fim ? `<i class="sem-agora" style="top:${(t.min - ini) / 60 * hh}px"></i>` : '';
      return `<div class="sem-col" data-dia="${d}" data-acao="grade-clique" data-ini="${ini}" data-hh="${hh}">${itens}${agora}</div>`;
    }).join('');
    return `
      <div class="rolagem-x"><div class="sem" style="--n:${dias.length};--hh:${hh}px;--alt:${(fim - ini) / 60 * hh}px">
        <div class="sem-cab"><div class="sem-canto"></div>${cab}</div>
        <div class="sem-corpo"><div class="sem-eixo">${eixo.join('')}</div>${cols}</div>
      </div></div>`;
  }

  V.horarios = function () {
    const s = st();
    const h = V.est.horarios;
    const m = MODOS[h.modo];
    const lista = s[m.lista];
    if (!lista.find((x) => x.id === h.id)) h.id = lista[0] ? lista[0].id : null;
    const editar = E.pode('editar');
    const agora = E.Relogio.agora();
    const t = E.tempo(agora);

    const seg = Object.keys(MODOS).map((k) => `<button type="button" class="seg ${h.modo === k ? 'ativo' : ''}" data-acao="modo-horario" data-modo="${k}">${MODOS[k].rotulo}</button>`).join('');
    const opcoes = lista.map((x) => `<option value="${x.id}" ${x.id === h.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('');

    let corpo;
    let resumo = '';
    if (!lista.length) {
      corpo = vazio('horarios', `Nenhuma ${m.rotulo.toLowerCase()} cadastrada`, 'Cadastre turmas, professores e salas para montar a grade de horários.');
    } else {
      const aulas = s.aulas.filter((a) => a[m.campo] === h.id);
      const horas = aulas.reduce((sum, a) => sum + E.paraMin(a.fim) - E.paraMin(a.inicio), 0) / 60;
      const nConf = E.conflitos().filter((c) => c.aulaIds.some((id) => aulas.some((a) => a.id === id))).length;
      resumo = `${aulas.length} aulas, ${horasTexto(horas)} por semana${nConf ? `, <span class="txt-perigo">${nConf} com conflito</span>` : ''}.`;
      corpo = gradeSemanal(aulas, h.modo, E.escolaAberta(t), t) + (editar ? '<p class="dica-grade">Clique em um espaço vazio da grade para criar uma aula naquele horário, ou clique em uma aula para editar.</p>' : '<p class="dica-grade">Clique em uma aula para ver os detalhes.</p>');
    }
    const nomeSel = (get(m.lista, h.id) || {}).nome || '';
    return `
      <div class="so-impressao"><h2>${esc(s.config.nomeEscola)}</h2><p>Horário semanal: ${esc(m.rotulo)} ${esc(nomeSel)}</p></div>
      <div class="barra-filtros sem-print">
        <div class="segmentado" role="group" aria-label="Ver horário por">${seg}</div>
        ${lista.length ? `<select data-mudar="item-horario" aria-label="Escolher ${m.rotulo.toLowerCase()}">${opcoes}</select>` : ''}
        <span class="resumo-grade">${resumo}</span>
        <span class="grow"></span>
        <button type="button" class="btn" data-acao="imprimir">${ic('imprimir', 16)} Imprimir</button>
        ${editar ? `<button type="button" class="btn btn-primario" data-acao="nova-aula">${ic('mais', 16)} Nova aula</button>` : ''}
      </div>
      <section class="painel sem-pad grade-painel">${corpo}</section>`;
  };
  V.acoes['modo-horario'] = (el) => { V.est.horarios = { modo: el.dataset.modo, id: null }; render(); };
  V.mudar['item-horario'] = (el) => { V.est.horarios.id = el.value; render(); };
  V.acoes.imprimir = () => window.print();
  V.acoes['nova-aula'] = () => V.abrirAula(null, preDoFiltro());
  V.acoes['grade-clique'] = (el, ev) => {
    if (!E.pode('editar')) return;
    if (ev.target.closest('.bloco-sem')) return;
    const r = el.getBoundingClientRect();
    const y = ev.clientY - r.top;
    const ini = Number(el.dataset.ini), hh = Number(el.dataset.hh);
    let min = Math.round((ini + y / hh * 60) / 10) * 10;
    const cfg = st().config;
    min = Math.max(E.paraMin(cfg.inicioDia), Math.min(min, E.paraMin(cfg.fimDia) - 50));
    V.abrirAula(null, Object.assign(preDoFiltro(), { dia: Number(el.dataset.dia), inicio: H(min), fim: H(min + 50) }));
  };
  function preDoFiltro() {
    const h = V.est.horarios, m = MODOS[h.modo];
    return h.id ? { [m.campo]: h.id } : {};
  }

  /* ---------- editor de aula ---------- */
  V.abrirAula = function (id, pre) {
    const s = st();
    const a = id ? s.aulas.find((x) => x.id === id) : null;
    if (id && !a) return;
    if (!E.pode('editar')) return V.detalheAula(a);
    if (!s.turmas.length || !s.professores.length || !s.salas.length) {
      toast('Cadastre pelo menos uma turma, um professor e uma sala antes de criar aulas.', 'erro');
      return;
    }
    const p0 = s.professores[0];
    const v = a || Object.assign({
      turmaId: s.turmas[0].id, professorId: p0.id, salaId: s.salas[0].id, disciplina: p0.disciplina || '',
      dia: s.config.dias[0], inicio: s.config.inicioDia, fim: H(E.paraMin(s.config.inicioDia) + 50), obs: ''
    }, pre || {});
    if (!a && pre && pre.professorId && !pre.disciplina) v.disciplina = (get('professores', pre.professorId) || {}).disciplina || '';

    const discs = Array.from(new Set(s.professores.map((p) => p.disciplina).concat(s.aulas.map((x) => x.disciplina)).filter(Boolean))).sort();
    const opt = (lista) => s[lista].map((x) => ({ valor: x.id, texto: x.nome }));
    const g = (n, ...cs) => `<div class="grade-${n}">${cs.join('')}</div>`;
    const corpo = `
      <form data-form="aula" data-id="${a ? a.id : ''}" novalidate>
        ${g(2, campo({ nome: 'turmaId', rotulo: 'Turma', tipo: 'select', opcoes: opt('turmas'), valor: v.turmaId }), campo({ nome: 'professorId', rotulo: 'Professor', tipo: 'select', opcoes: opt('professores'), valor: v.professorId }))}
        ${g(2, campo({ nome: 'salaId', rotulo: 'Sala', tipo: 'select', opcoes: opt('salas'), valor: v.salaId }), campo({ nome: 'disciplina', rotulo: 'Disciplina', valor: v.disciplina, lista: 'lista-disc', obrigatorio: true }))}
        <datalist id="lista-disc">${discs.map((d) => `<option value="${esc(d)}">`).join('')}</datalist>
        ${g(3, campo({ nome: 'dia', rotulo: 'Dia', tipo: 'select', opcoes: s.config.dias.map((d) => ({ valor: d, texto: E.DIAS[d] })), valor: v.dia }), campo({ nome: 'inicio', rotulo: 'Início', tipo: 'time', valor: v.inicio, obrigatorio: true }), campo({ nome: 'fim', rotulo: 'Fim', tipo: 'time', valor: v.fim, obrigatorio: true }))}
        ${campo({ nome: 'obs', rotulo: 'Observação', valor: v.obs || '', dica: 'Opcional' })}
        <div id="alerta-aula" class="alerta-aula" aria-live="polite"></div>
        <div class="dlg-rodape">
          ${a ? `<button type="button" class="btn btn-perigo-suave" data-acao="excluir-aula" data-id="${a.id}">Excluir aula</button>` : ''}
          <span class="grow"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario" id="btn-salvar-aula">Salvar aula</button>
        </div>
      </form>`;
    Modal.abrir(a ? 'Editar aula' : 'Nova aula', corpo, { classe: 'largo' });

    const form = $('form[data-form="aula"]');
    let discAnterior = v.disciplina;
    const ler = () => {
      const fd = new FormData(form);
      return { id: a ? a.id : undefined, turmaId: fd.get('turmaId'), professorId: fd.get('professorId'), salaId: fd.get('salaId'), disciplina: String(fd.get('disciplina') || '').trim(), dia: Number(fd.get('dia')), inicio: fd.get('inicio'), fim: fd.get('fim') };
    };
    const checar = () => {
      const d = ler();
      const box = $('#alerta-aula'), btn = $('#btn-salvar-aula');
      const erro = E.validarAula(Object.assign({}, d, { disciplina: d.disciplina || 'x' }));
      if (erro && !/disciplina/i.test(erro)) { box.innerHTML = `<div class="al al-info">${ic('info', 18)}<span>${esc(erro)}</span></div>`; btn.className = 'btn btn-primario'; btn.textContent = 'Salvar aula'; return; }
      const cs = E.conflitosDaAula(d);
      if (!cs.length) {
        box.innerHTML = `<div class="al al-ok">${ic('ok', 18)}<span>Sem conflitos com as outras aulas.</span></div>`;
        btn.className = 'btn btn-primario'; btn.textContent = 'Salvar aula';
      } else {
        box.innerHTML = cs.map((c) => `<div class="al al-${c.severidade}">${ic('alerta', 18)}<span><strong>${esc(c.titulo)}.</strong> ${esc(c.descricao)}</span></div>`).join('');
        const crit = cs.some((c) => c.severidade === 'critico');
        btn.className = 'btn ' + (crit ? 'btn-perigo' : 'btn-aviso');
        btn.textContent = crit ? 'Salvar mesmo com conflito' : 'Salvar com alerta';
      }
    };
    form.addEventListener('input', checar);
    form.addEventListener('change', (e) => {
      if (e.target.name === 'professorId') {
        const p = get('professores', e.target.value);
        const campoD = form.elements.disciplina;
        if (p && p.disciplina && (!campoD.value.trim() || campoD.value === discAnterior)) { campoD.value = p.disciplina; }
        discAnterior = p ? p.disciplina : discAnterior;
      }
      checar();
    });
    checar();
  };

  V.forms.aula = function (form) {
    const fd = new FormData(form);
    const dados = {
      id: form.dataset.id || undefined, turmaId: fd.get('turmaId'), professorId: fd.get('professorId'), salaId: fd.get('salaId'),
      disciplina: fd.get('disciplina'), dia: fd.get('dia'), inicio: fd.get('inicio'), fim: fd.get('fim'), obs: fd.get('obs')
    };
    try {
      const salva = E.salvarAula(dados);
      const n = E.conflitosDaAula(salva).length;
      Modal.fechar();
      toast(n ? `Aula salva com ${n} conflito${n > 1 ? 's' : ''}. Veja em Conflitos.` : 'Aula salva.', n ? 'aviso' : 'ok');
      render();
    } catch (e) { toast(e.message, 'erro'); }
  };
  V.acoes['ver-aula'] = (el) => V.abrirAula(el.dataset.id);
  V.acoes['excluir-aula'] = async (el) => {
    const a = get('aulas', el.dataset.id);
    if (!a) return;
    const ok = await Modal.confirmar({ titulo: 'Excluir aula?', texto: `${esc(a.disciplina)} com ${esc(nomeDe('turmas', a.turmaId))}, ${esc(E.DIAS[a.dia].toLowerCase())}, das ${a.inicio} às ${a.fim}.`, botao: 'Excluir', perigo: true });
    if (!ok) return;
    E.removerItem('aulas', a.id);
    Modal.fechar();
    toast('Aula excluída.');
    render();
  };
  V.detalheAula = function (a) {
    if (!a) return;
    const conf = E.conflitos().filter((c) => c.aulaIds.includes(a.id));
    Modal.abrir('Detalhes da aula', `
      <dl class="detalhe">
        <dt>Disciplina</dt><dd>${esc(a.disciplina)}</dd>
        <dt>Turma</dt><dd>${esc(nomeDe('turmas', a.turmaId))}</dd>
        <dt>Professor</dt><dd>${esc(nomeDe('professores', a.professorId))}</dd>
        <dt>Sala</dt><dd>${esc(nomeDe('salas', a.salaId))}</dd>
        <dt>Horário</dt><dd>${esc(E.DIAS[a.dia])}, das ${a.inicio} às ${a.fim}</dd>
        ${a.obs ? `<dt>Observação</dt><dd>${esc(a.obs)}</dd>` : ''}
      </dl>
      ${conf.map((c) => `<div class="al al-${c.severidade}">${ic('alerta', 18)}<span><strong>${esc(c.titulo)}.</strong> ${esc(c.descricao)}</span></div>`).join('')}
      <div class="dlg-rodape"><button type="button" class="btn" data-fechar>Fechar</button></div>`);
  };

  /* ==========================================================================
     CONFLITOS
     ========================================================================== */
  const ICONE_TIPO = { professor: 'professor', sala: 'sala', turma: 'turma', capacidade: 'sala', disponibilidade: 'professor' };

  V.conflitos = function () {
    const lista = E.conflitos();
    const s = st();
    const editar = E.pode('editar');
    V.est.sugestoes = [];
    const abertos = new Map(s.log.filter((l) => !l.resolvidoEm).map((l) => [l.key, l]));

    const cartoes = lista.map((c) => {
      const det = abertos.get(c.key);
      const aulasHtml = c.aulaIds.map((id) => {
        const a = get('aulas', id);
        if (!a) return '';
        let sugHtml = '';
        if (editar) {
          const sug = E.sugestoesParaAula(id, c.tipo);
          sugHtml = sug.length ? `<ul class="sugestoes">${sug.map((x) => {
            V.est.sugestoes.push(x);
            return `<li><span>${ic('raio', 15)}${esc(x.texto)}</span><button type="button" class="btn btn-sm" data-acao="aplicar-sugestao" data-i="${V.est.sugestoes.length - 1}">Aplicar</button></li>`;
          }).join('')}</ul>` : '<p class="muted peq">Nenhuma alternativa livre encontrada. Edite a aula para ajustar manualmente.</p>';
        }
        return `<div class="aula-conf">
          <div class="aula-conf-topo" style="--h:${matiz(a.disciplina)}">
            <span class="marca"></span>
            <div><strong>${esc(a.disciplina)}, ${esc(nomeDe('turmas', a.turmaId))}</strong><small>${esc(nomeCurto(nomeDe('professores', a.professorId)))} na ${esc(nomeDe('salas', a.salaId))}, ${esc(E.DIAS[a.dia].toLowerCase())} das ${a.inicio} às ${a.fim}</small></div>
            <button type="button" class="btn btn-sm" data-acao="ver-aula" data-id="${a.id}">${editar ? 'Editar aula' : 'Ver aula'}</button>
          </div>
          ${sugHtml}
        </div>`;
      }).join('');
      return `
        <article class="conflito ${c.severidade}">
          <header>
            <span class="conflito-icone">${ic(ICONE_TIPO[c.tipo] || 'alerta', 20)}</span>
            <div class="conflito-txt">
              <h3>${esc(c.titulo)} <span class="selo ${c.severidade}">${c.severidade === 'critico' ? 'Crítico' : 'Atenção'}</span></h3>
              <p>${esc(c.descricao)}</p>
              ${det ? `<small class="muted">Detectado ${haTempo(det.detectadoEm)}</small>` : ''}
            </div>
          </header>
          <div class="conflito-aulas">${aulasHtml}</div>
        </article>`;
    }).join('');

    const historico = s.log.slice().sort((a, b) => b.detectadoEm - a.detectadoEm).slice(0, 12);
    const tabHist = historico.length ? `
      <div class="tabela-wrap"><table class="tabela compacta">
        <thead><tr><th>Conflito</th><th>Detectado em</th><th>Situação</th><th>Tempo até resolver</th></tr></thead>
        <tbody>${historico.map((l) => `<tr>
          <td>${esc(l.titulo)}<small>${esc(l.descricao)}</small></td>
          <td>${dataHora(l.detectadoEm)}</td>
          <td>${l.resolvidoEm ? `<span class="pilula est-livre">Resolvido</span><small>${dataHora(l.resolvidoEm)}</small>` : '<span class="pilula est-conflito">Aberto</span>'}</td>
          <td>${l.resolvidoEm ? duracao(l.resolvidoEm - l.detectadoEm) : '-'}</td></tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted pad">O histórico aparece aqui quando o primeiro conflito for identificado.</p>';

    const criticos = lista.filter((c) => c.severidade === 'critico').length;
    return `
      <div class="barra-topo">
        <p class="muted">${lista.length ? `${lista.length} ${lista.length > 1 ? 'conflitos abertos' : 'conflito aberto'}: ${criticos} críticos e ${lista.length - criticos} de atenção. O sistema confere tudo a cada alteração nos horários.` : 'O sistema confere professores, salas e turmas a cada alteração nos horários.'}</p>
      </div>
      ${lista.length ? `<div class="conflitos-lista">${cartoes}</div>` : `<section class="painel"><div class="tudo-certo grande">${ic('ok', 28)}<div><strong>Nenhum conflito nos horários.</strong><span>Nenhum professor, sala ou turma está em dois lugares ao mesmo tempo, e nenhuma sala é pequena para a turma.</span></div></div></section>`}
      <section class="painel sem-pad">
        <header class="painel-topo pad"><h3>Histórico de conflitos</h3></header>
        ${tabHist}
      </section>`;
  };
  V.acoes['aplicar-sugestao'] = (el) => {
    const sug = V.est.sugestoes[Number(el.dataset.i)];
    if (!sug) return;
    E.aplicarPatchAula(sug.aulaId, sug.patch);
    toast('Sugestão aplicada. Conferindo os horários novamente.');
    render();
  };

  /* ==========================================================================
     MÉTRICAS
     ========================================================================== */
  V.metricas = function () {
    const m = E.metricas();
    const dt = new Date(m.ultimaAtualizacao);
    const ms = m.deteccaoMs < 1 ? 'menos de 1 ms' : m.deteccaoMs.toFixed(1).replace('.', ',') + ' ms';
    const item = (valor, rotulo, nota) => `<div class="indicador"><strong>${valor}</strong><span>${rotulo}</span><small>${nota}</small></div>`;
    const maxHoras = Math.max(1, ...m.professores.map((p) => p.horas));
    const maxDia = Math.max(1, ...m.porDia.map((d) => d.total));

    return `
      <section class="painel sem-pad">
        <div class="indicadores">
          ${item(m.conflitosIdentificados, 'Conflitos de horários identificados', `${m.conflitosAbertos} abertos e ${m.conflitosResolvidos} resolvidos`)}
          ${item(m.salasMonitoradas, 'Salas monitoradas', 'Uso acompanhado em tempo real')}
          ${item(m.professoresAcompanhados, 'Professores acompanhados', 'Aulas e disponibilidade')}
          ${item(m.turmasAcompanhadas, 'Turmas acompanhadas', `${m.totalAulas} aulas na semana`)}
          ${item(ms, 'Tempo para identificar um conflito', 'Medido a cada alteração nos horários')}
          ${item(m.tempoMedioResolucaoMs == null ? '-' : duracao(m.tempoMedioResolucaoMs), 'Tempo para resolver um conflito', m.conflitosResolvidos ? `Média de ${m.conflitosResolvidos} conflitos resolvidos` : 'Aparece depois do primeiro conflito resolvido')}
          ${item('<span class="dot-vivo"></span>Ativa', 'Informações em tempo real', `Atualizado às ${root.UI.dois(dt.getHours())}:${root.UI.dois(dt.getMinutes())}:${root.UI.dois(dt.getSeconds())}. Renova a cada minuto e a cada alteração.`)}
        </div>
      </section>
      <div class="duas-col">
        <section class="painel">
          <header class="painel-topo"><div><h3>Ocupação semanal das salas</h3><p class="muted">Horas de aula sobre as horas de funcionamento.</p></div></header>
          ${m.salas.length ? `<div class="barras">${m.salas.slice().sort((a, b) => b.pct - a.pct).map((x) => `<div class="barra-linha"><span>${esc(x.nome)}</span><div class="barra"><i style="width:${x.pct}%"></i></div><b>${Math.round(x.pct)}%</b></div>`).join('')}</div>` : '<p class="muted pad">Sem salas cadastradas.</p>'}
        </section>
        <section class="painel">
          <header class="painel-topo"><div><h3>Carga semanal dos professores</h3><p class="muted">Horas de aula por semana.</p></div></header>
          ${m.professores.length ? `<div class="barras">${m.professores.slice().sort((a, b) => b.horas - a.horas).map((x) => `<div class="barra-linha"><span>${esc(nomeCurto(x.nome))}</span><div class="barra alt"><i style="width:${x.horas / maxHoras * 100}%"></i></div><b>${horasTexto(x.horas)}</b></div>`).join('')}</div>` : '<p class="muted pad">Sem professores cadastrados.</p>'}
        </section>
      </div>
      <section class="painel">
        <header class="painel-topo"><div><h3>Aulas por dia da semana</h3></div></header>
        <div class="colunas-dia">${m.porDia.map((d) => `<div class="col-dia"><b>${d.total}</b><div class="col-barra"><i style="height:${d.total / maxDia * 100}%"></i></div><span>${E.DIAS_CURTO[d.dia]}</span></div>`).join('')}</div>
      </section>`;
  };

  /* ==========================================================================
     CONFIGURAÇÕES
     ========================================================================== */
  const PERFIS = { gestor: 'Equipe gestora', coordenacao: 'Coordenação pedagógica', professor: 'Professor' };

  V.config = function () {
    if (!E.pode('admin')) return vazio('cadeado', 'Acesso restrito', 'Somente a equipe gestora pode alterar as configurações.');
    const s = st();
    const c = s.config;
    const linhasUsu = s.usuarios.map((u) => `<tr>
      <td class="c-nome"><strong>${esc(u.nome)}</strong><small>${esc(u.email)}</small></td>
      <td>${esc(PERFIS[u.perfil] || u.perfil)}${u.professorId ? `<small>Vinculado a ${esc(nomeDe('professores', u.professorId))}</small>` : ''}</td>
      <td class="c-acoes">
        <button type="button" class="btn-icone" data-acao="editar-usuario" data-id="${u.id}" aria-label="Editar ${esc(u.nome)}">${ic('editar', 17)}</button>
        <button type="button" class="btn-icone perigo" data-acao="excluir-usuario" data-id="${u.id}" aria-label="Excluir ${esc(u.nome)}">${ic('lixo', 17)}</button>
      </td></tr>`).join('');
    return `
      <section class="painel">
        <header class="painel-topo"><div><h3>Escola e horário de funcionamento</h3><p class="muted">Define a faixa de horas da grade e o que conta como dia letivo.</p></div></header>
        <form data-form="config" novalidate>
          <div class="grade-3">
            ${campo({ nome: 'nomeEscola', rotulo: 'Nome da escola', valor: c.nomeEscola })}
            ${campo({ nome: 'inicioDia', rotulo: 'Início das aulas', tipo: 'time', valor: c.inicioDia })}
            ${campo({ nome: 'fimDia', rotulo: 'Fim das aulas', tipo: 'time', valor: c.fimDia })}
          </div>
          <div class="campo"><label>Dias letivos</label>${checkDias('dias', [1, 2, 3, 4, 5, 6], c.dias)}</div>
          <div class="form-rodape"><button type="submit" class="btn btn-primario">Salvar configurações</button></div>
        </form>
      </section>

      <section class="painel sem-pad">
        <header class="painel-topo pad"><div><h3>Usuários e acesso</h3><p class="muted">Equipe gestora e coordenação editam. Professores consultam.</p></div>
          <button type="button" class="btn btn-primario" data-acao="novo-usuario">${ic('mais', 16)} Novo usuário</button></header>
        <div class="tabela-wrap"><table class="tabela compacta"><thead><tr><th>Usuário</th><th>Perfil</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody>${linhasUsu}</tbody></table></div>
      </section>

      <section class="painel">
        <header class="painel-topo"><div><h3>Dados</h3><p class="muted">Tudo fica salvo neste navegador. Faça backup para levar os dados para outro computador.</p></div></header>
        <div class="acoes-dados">
          <button type="button" class="btn" data-acao="exportar">${ic('baixar', 16)} Exportar backup</button>
          <button type="button" class="btn" data-acao="importar-clique">${ic('enviar', 16)} Importar backup</button>
          <input type="file" id="arquivo-importar" accept="application/json,.json" data-mudar="importar" hidden>
          <button type="button" class="btn" data-acao="exemplo">Restaurar dados de exemplo</button>
          <button type="button" class="btn btn-perigo-suave" data-acao="limpar">Apagar turmas, professores, salas e aulas</button>
        </div>
      </section>`;
  };

  V.forms.config = function (form) {
    const fd = new FormData(form);
    const dias = fd.getAll('dias').map(Number);
    const inicio = fd.get('inicioDia'), fim = fd.get('fimDia');
    if (!dias.length) return toast('Marque pelo menos um dia letivo.', 'erro');
    if (!inicio || !fim || E.paraMin(fim) <= E.paraMin(inicio)) return toast('O fim das aulas precisa ser depois do início.', 'erro');
    E.salvarConfig({ nomeEscola: String(fd.get('nomeEscola') || '').trim() || 'Escola Inteligente', inicioDia: inicio, fimDia: fim, dias });
    const fora = st().aulas.filter((a) => !dias.includes(a.dia) || E.paraMin(a.inicio) < E.paraMin(inicio) || E.paraMin(a.fim) > E.paraMin(fim)).length;
    toast(fora ? `Configurações salvas. ${fora} aulas ficam fora do novo horário de funcionamento.` : 'Configurações salvas.', fora ? 'aviso' : 'ok');
    render();
  };

  V.formUsuario = function (id) {
    const s = st();
    const u = id ? get('usuarios', id) : { perfil: 'coordenacao', professorId: '' };
    Modal.abrir(id ? 'Editar usuário' : 'Novo usuário', `
      <form data-form="usuario" data-id="${id || ''}" novalidate>
        <div class="grade-2">${campo({ nome: 'nome', rotulo: 'Nome', valor: u.nome || '', obrigatorio: true })}${campo({ nome: 'email', rotulo: 'E-mail de acesso', tipo: 'email', valor: u.email || '', obrigatorio: true })}</div>
        <div class="grade-2">${campo({ nome: 'senha', rotulo: 'Senha', valor: u.senha || '', obrigatorio: true, dica: 'Sistema de demonstração: a senha fica salva neste navegador.' })}
        ${campo({ nome: 'perfil', rotulo: 'Perfil', tipo: 'select', valor: u.perfil, opcoes: Object.keys(PERFIS).map((k) => ({ valor: k, texto: PERFIS[k] })) })}</div>
        ${campo({ nome: 'professorId', rotulo: 'Professor vinculado', tipo: 'select', valor: u.professorId || '', opcoes: [{ valor: '', texto: 'Nenhum' }].concat(s.professores.map((p) => ({ valor: p.id, texto: p.nome }))), dica: 'Usado para mostrar “Minhas aulas” no painel do professor.' })}
        <div class="dlg-rodape"><button type="button" class="btn" data-fechar>Cancelar</button><button type="submit" class="btn btn-primario">Salvar</button></div>
      </form>`);
  };
  V.forms.usuario = function (form) {
    const fd = new FormData(form);
    const nome = String(fd.get('nome') || '').trim(), senha = String(fd.get('senha') || '');
    if (!nome) return toast('Informe o nome.', 'erro');
    if (senha.length < 4) return toast('A senha precisa ter pelo menos 4 caracteres.', 'erro');
    try {
      E.salvarUsuario({ id: form.dataset.id || undefined, nome, email: fd.get('email'), senha, perfil: fd.get('perfil'), professorId: fd.get('professorId') || null });
      Modal.fechar(); toast('Usuário salvo.'); render();
    } catch (e) { toast(e.message, 'erro'); }
  };
  V.acoes['novo-usuario'] = () => V.formUsuario();
  V.acoes['editar-usuario'] = (el) => V.formUsuario(el.dataset.id);
  V.acoes['excluir-usuario'] = async (el) => {
    const u = get('usuarios', el.dataset.id);
    if (!u) return;
    const ok = await Modal.confirmar({ titulo: 'Excluir usuário?', texto: `<strong>${esc(u.nome)}</strong> não poderá mais entrar no sistema.`, botao: 'Excluir', perigo: true });
    if (!ok) return;
    try { E.removerUsuario(u.id); toast('Usuário excluído.'); render(); } catch (e) { toast(e.message, 'erro'); }
  };
  V.acoes.exportar = () => {
    const blob = new Blob([E.exportar()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `escola-inteligente-backup-${d.getFullYear()}-${root.UI.dois(d.getMonth() + 1)}-${root.UI.dois(d.getDate())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup exportado.');
  };
  V.acoes['importar-clique'] = () => { const f = $('#arquivo-importar'); if (f) f.click(); };
  V.mudar.importar = async (el) => {
    const arq = el.files && el.files[0];
    if (!arq) return;
    const texto = await arq.text();
    el.value = '';
    const ok = await Modal.confirmar({ titulo: 'Importar backup?', texto: 'Os dados atuais serão substituídos pelos do arquivo.', botao: 'Importar', perigo: true });
    if (!ok) return;
    try { E.importar(texto); toast('Backup importado.'); render(); } catch (e) { toast(e.message, 'erro'); }
  };
  V.acoes.exemplo = async () => {
    const ok = await Modal.confirmar({ titulo: 'Restaurar dados de exemplo?', texto: 'Turmas, professores, salas, aulas e usuários atuais serão substituídos pelos dados de exemplo.', botao: 'Restaurar', perigo: true });
    if (!ok) return;
    E.restaurarExemplo(); E.sair(); toast('Dados de exemplo restaurados. Entre novamente.'); render();
  };
  V.acoes.limpar = async () => {
    const ok = await Modal.confirmar({ titulo: 'Apagar todos os dados escolares?', texto: 'Turmas, professores, salas e aulas serão apagados. Usuários e configurações continuam.', botao: 'Apagar tudo', perigo: true });
    if (!ok) return;
    E.limparDados(); toast('Dados apagados.'); render();
  };

  /* ==========================================================================
     PROJETO
     ========================================================================== */
  V.projeto = function () {
    const linha = (titulo, texto, onde) => `<li><div><strong>${titulo}</strong><p>${texto}</p></div>${onde ? `<a class="onde" href="${onde[1]}">${onde[0]}</a>` : ''}</li>`;
    return `
      <section class="painel">
        <header class="painel-topo"><div><h3>Proposta de valor</h3></div></header>
        <p class="destaque-texto">Uma central inteligente para organizar e monitorar salas, professores, turmas e horários, identificando conflitos e oferecendo uma visão completa da escola em tempo real.</p>
        <p class="muted">Conceito de alto nível: um painel de controle da escola que organiza horários, salas e professores e alerta sobre conflitos.</p>
      </section>
      <div class="duas-col">
        <section class="painel">
          <header class="painel-topo"><h3>Problemas e onde o sistema responde</h3></header>
          <ul class="mapa">
            ${linha('Conflitos de horários entre professores e salas', 'Detecção automática em toda alteração, com sugestões de solução e histórico.', ['Conflitos', '#/conflitos'])}
            ${linha('Dificuldade para monitorar salas em uso e turmas', 'Linha do tempo das salas e status ao vivo de cada sala e turma.', ['Painel', '#/painel'])}
            ${linha('Dificuldade para acompanhar professores disponíveis e em aula', 'Status de cada professor agora e a próxima aula.', ['Professores', '#/professores'])}
          </ul>
        </section>
        <section class="painel">
          <header class="painel-topo"><h3>Solução</h3></header>
          <ul class="mapa">
            ${linha('Monitoramento das salas, turmas e professores', 'Situação atual baseada no relógio, com opção de simular outro horário.', ['Salas', '#/salas'])}
            ${linha('Programação e gerenciamento dos horários', 'Grade semanal por turma, professor ou sala, com criação e edição de aulas.', ['Horários', '#/horarios'])}
            ${linha('Identificação de conflitos de horários', 'Professor, sala, turma, capacidade e disponibilidade.', ['Conflitos', '#/conflitos'])}
            ${linha('Visão geral da escola em tempo real', 'Painel com números do momento, linha do tempo e próximas aulas.', ['Painel', '#/painel'])}
          </ul>
        </section>
      </div>
      <div class="duas-col">
        <section class="painel">
          <header class="painel-topo"><h3>Segmentos e canais</h3></header>
          <ul class="mapa">
            ${linha('Equipe gestora e coordenação pedagógica', 'Perfis com permissão para cadastrar e editar horários.', ['Usuários', '#/config'])}
            ${linha('Professores', 'Perfil de consulta com “Minhas aulas” no painel.', null)}
            ${linha('Sistema web ou painel digital', 'Funciona no navegador, com acesso por usuário e senha.', null)}
            ${linha('Integração futura com sistemas acadêmicos', 'Exportação e importação de backup em JSON.', ['Dados', '#/config'])}
          </ul>
        </section>
        <section class="painel">
          <header class="painel-topo"><h3>Métricas de desempenho</h3></header>
          <ul class="mapa">
            ${linha('Conflitos identificados, salas, professores e turmas acompanhados', 'Contadores atualizados automaticamente.', ['Métricas', '#/metricas'])}
            ${linha('Tempo para identificar e resolver conflitos', 'Cada conflito é registrado com hora de detecção e de resolução.', ['Métricas', '#/metricas'])}
            ${linha('Disponibilidade das informações em tempo real', 'Atualização automática a cada minuto e a cada alteração.', ['Painel', '#/painel'])}
          </ul>
        </section>
      </div>
      <section class="painel">
        <header class="painel-topo"><h3>Alternativa existente</h3></header>
        <p class="muted">Hoje os horários são organizados no Google Agenda, que não avisa quando um professor ou uma sala está em dois lugares ao mesmo tempo e não mostra quem está livre agora. Este sistema cobre exatamente essa lacuna.</p>
      </section>`;
  };

  root.V = V;
})(window);
