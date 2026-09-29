/* ==========================================================================
   Escola Inteligente - núcleo do sistema
   Dados, persistência, relógio, status em tempo real, detecção de conflitos,
   sugestões de solução e métricas. Sem dependências.
   ========================================================================== */
(function (root) {
  'use strict';

  const CHAVE = 'escolaInteligente.v1';
  const CH_SESSAO = 'escolaInteligente.sessao';
  const CH_RELOGIO = 'escolaInteligente.relogio';

  const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  /* ---------- armazenamento (localStorage com reserva em memória) ---------- */
  const memoria = {};
  function criarStore(nomeApi) {
    return {
      get(k) {
        try { return root[nomeApi].getItem(k); } catch (e) { return memoria[nomeApi + k] ?? null; }
      },
      set(k, v) {
        try { root[nomeApi].setItem(k, v); } catch (e) { memoria[nomeApi + k] = v; }
      },
      del(k) {
        try { root[nomeApi].removeItem(k); } catch (e) { delete memoria[nomeApi + k]; }
      }
    };
  }
  const local = criarStore('localStorage');
  const sessao = criarStore('sessionStorage');

  /* ---------- utilidades de tempo ---------- */
  const paraMin = (s) => {
    const p = String(s || '0:0').split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  };
  const paraHHMM = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  /* ---------- estado ---------- */
  let state = null;
  let conflitosAtuais = [];
  let deteccao = { ms: 0, em: null };
  let ultimaAtualizacao = Date.now();
  const ouvintes = [];

  const PREFIXO = { professores: 'prof', salas: 'sala', turmas: 'turma', aulas: 'aula', usuarios: 'user' };

  /* ---------- relógio (real ou simulado) ---------- */
  const Relogio = {
    offset: Number(sessao.get(CH_RELOGIO)) || 0,
    agora() { return new Date(Date.now() + this.offset); },
    simulado() { return this.offset !== 0; },
    definir(data) {
      this.offset = data.getTime() - Date.now();
      sessao.set(CH_RELOGIO, String(this.offset));
    },
    real() {
      this.offset = 0;
      sessao.del(CH_RELOGIO);
    }
  };

  /* ---------- dados de exemplo ---------- */
  function criarExemplo() {
    const config = { nomeEscola: 'Escola Inteligente', inicioDia: '07:00', fimDia: '18:00', dias: [1, 2, 3, 4, 5] };

    const professores = [
      ['prof_1', 'Ana Beatriz Souza', 'Matemática'],
      ['prof_2', 'Carlos Eduardo Lima', 'Língua Portuguesa'],
      ['prof_3', 'Mariana Ferreira', 'Ciências'],
      ['prof_4', 'Roberto Alves', 'História'],
      ['prof_5', 'Juliana Costa', 'Geografia'],
      ['prof_6', 'Fernando Rocha', 'Educação Física'],
      ['prof_7', 'Patrícia Nunes', 'Inglês'],
      ['prof_8', 'Lucas Martins', 'Informática'],
      ['prof_9', 'Helena Duarte', 'Artes']
    ].map(([id, nome, disciplina]) => ({
      id, nome, disciplina,
      email: nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).join('.') + '@escola.com',
      dias: [1, 2, 3, 4, 5]
    }));

    const salas = [
      { id: 'sala_101', nome: 'Sala 101', tipo: 'Sala de aula', capacidade: 35, bloco: 'Bloco A' },
      { id: 'sala_102', nome: 'Sala 102', tipo: 'Sala de aula', capacidade: 35, bloco: 'Bloco A' },
      { id: 'sala_103', nome: 'Sala 103', tipo: 'Sala de aula', capacidade: 30, bloco: 'Bloco A' },
      { id: 'sala_201', nome: 'Sala 201', tipo: 'Sala de aula', capacidade: 35, bloco: 'Bloco B' },
      { id: 'sala_202', nome: 'Sala 202', tipo: 'Sala de aula', capacidade: 35, bloco: 'Bloco B' },
      { id: 'lab_info', nome: 'Laboratório de Informática', tipo: 'Laboratório', capacidade: 36, bloco: 'Bloco C' },
      { id: 'lab_cien', nome: 'Laboratório de Ciências', tipo: 'Laboratório', capacidade: 36, bloco: 'Bloco C' },
      { id: 'quadra', nome: 'Quadra Poliesportiva', tipo: 'Espaço esportivo', capacidade: 80, bloco: 'Área externa' },
      { id: 'biblio', nome: 'Biblioteca', tipo: 'Espaço de estudo', capacidade: 40, bloco: 'Bloco C' }
    ];

    const turmas = [
      { id: 'turma_6a', nome: '6º Ano A', turno: 'Matutino', alunos: 32 },
      { id: 'turma_6b', nome: '6º Ano B', turno: 'Matutino', alunos: 30 },
      { id: 'turma_7a', nome: '7º Ano A', turno: 'Matutino', alunos: 34 },
      { id: 'turma_1em', nome: '1º Ano EM', turno: 'Matutino', alunos: 33 },
      { id: 'turma_8a', nome: '8º Ano A', turno: 'Vespertino', alunos: 29 },
      { id: 'turma_9a', nome: '9º Ano A', turno: 'Vespertino', alunos: 31 }
    ];
    const salaBase = { turma_6a: 'sala_101', turma_6b: 'sala_102', turma_7a: 'sala_201', turma_1em: 'sala_202', turma_8a: 'sala_101', turma_9a: 'sala_102' };
    const salaEspecial = { 'Educação Física': 'quadra', 'Informática': 'lab_info', 'Ciências': 'lab_cien' };

    const disciplinas = professores.map((p) => p.disciplina);
    const profDe = {};
    professores.forEach((p) => { profDe[p.disciplina] = p.id; });

    const periodosManha = [['07:30', '08:20'], ['08:20', '09:10'], ['09:30', '10:20'], ['10:20', '11:10'], ['11:10', '12:00']];
    const periodosTarde = [['13:30', '14:20'], ['14:20', '15:10'], ['15:30', '16:20'], ['16:20', '17:10']];

    const aulas = [];
    const gerar = (ids, periodos, passo) => {
      ids.forEach((turmaId, ti) => {
        for (let d = 1; d <= 5; d++) {
          periodos.forEach(([inicio, fim], pi) => {
            const disc = disciplinas[((d - 1) * 3 + pi + ti * passo) % disciplinas.length];
            aulas.push({
              id: `aula_${turmaId}_${d}_${pi}`,
              turmaId, professorId: profDe[disc], salaId: salaEspecial[disc] || salaBase[turmaId],
              disciplina: disc, dia: d, inicio, fim, obs: ''
            });
          });
        }
      });
    };
    gerar(['turma_6a', 'turma_6b', 'turma_7a', 'turma_1em'], periodosManha, 2);
    gerar(['turma_8a', 'turma_9a'], periodosTarde, 4);

    // Três situações de exemplo para demonstrar a detecção de conflitos
    const achar = (turmaId, dia, pi) => aulas.find((a) => a.id === `aula_${turmaId}_${dia}_${pi}`);
    const a1 = achar('turma_6a', 2, 1), a2 = achar('turma_6b', 2, 1);
    a2.professorId = a1.professorId; a2.disciplina = a1.disciplina;            // professor em duas turmas
    achar('turma_1em', 4, 2).salaId = achar('turma_7a', 4, 2).salaId;           // sala reservada duas vezes
    achar('turma_7a', 3, 3).salaId = 'sala_103';                                // sala pequena demais

    const usuarios = [
      { id: 'user_1', nome: 'Direção Escolar', email: 'gestor@escola.com', senha: 'admin123', perfil: 'gestor', professorId: null },
      { id: 'user_2', nome: 'Coordenação Pedagógica', email: 'coordenacao@escola.com', senha: 'coord123', perfil: 'coordenacao', professorId: null },
      { id: 'user_3', nome: 'Ana Beatriz Souza', email: 'professor@escola.com', senha: 'prof123', perfil: 'professor', professorId: 'prof_1' }
    ];

    return { versao: 1, config, professores, salas, turmas, aulas, usuarios, log: [] };
  }

  /* ---------- persistência ---------- */
  function normalizar(s) {
    s.config = Object.assign({ nomeEscola: 'Escola Inteligente', inicioDia: '07:00', fimDia: '18:00', dias: [1, 2, 3, 4, 5] }, s.config || {});
    ['professores', 'salas', 'turmas', 'aulas', 'usuarios', 'log'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    return s;
  }
  function salvar() { local.set(CHAVE, JSON.stringify(state)); }
  function carregar() {
    let s = null;
    try { const raw = local.get(CHAVE); if (raw) s = normalizar(JSON.parse(raw)); } catch (e) { s = null; }
    state = s || criarExemplo();
    sincronizarConflitos();
    salvar();
    return state;
  }
  function avisar() { ouvintes.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
  function commit() {
    sincronizarConflitos();
    ultimaAtualizacao = Date.now();
    salvar();
    avisar();
  }

  /* ---------- detecção de conflitos ---------- */
  function detectarConflitos(st) {
    const nomeDe = (lista, id) => { const x = lista.find((o) => o.id === id); return x ? x.nome : '(removido)'; };
    const res = [];
    const porDia = {};
    st.aulas.forEach((a) => { (porDia[a.dia] = porDia[a.dia] || []).push(a); });
    const faixa = (a, b) => paraHHMM(Math.max(paraMin(a.inicio), paraMin(b.inicio))) + ' às ' + paraHHMM(Math.min(paraMin(a.fim), paraMin(b.fim)));
    const resumo = (a) => `${nomeDe(st.turmas, a.turmaId)} (${nomeDe(st.salas, a.salaId)})`;

    Object.keys(porDia).forEach((k) => {
      const dia = Number(k);
      const dn = (DIAS[dia] || '').toLowerCase();
      const l = porDia[k].slice().sort((x, y) => paraMin(x.inicio) - paraMin(y.inicio) || paraMin(x.fim) - paraMin(y.fim));
      for (let i = 0; i < l.length; i++) {
        for (let j = i + 1; j < l.length; j++) {
          const a = l[i], b = l[j];
          if (paraMin(b.inicio) >= paraMin(a.fim)) break;
          const ids = [a.id, b.id].sort().join('+');
          if (a.professorId === b.professorId) {
            res.push({
              key: `professor|${a.professorId}|${ids}`, tipo: 'professor', severidade: 'critico', dia, aulaIds: [a.id, b.id], recursoId: a.professorId,
              titulo: 'Professor em duas aulas ao mesmo tempo',
              descricao: `${nomeDe(st.professores, a.professorId)} está em ${resumo(a)} e em ${resumo(b)}, ${dn}, das ${faixa(a, b)}.`
            });
          }
          if (a.salaId === b.salaId) {
            res.push({
              key: `sala|${a.salaId}|${ids}`, tipo: 'sala', severidade: 'critico', dia, aulaIds: [a.id, b.id], recursoId: a.salaId,
              titulo: 'Sala reservada duas vezes',
              descricao: `${nomeDe(st.salas, a.salaId)} está marcada para ${nomeDe(st.turmas, a.turmaId)} e para ${nomeDe(st.turmas, b.turmaId)}, ${dn}, das ${faixa(a, b)}.`
            });
          }
          if (a.turmaId === b.turmaId) {
            res.push({
              key: `turma|${a.turmaId}|${ids}`, tipo: 'turma', severidade: 'critico', dia, aulaIds: [a.id, b.id], recursoId: a.turmaId,
              titulo: 'Turma com aulas sobrepostas',
              descricao: `${nomeDe(st.turmas, a.turmaId)} tem ${a.disciplina} e ${b.disciplina} ao mesmo tempo, ${dn}, das ${faixa(a, b)}.`
            });
          }
        }
      }
    });

    st.aulas.forEach((a) => {
      const sala = st.salas.find((x) => x.id === a.salaId);
      const turma = st.turmas.find((x) => x.id === a.turmaId);
      const prof = st.professores.find((x) => x.id === a.professorId);
      const dn = (DIAS[a.dia] || '').toLowerCase();
      if (sala && turma && Number(sala.capacidade) > 0 && Number(turma.alunos) > Number(sala.capacidade)) {
        res.push({
          key: `capacidade|${a.id}`, tipo: 'capacidade', severidade: 'atencao', dia: a.dia, aulaIds: [a.id], recursoId: sala.id,
          titulo: 'Sala pequena para a turma',
          descricao: `${sala.nome} comporta ${sala.capacidade} pessoas, mas ${turma.nome} tem ${turma.alunos} alunos (${dn}, ${a.inicio} às ${a.fim}).`
        });
      }
      if (prof && Array.isArray(prof.dias) && prof.dias.length && !prof.dias.includes(a.dia)) {
        res.push({
          key: `disponibilidade|${a.id}`, tipo: 'disponibilidade', severidade: 'atencao', dia: a.dia, aulaIds: [a.id], recursoId: prof.id,
          titulo: 'Professor não atende neste dia',
          descricao: `${prof.nome} não atende ${dn === 'sábado' || dn === 'domingo' ? 'no' : 'na'} ${dn}, mas tem ${a.disciplina} com ${nomeDe(st.turmas, a.turmaId)} das ${a.inicio} às ${a.fim}.`
        });
      }
    });

    const peso = { critico: 0, atencao: 1 };
    res.sort((x, y) => peso[x.severidade] - peso[y.severidade] || x.dia - y.dia);
    return res;
  }

  function sincronizarConflitos() {
    const t0 = (root.performance || Date).now();
    const atuais = detectarConflitos(state);
    deteccao = { ms: (root.performance || Date).now() - t0, em: Date.now() };
    const agora = Date.now();
    const chaves = new Set(atuais.map((c) => c.key));
    state.log.forEach((l) => { if (!l.resolvidoEm && !chaves.has(l.key)) l.resolvidoEm = agora; });
    const abertos = new Map();
    state.log.forEach((l) => { if (!l.resolvidoEm) abertos.set(l.key, l); });
    atuais.forEach((c) => {
      const aberto = abertos.get(c.key);
      if (aberto) { aberto.descricao = c.descricao; aberto.titulo = c.titulo; return; }
      state.log.push({ key: c.key, tipo: c.tipo, severidade: c.severidade, titulo: c.titulo, descricao: c.descricao, detectadoEm: agora, resolvidoEm: null });
    });
    if (state.log.length > 300) {
      const abertosLog = state.log.filter((l) => !l.resolvidoEm);
      const fechados = state.log.filter((l) => l.resolvidoEm).slice(-(300 - abertosLog.length));
      state.log = fechados.concat(abertosLog);
    }
    conflitosAtuais = atuais;
  }

  // Conflitos que uma aula (ainda não salva ou alterada) causaria
  function conflitosDaAula(candidata) {
    const id = candidata.id || '__nova__';
    const st = Object.assign({}, state, { aulas: state.aulas.filter((a) => a.id !== candidata.id).concat([Object.assign({}, candidata, { id })]) });
    return detectarConflitos(st).filter((c) => c.aulaIds.includes(id));
  }

  /* ---------- status em tempo real ---------- */
  const CAMPO = { sala: 'salaId', professor: 'professorId', turma: 'turmaId' };
  const porInicio = (a, b) => paraMin(a.inicio) - paraMin(b.inicio);

  function tempo(d) { return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() }; }
  function diaLetivo(dia) { return state.config.dias.includes(dia); }
  function escolaAberta(t) {
    return diaLetivo(t.dia) && t.min >= paraMin(state.config.inicioDia) && t.min < paraMin(state.config.fimDia);
  }
  function aulasAgora(t) {
    return state.aulas.filter((a) => a.dia === t.dia && paraMin(a.inicio) <= t.min && t.min < paraMin(a.fim));
  }
  function aulasDoDia(dia) { return state.aulas.filter((a) => a.dia === dia).sort(porInicio); }

  function statusRecurso(tipo, id, t) {
    const campo = CAMPO[tipo];
    const doDia = state.aulas.filter((a) => a[campo] === id && a.dia === t.dia).sort(porInicio);
    const ativas = doDia.filter((a) => paraMin(a.inicio) <= t.min && t.min < paraMin(a.fim));
    const proxima = doDia.find((a) => paraMin(a.inicio) > t.min) || null;
    let estado = 'livre';
    if (!escolaAberta(t)) estado = 'fechado';
    else if (ativas.length > 1) estado = 'conflito';
    else if (ativas.length === 1) estado = 'ocupado';
    else if (tipo === 'professor') {
      const p = state.professores.find((x) => x.id === id);
      if (p && Array.isArray(p.dias) && p.dias.length && !p.dias.includes(t.dia)) estado = 'ausente';
    }
    return { estado, ativas, proxima, doDia };
  }

  /* ---------- sugestões de solução ---------- */
  function sobrepoe(a, b) {
    return a.dia === b.dia && paraMin(a.inicio) < paraMin(b.fim) && paraMin(b.inicio) < paraMin(a.fim);
  }
  function sugestoesParaAula(aulaId, tipoConflito) {
    const a = state.aulas.find((x) => x.id === aulaId);
    if (!a) return [];
    const turma = state.turmas.find((x) => x.id === a.turmaId);
    const prof = state.professores.find((x) => x.id === a.professorId);
    const dur = paraMin(a.fim) - paraMin(a.inicio);
    const out = [];
    const outras = state.aulas.filter((o) => o.id !== a.id);

    if (tipoConflito === 'sala' || tipoConflito === 'capacidade') {
      state.salas
        .filter((s) => s.id !== a.salaId && Number(s.capacidade) >= (turma ? Number(turma.alunos) : 0) && !outras.some((o) => o.salaId === s.id && sobrepoe(o, a)))
        .sort((x, y) => x.capacidade - y.capacidade)
        .slice(0, 3)
        .forEach((s) => out.push({ aulaId, tipo: 'sala', texto: `Trocar para ${s.nome} (capacidade ${s.capacidade})`, patch: { salaId: s.id } }));
    }
    if (tipoConflito !== 'capacidade') {
      const ini = paraMin(state.config.inicioDia), fim = paraMin(state.config.fimDia);
      const cand = [];
      state.config.dias.forEach((dia) => {
        if (prof && Array.isArray(prof.dias) && prof.dias.length && !prof.dias.includes(dia)) return;
        for (let s = ini; s + dur <= fim; s += 10) {
          if (dia === a.dia && s === paraMin(a.inicio)) continue;
          const c = Object.assign({}, a, { dia, inicio: paraHHMM(s), fim: paraHHMM(s + dur) });
          const livre = !outras.some((o) => sobrepoe(o, c) && (o.professorId === a.professorId || o.turmaId === a.turmaId || o.salaId === a.salaId));
          if (livre) cand.push({ c, custo: (dia === a.dia ? 0 : 1000) + Math.abs(s - paraMin(a.inicio)) });
        }
      });
      cand.sort((x, y) => x.custo - y.custo);
      // evita sugerir horários quase iguais
      const escolhidos = [];
      cand.forEach((x) => {
        if (escolhidos.length >= 3) return;
        if (escolhidos.some((e) => e.c.dia === x.c.dia && Math.abs(paraMin(e.c.inicio) - paraMin(x.c.inicio)) < 30)) return;
        escolhidos.push(x);
      });
      escolhidos.forEach(({ c }) => out.push({
        aulaId, tipo: 'horario', texto: `Mover para ${DIAS[c.dia].toLowerCase()}, ${c.inicio} às ${c.fim}`,
        patch: { dia: c.dia, inicio: c.inicio, fim: c.fim }
      }));
    }
    return out;
  }

  /* ---------- CRUD ---------- */
  function salvarItem(colecao, dados) {
    const lista = state[colecao];
    let item;
    if (dados.id) {
      const i = lista.findIndex((x) => x.id === dados.id);
      if (i >= 0) { lista[i] = Object.assign({}, lista[i], dados); item = lista[i]; }
      else { lista.push(dados); item = dados; }
    } else {
      item = Object.assign({}, dados, { id: uid(PREFIXO[colecao]) });
      lista.push(item);
    }
    commit();
    return item;
  }
  function removerItem(colecao, id) {
    const campo = { professores: 'professorId', salas: 'salaId', turmas: 'turmaId' }[colecao];
    let removidas = 0;
    if (campo) {
      const antes = state.aulas.length;
      state.aulas = state.aulas.filter((a) => a[campo] !== id);
      removidas = antes - state.aulas.length;
    }
    state[colecao] = state[colecao].filter((x) => x.id !== id);
    if (colecao === 'professores') state.usuarios.forEach((u) => { if (u.professorId === id) u.professorId = null; });
    commit();
    return removidas;
  }
  function contarAulasDe(colecao, id) {
    const campo = { professores: 'professorId', salas: 'salaId', turmas: 'turmaId' }[colecao];
    return campo ? state.aulas.filter((a) => a[campo] === id).length : 0;
  }
  function validarAula(a) {
    if (!state.turmas.some((x) => x.id === a.turmaId)) return 'Escolha a turma.';
    if (!state.professores.some((x) => x.id === a.professorId)) return 'Escolha o professor.';
    if (!state.salas.some((x) => x.id === a.salaId)) return 'Escolha a sala.';
    if (!String(a.disciplina || '').trim()) return 'Informe a disciplina.';
    if (!state.config.dias.includes(Number(a.dia))) return 'Este dia não é letivo. Ajuste os dias letivos em Configurações.';
    if (!/^\d{2}:\d{2}$/.test(a.inicio || '') || !/^\d{2}:\d{2}$/.test(a.fim || '')) return 'Informe o horário de início e de fim.';
    if (paraMin(a.fim) <= paraMin(a.inicio)) return 'O horário de fim precisa ser depois do início.';
    if (paraMin(a.inicio) < paraMin(state.config.inicioDia) || paraMin(a.fim) > paraMin(state.config.fimDia)) {
      return `A aula precisa ficar entre ${state.config.inicioDia} e ${state.config.fimDia}. Ajuste o horário de funcionamento em Configurações, se necessário.`;
    }
    return null;
  }
  function salvarAula(dados) {
    const erro = validarAula(dados);
    if (erro) throw new Error(erro);
    const limpo = Object.assign({}, dados, { dia: Number(dados.dia), disciplina: String(dados.disciplina).trim(), obs: String(dados.obs || '').trim() });
    return salvarItem('aulas', limpo);
  }
  function aplicarPatchAula(aulaId, patch) {
    const a = state.aulas.find((x) => x.id === aulaId);
    if (!a) return null;
    return salvarItem('aulas', Object.assign({}, a, patch));
  }
  function salvarConfig(cfg) {
    state.config = Object.assign({}, state.config, cfg);
    commit();
  }
  function salvarUsuario(dados) {
    const email = String(dados.email || '').trim().toLowerCase();
    if (!email) throw new Error('Informe o e-mail.');
    if (state.usuarios.some((u) => u.id !== dados.id && u.email.toLowerCase() === email)) throw new Error('Já existe um usuário com este e-mail.');
    return salvarItem('usuarios', Object.assign({}, dados, { email }));
  }
  function removerUsuario(id) {
    const u = state.usuarios.find((x) => x.id === id);
    if (!u) return;
    const atual = usuarioAtual();
    if (atual && atual.id === id) throw new Error('Você não pode excluir o usuário com o qual está conectado.');
    if (u.perfil === 'gestor' && state.usuarios.filter((x) => x.perfil === 'gestor').length <= 1) throw new Error('É preciso manter pelo menos um usuário da equipe gestora.');
    removerItem('usuarios', id);
  }

  /* ---------- autenticação ---------- */
  function entrar(email, senha) {
    const e = String(email || '').trim().toLowerCase();
    const u = state.usuarios.find((x) => x.email.toLowerCase() === e && x.senha === senha);
    if (!u) return null;
    sessao.set(CH_SESSAO, u.id);
    return u;
  }
  function usuarioAtual() {
    const id = sessao.get(CH_SESSAO);
    return (state && state.usuarios.find((u) => u.id === id)) || null;
  }
  function sair() { sessao.del(CH_SESSAO); }
  function pode(acao) {
    const u = usuarioAtual();
    if (!u) return false;
    if (acao === 'editar') return u.perfil === 'gestor' || u.perfil === 'coordenacao';
    if (acao === 'admin') return u.perfil === 'gestor';
    return false;
  }

  /* ---------- métricas ---------- */
  function metricas() {
    const cfg = state.config;
    const minDia = paraMin(cfg.fimDia) - paraMin(cfg.inicioDia);
    const semana = Math.max(1, minDia * cfg.dias.length);
    const dur = (a) => paraMin(a.fim) - paraMin(a.inicio);
    const somar = (campo, id) => state.aulas.filter((a) => a[campo] === id).reduce((s, a) => s + dur(a), 0);
    const salas = state.salas.map((s) => { const m = somar('salaId', s.id); return { id: s.id, nome: s.nome, horas: m / 60, pct: Math.min(100, m / semana * 100) }; });
    const professores = state.professores.map((p) => ({ id: p.id, nome: p.nome, horas: somar('professorId', p.id) / 60, aulas: state.aulas.filter((a) => a.professorId === p.id).length }));
    const porDia = cfg.dias.map((d) => ({ dia: d, total: state.aulas.filter((a) => a.dia === d).length }));
    const resolvidos = state.log.filter((l) => l.resolvidoEm);
    const tempoMedio = resolvidos.length ? resolvidos.reduce((s, l) => s + (l.resolvidoEm - l.detectadoEm), 0) / resolvidos.length : null;
    return {
      salasMonitoradas: state.salas.length,
      professoresAcompanhados: state.professores.length,
      turmasAcompanhadas: state.turmas.length,
      totalAulas: state.aulas.length,
      conflitosAbertos: conflitosAtuais.length,
      conflitosCriticos: conflitosAtuais.filter((c) => c.severidade === 'critico').length,
      conflitosIdentificados: state.log.length,
      conflitosResolvidos: resolvidos.length,
      tempoMedioResolucaoMs: tempoMedio,
      deteccaoMs: deteccao.ms,
      ultimaAtualizacao,
      salas, professores, porDia
    };
  }

  /* ---------- backup ---------- */
  function exportar() { return JSON.stringify(state, null, 2); }
  function importar(texto) {
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
    if (!dados || !Array.isArray(dados.professores) || !Array.isArray(dados.salas) || !Array.isArray(dados.turmas) || !Array.isArray(dados.aulas)) {
      throw new Error('O arquivo não parece ser um backup da Escola Inteligente.');
    }
    const atual = usuarioAtual();
    state = normalizar(dados);
    if (!state.usuarios.length) state.usuarios = criarExemplo().usuarios;
    if (atual && !state.usuarios.some((u) => u.id === atual.id)) sair();
    state.log = [];
    commit();
  }
  function restaurarExemplo() { state = criarExemplo(); commit(); }
  function limparDados() {
    Object.assign(state, { professores: [], salas: [], turmas: [], aulas: [], log: [] });
    state.usuarios.forEach((u) => { u.professorId = null; });
    commit();
  }

  /* ---------- API pública ---------- */
  root.EI = {
    DIAS, DIAS_CURTO, paraMin, paraHHMM, Relogio,
    carregar, recarregar() { const s = local.get(CHAVE); if (s) { try { state = normalizar(JSON.parse(s)); sincronizarConflitos(); } catch (e) { /* mantém estado atual */ } } },
    estado: () => state,
    aoMudar: (f) => ouvintes.push(f),
    conflitos: () => conflitosAtuais,
    detectarConflitos, conflitosDaAula, sugestoesParaAula,
    tempo, escolaAberta, aulasAgora, aulasDoDia, statusRecurso, diaLetivo,
    salvarItem, removerItem, contarAulasDe, salvarAula, aplicarPatchAula, validarAula, salvarConfig, salvarUsuario, removerUsuario,
    entrar, sair, usuarioAtual, pode,
    metricas, exportar, importar, restaurarExemplo, limparDados,
    _criarExemplo: criarExemplo
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EI;
})(typeof window !== 'undefined' ? window : globalThis);
