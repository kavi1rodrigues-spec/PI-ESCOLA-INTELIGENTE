/* ==========================================================================
   Escola Inteligente - utilitários de interface
   ========================================================================== */
(function (root) {
  'use strict';

  const ICONES = {
    painel: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    sala: '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="15" cy="12.5" r=".8"/>',
    professor: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    turma: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    horarios: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    alerta: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    metricas: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
    config: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    lixo: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    lua: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    ok: '<path d="M20 6 9 17l-5-5"/>',
    raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    enviar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
    imprimir: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    olho: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  const ic = (nome, tam = 18) =>
    `<svg class="ic" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ''}</svg>`;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  /* ---------- formatação ---------- */
  const dois = (n) => String(n).padStart(2, '0');
  const hora = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  const horaSeg = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}`;
  const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const dataLonga = (d) => capitalizar(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const dataCurta = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  const dataHoraLocalInput = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;

  function duracao(ms) {
    if (ms == null) return '-';
    const s = Math.round(ms / 1000);
    if (s < 1) return 'menos de 1 s';
    if (s < 60) return `${s} s`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
    return `${Math.floor(h / 24)} d`;
  }
  const haTempo = (ts) => 'há ' + duracao(Date.now() - ts).replace('menos de 1 s', 'instantes');
  const minutosTexto = (min) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${m} min`;
  };
  const horasTexto = (h) => (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h';
  const nomeCurto = (n) => {
    const p = String(n || '').trim().split(/\s+/);
    return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] || '';
  };
  // cor estável por disciplina
  function matiz(txt) {
    let h = 0;
    const s = String(txt || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
  }
  const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  /* ---------- avisos ---------- */
  function toast(msg, tipo = 'ok') {
    const area = $('#toasts');
    if (!area) return;
    const el = document.createElement('div');
    el.className = 'toast ' + tipo;
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    el.innerHTML = ic(tipo === 'ok' ? 'ok' : 'alerta', 16) + `<span>${esc(msg)}</span>`;
    area.appendChild(el);
    setTimeout(() => el.classList.add('sai'), 3600);
    setTimeout(() => el.remove(), 4000);
  }

  /* ---------- modais ---------- */
  const Modal = {
    abrir(titulo, corpo, opts = {}) {
      const d = document.getElementById(opts.id || 'dlg');
      d.className = opts.classe || '';
      d.innerHTML = `
        <div class="dlg-caixa">
          <header class="dlg-topo">
            <h2>${esc(titulo)}</h2>
            <button type="button" class="btn-icone" data-fechar aria-label="Fechar">${ic('fechar', 18)}</button>
          </header>
          <div class="dlg-corpo">${corpo}</div>
        </div>`;
      d.onclick = (e) => { if (e.target === d) d.close(); };
      d.onclose = () => { if (opts.aoFechar) opts.aoFechar(); };
      if (!d.open) d.showModal();
      return d;
    },
    fechar(id) {
      const d = document.getElementById(id || 'dlg');
      if (d && d.open) d.close();
    },
    confirmar({ titulo, texto, botao = 'Confirmar', perigo = false }) {
      return new Promise((resolve) => {
        const d = document.getElementById('dlg2');
        let resposta = false;
        d.className = 'pequeno';
        d.innerHTML = `
          <div class="dlg-caixa">
            <header class="dlg-topo"><h2>${esc(titulo)}</h2></header>
            <div class="dlg-corpo">
              <p class="texto-confirma">${texto}</p>
              <div class="dlg-rodape">
                <button type="button" class="btn" data-cancelar>Cancelar</button>
                <button type="button" class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" data-confirmar>${esc(botao)}</button>
              </div>
            </div>
          </div>`;
        d.querySelector('[data-confirmar]').onclick = () => { resposta = true; d.close(); };
        d.querySelector('[data-cancelar]').onclick = () => d.close();
        d.onclick = (e) => { if (e.target === d) d.close(); };
        d.onclose = () => resolve(resposta);
        d.showModal();
        d.querySelector(perigo ? '[data-cancelar]' : '[data-confirmar]').focus();
      });
    }
  };

  /* ---------- peças de formulário ---------- */
  function campo({ nome, rotulo, tipo = 'text', valor = '', opcoes, obrigatorio = false, extra = '', dica = '', lista = '', classe = '' }) {
    const id = 'c-' + nome;
    let ctl;
    if (tipo === 'select') {
      ctl = `<select id="${id}" name="${nome}" ${obrigatorio ? 'required' : ''} ${extra}>${opcoes.map((o) =>
        `<option value="${esc(o.valor)}" ${String(o.valor) === String(valor) ? 'selected' : ''}>${esc(o.texto)}</option>`).join('')}</select>`;
    } else if (tipo === 'textarea') {
      ctl = `<textarea id="${id}" name="${nome}" rows="2" ${extra}>${esc(valor)}</textarea>`;
    } else {
      ctl = `<input id="${id}" name="${nome}" type="${tipo}" value="${esc(valor)}" ${obrigatorio ? 'required' : ''} ${lista ? `list="${lista}"` : ''} ${extra}>`;
    }
    return `<div class="campo ${classe}"><label for="${id}">${esc(rotulo)}</label>${ctl}${dica ? `<small>${esc(dica)}</small>` : ''}</div>`;
  }
  function checkDias(nome, dias, selecionados) {
    return `<div class="dias-check">${dias.map((d) => `
      <label class="check-pilula"><input type="checkbox" name="${nome}" value="${d}" ${selecionados.includes(d) ? 'checked' : ''}><span>${root.EI.DIAS_CURTO[d]}</span></label>`).join('')}</div>`;
  }

  root.UI = {
    ic, esc, $, $$, dois, hora, horaSeg, dataLonga, dataCurta, dataHoraLocalInput, duracao, haTempo, minutosTexto, horasTexto,
    nomeCurto, primeiroNome, matiz, toast, Modal, campo, checkDias
  };
})(window);
