/* ==========================================================================
   Escola Inteligente - aplicação
   Login, estrutura da página, rotas, relógio ao vivo e eventos globais.
   ========================================================================== */
(function (root) {
  'use strict';
  const E = root.EI, U = root.UI, V = root.V;
  const { ic, esc, $, $$, Modal, toast, campo } = U;

  const ROTAS = {
    painel: { titulo: 'Painel da escola', icone: 'painel', nav: 'Painel', view: 'painel', vivo: true },
    horarios: { titulo: 'Horários', icone: 'horarios', nav: 'Horários', view: 'horarios', vivo: true },
    conflitos: { titulo: 'Conflitos', icone: 'alerta', nav: 'Conflitos', view: 'conflitos' },
    salas: { titulo: 'Salas', icone: 'sala', nav: 'Salas', view: 'salas', vivo: true },
    professores: { titulo: 'Professores', icone: 'professor', nav: 'Professores', view: 'professores', vivo: true },
    turmas: { titulo: 'Turmas', icone: 'turma', nav: 'Turmas', view: 'turmas', vivo: true },
    metricas: { titulo: 'Métricas', icone: 'metricas', nav: 'Métricas', view: 'metricas' },
    projeto: { titulo: 'Sobre o projeto', icone: 'info', nav: 'Sobre o projeto', view: 'projeto' },
    config: { titulo: 'Configurações', icone: 'config', nav: 'Configurações', view: 'config', admin: true }
  };
  const GRUPOS = [['painel', 'horarios', 'conflitos'], ['salas', 'professores', 'turmas'], ['metricas', 'projeto', 'config']];
  const PERFIS = { gestor: 'Equipe gestora', coordenacao: 'Coordenação pedagógica', professor: 'Professor' };

  const CH_TEMA = 'escolaInteligente.tema';
  let ultimaChaveMin = '';

  const chaveMin = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
  function rotaAtual() {
    const r = (location.hash || '').replace(/^#\/?/, '') || 'painel';
    const rota = ROTAS[r] ? r : 'painel';
    if (ROTAS[rota].admin && !E.pode('admin')) return 'painel';
    return rota;
  }

  /* ---------- tema ---------- */
  function aplicarTema(t) {
    document.documentElement.dataset.tema = t;
    try { localStorage.setItem(CH_TEMA, t); } catch (e) { /* ignora */ }
    const b = $('#btn-tema');
    if (b) b.innerHTML = ic(t === 'escuro' ? 'sol' : 'lua', 19);
  }
  const temaAtual = () => document.documentElement.dataset.tema || 'claro';

  /* ---------- login ---------- */
  const LOGO = `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--giz)"/><path d="M8 11h16M8 16h10M8 21h13" stroke="#14382f" stroke-width="2.4" stroke-linecap="round"/></svg>`;

  function telaLogin() {
    const nome = esc(E.estado().config.nomeEscola);
    $('#app').innerHTML = `
      <main class="login">
        <section class="login-arte" aria-hidden="true">
          <div class="mini-tl">
            <div class="mini-linha"><i style="left:4%;width:22%;--h:210"></i><i style="left:30%;width:18%;--h:150"></i><i style="left:56%;width:26%;--h:32"></i></div>
            <div class="mini-linha"><i style="left:12%;width:20%;--h:280"></i><i style="left:38%;width:24%;--h:190"></i><i style="left:68%;width:16%;--h:340" class="mini-conf"></i></div>
            <div class="mini-linha"><i style="left:2%;width:26%;--h:60"></i><i style="left:34%;width:16%;--h:230"></i><i style="left:58%;width:28%;--h:120"></i></div>
            <div class="mini-linha"><i style="left:18%;width:22%;--h:15"></i><i style="left:46%;width:20%;--h:300"></i></div>
            <b class="mini-agora"></b>
          </div>
          <h2>Quem está onde, e quando.</h2>
          <p>Salas, professores e turmas numa só visão, com aviso imediato quando dois horários se chocam.</p>
        </section>
        <section class="login-form">
          <div class="login-caixa">
            <div class="login-marca">${LOGO}<strong>${nome}</strong></div>
            <h1>Entrar no sistema</h1>
            <p class="muted">Acesso para a equipe gestora, coordenação e professores.</p>
            <form data-form="login" novalidate>
              ${campo({ nome: 'email', rotulo: 'E-mail', tipo: 'email', extra: 'autocomplete="username"' })}
              ${campo({ nome: 'senha', rotulo: 'Senha', tipo: 'password', extra: 'autocomplete="current-password"' })}
              <div id="login-erro" class="login-erro" role="alert"></div>
              <button type="submit" class="btn btn-primario btn-bloco">Entrar</button>
            </form>
            <div class="acesso-rapido">
              <p>Contas de demonstração</p>
              <div>
                <button type="button" class="chip" data-acao="login-demo" data-email="gestor@escola.com" data-senha="admin123">Equipe gestora</button>
                <button type="button" class="chip" data-acao="login-demo" data-email="coordenacao@escola.com" data-senha="coord123">Coordenação</button>
                <button type="button" class="chip" data-acao="login-demo" data-email="professor@escola.com" data-senha="prof123">Professor</button>
              </div>
            </div>
          </div>
        </section>
      </main>`;
    const f = $('#c-email'); if (f) f.focus();
  }

  /* ---------- estrutura (menu lateral + topo) ---------- */
  function montarShell(u) {
    const cfg = E.estado().config;
    const nav = GRUPOS.map((g) => {
      const itens = g.filter((r) => !ROTAS[r].admin || E.pode('admin')).map((r) => `
        <a class="nav-item" data-rota="${r}" href="#/${r}">${ic(ROTAS[r].icone, 19)}<span>${ROTAS[r].nav}</span>${r === 'conflitos' ? '<b class="nav-badge" id="badge-conflitos" hidden></b>' : ''}</a>`).join('');
      return itens ? `<div class="nav-grupo">${itens}</div>` : '';
    }).join('');
    const iniciais = u.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
    $('#app').innerHTML = `
      <div class="shell" data-uid="${u.id}">
        <aside class="lateral" id="lateral">
          <div class="lateral-marca">${LOGO}<div><strong>${esc(cfg.nomeEscola)}</strong><small>Central de horários</small></div></div>
          <nav aria-label="Principal">${nav}</nav>
          <div class="lateral-rodape">
            <div class="usuario"><span class="avatar">${esc(iniciais)}</span><div><strong>${esc(u.nome)}</strong><small>${esc(PERFIS[u.perfil] || u.perfil)}</small></div></div>
            <button type="button" class="btn-lateral" data-acao="sair">${ic('sair', 17)} Sair</button>
          </div>
        </aside>
        <div class="lateral-fundo" data-acao="menu"></div>
        <div class="principal">
          <header class="topo">
            <button type="button" class="btn-icone menu-btn" data-acao="menu" aria-label="Abrir menu">${ic('menu', 20)}</button>
            <h1 id="titulo-pagina"></h1>
            <span class="grow"></span>
            <button type="button" class="relogio" data-acao="relogio" title="Ver ou simular outro horário" aria-label="Relógio da escola. Clique para simular outro horário">
              <span class="dot-vivo" id="dot-vivo"></span>
              <span class="rel-txt"><b id="rel-hora">--:--:--</b><small id="rel-data"></small></span>
              <em id="rel-sim" hidden>Simulado</em>
            </button>
            <button type="button" class="btn-icone" id="btn-tema" data-acao="tema" aria-label="Alternar tema claro e escuro"></button>
          </header>
          <main id="conteudo" class="conteudo" tabindex="-1"></main>
        </div>
      </div>`;
    aplicarTema(temaAtual());
  }

  /* ---------- render ---------- */
  const App = {
    acoes: {}, forms: {},

    render(opcoes = {}) {
      const u = E.usuarioAtual();
      if (!u) { telaLogin(); return; }
      let shell = $('.shell');
      if (!shell || shell.dataset.uid !== u.id) { montarShell(u); shell = $('.shell'); }
      if (!location.hash) { history.replaceState(null, '', '#/painel'); }

      const r = rotaAtual();
      const rota = ROTAS[r];
      // marca de menu e badge de conflitos
      $$('.nav-item').forEach((a) => a.classList.toggle('ativo', a.dataset.rota === r));
      const n = E.conflitos().length;
      const badge = $('#badge-conflitos');
      if (badge) { badge.hidden = n === 0; badge.textContent = n; }
      $('#titulo-pagina').textContent = rota.titulo;
      document.title = `${rota.titulo} | ${E.estado().config.nomeEscola}`;

      // preserva rolagem e busca durante atualizações automáticas
      const y = root.scrollY;
      const busca = $('[data-busca]');
      const termo = busca ? busca.value : '';
      const cont = $('#conteudo');
      try {
        cont.innerHTML = V[rota.view]();
      } catch (err) {
        console.error(err);
        cont.innerHTML = `<div class="vazio">${ic('alerta', 28)}<p>Não foi possível montar esta tela.</p><span>${esc(err.message)}</span></div>`;
      }
      if (termo) {
        const nova = $('[data-busca]');
        if (nova) { nova.value = termo; nova.dispatchEvent(new Event('input', { bubbles: true })); }
      }
      if (opcoes.silencioso || opcoes.manterRolagem) root.scrollTo(0, y);
      ultimaChaveMin = chaveMin(E.Relogio.agora());
      tick();
    },

    ir(rota) { location.hash = '#/' + rota; }
  };

  /* ---------- relógio ---------- */
  function tick() {
    const agora = E.Relogio.agora();
    const h = $('#rel-hora');
    if (h) {
      h.textContent = U.horaSeg(agora);
      $('#rel-data').textContent = U.dataCurta(agora);
      $('#rel-sim').hidden = !E.Relogio.simulado();
      const rel = $('.relogio');
      if (rel) rel.classList.toggle('simulado', E.Relogio.simulado());
    }
    const chave = chaveMin(agora);
    if (chave !== ultimaChaveMin) {
      ultimaChaveMin = chave;
      const r = rotaAtual();
      const ativo = document.activeElement;
      const digitando = ativo && /^(INPUT|SELECT|TEXTAREA)$/.test(ativo.tagName);
      if (E.usuarioAtual() && ROTAS[r].vivo && !digitando && !document.querySelector('dialog[open]')) App.render({ silencioso: true });
    }
  }

  function simularHorario(h, m, aviso) {
    const d = new Date();
    let guarda = 0;
    while (!E.diaLetivo(d.getDay()) && guarda++ < 8) d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    E.Relogio.definir(d);
    Modal.fechar();
    App.render();
    toast(aviso || `Relógio simulado: ${E.DIAS[d.getDay()].toLowerCase()}, ${U.dois(h)}:${U.dois(m)}.`);
  }

  /* ---------- ações do app ---------- */
  App.acoes.menu = () => { const s = $('.shell'); if (s) s.classList.toggle('menu-aberto'); };
  App.acoes.tema = () => aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
  App.acoes.sair = () => { E.sair(); history.replaceState(null, '', location.pathname); App.render(); };
  App.acoes['login-demo'] = (el) => {
    const f = $('form[data-form="login"]');
    f.elements.email.value = el.dataset.email;
    f.elements.senha.value = el.dataset.senha;
    App.forms.login(f);
  };
  App.acoes['simular-aula'] = () => simularHorario(9, 40, 'Relógio simulado para uma manhã de aulas. Use o relógio no topo para voltar ao horário real.');
  App.acoes['preset-relogio'] = (el) => simularHorario(Number(el.dataset.h), Number(el.dataset.m));
  App.acoes['relogio-real'] = () => { E.Relogio.real(); Modal.fechar(); App.render(); toast('Usando o horário real.'); };
  App.acoes.relogio = () => {
    const agora = E.Relogio.agora();
    Modal.abrir('Relógio da escola', `
      <p class="muted">O painel e as listas mostram quem está em aula no horário do relógio. ${E.Relogio.simulado() ? 'Você está usando um horário simulado.' : 'Agora está usando o horário real do computador.'} Simule outro momento para testar.</p>
      <div class="presets">
        <button type="button" class="chip" data-acao="preset-relogio" data-h="7" data-m="45">Primeira aula, 07:45</button>
        <button type="button" class="chip" data-acao="preset-relogio" data-h="9" data-m="20">Intervalo, 09:20</button>
        <button type="button" class="chip" data-acao="preset-relogio" data-h="9" data-m="40">Meio da manhã, 09:40</button>
        <button type="button" class="chip" data-acao="preset-relogio" data-h="14" data-m="30">Tarde, 14:30</button>
        <button type="button" class="chip" data-acao="preset-relogio" data-h="20" data-m="0">Fora do horário, 20:00</button>
      </div>
      <form data-form="relogio" novalidate>
        <div class="campo"><label for="c-quando">Ou escolha data e hora</label><input id="c-quando" name="quando" type="datetime-local" value="${U.dataHoraLocalInput(agora)}"></div>
        <div class="dlg-rodape">
          <button type="button" class="btn" data-acao="relogio-real" ${E.Relogio.simulado() ? '' : 'disabled'}>Voltar ao horário real</button>
          <span class="grow"></span>
          <button type="button" class="btn" data-fechar>Cancelar</button>
          <button type="submit" class="btn btn-primario">Simular</button>
        </div>
      </form>`);
  };

  App.forms.relogio = (form) => {
    const v = new FormData(form).get('quando');
    const d = v ? new Date(v) : null;
    if (!d || isNaN(d)) return toast('Escolha uma data e hora válidas.', 'erro');
    E.Relogio.definir(d);
    Modal.fechar();
    App.render();
    toast('Relógio simulado.');
  };
  App.forms.login = (form) => {
    const fd = new FormData(form);
    const u = E.entrar(fd.get('email'), fd.get('senha'));
    if (!u) {
      $('#login-erro').textContent = 'E-mail ou senha incorretos. Confira os dados e tente de novo.';
      return;
    }
    location.hash = '#/painel';
    App.render();
    toast(`Bem-vindo(a), ${U.primeiroNome(u.nome)}.`);
  };

  /* ---------- eventos globais ---------- */
  document.addEventListener('click', (e) => {
    const fechar = e.target.closest('[data-fechar]');
    if (fechar) { const d = fechar.closest('dialog'); if (d) d.close(); return; }
    const el = e.target.closest('[data-acao]');
    if (!el) return;
    const f = App.acoes[el.dataset.acao] || V.acoes[el.dataset.acao];
    if (f) f(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-mudar]');
    if (!el) return;
    const f = V.mudar[el.dataset.mudar];
    if (f) f(el, e);
  });
  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-busca]')) return;
    const q = e.target.value.trim().toLowerCase();
    $$('tbody tr[data-busca]').forEach((tr) => { tr.hidden = !tr.dataset.busca.includes(q); });
  });
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const f = App.forms[form.dataset.form] || V.forms[form.dataset.form];
    if (f) f(form);
  });
  root.addEventListener('hashchange', () => {
    const s = $('.shell'); if (s) s.classList.remove('menu-aberto');
    App.render();
    root.scrollTo(0, 0);
  });
  root.addEventListener('storage', (e) => {
    if (e.key === 'escolaInteligente.v1') { E.recarregar(); App.render({ silencioso: true }); }
  });

  /* ---------- início ---------- */
  root.App = App;
  E.carregar();
  App.render();
  setInterval(tick, 1000);
})(window);
