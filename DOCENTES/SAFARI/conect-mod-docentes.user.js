// ==UserScript==
// @name         CONECT Mod Docentes - Captura desde Excel
// @namespace    https://purisima.tecnm.mx/conect_docentes/
// @version      1.2.0
// @description  Rediseño del portal CONECT de docentes del ITSPR (modo oscuro, horario visual, grupos) y captura de calificaciones desde Excel. Todo se procesa localmente.
// @author       Equipo CONECT Mod
// @match        https://purisima.tecnm.mx/conect_docentes/*
// @match        http://purisima.tecnm.mx/conect_docentes/*
// @run-at       document-idle
// @inject-into  page
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// ==/UserScript==

/* ==========================================================================
   CONECT Mod Docentes (no oficial) - Rediseño del portal
   Pantallas de acceso, barra lateral, encabezados, inicio, mis grupos,
   horario visual, detalle de materias, reportes, cambio de contraseña y
   tema claro/oscuro (misma preferencia que la versión de estudiantes).
   Si un módulo falla, la página queda como el original.
   ========================================================================== */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));
  function el(tag, attrs, hijos) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const h of [].concat(hijos || [])) {
      if (h == null || h === false) continue;
      n.appendChild(typeof h === 'string' || typeof h === 'number' ? document.createTextNode(String(h)) : h);
    }
    return n;
  }
  function texto(n) {
    return (n ? n.textContent : '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function normalizar(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\ufffd/g, '')
      .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  }

  /* ------------------------------------------------------------------------
     Pantallas de acceso
     - Usuario:     xyz_p1_Logi_Us13_Acce.html   (input username, botón login)
     - Contraseña:  27_p3_Pass_xyz_Logi_Acce.asp (input password, botón valida_pass)
     - Captura:     xyzLogPassCaptCalif123.asp   (input passwordCC, botón valida_passCC)
     Se reutilizan el formulario y los campos originales (mismos nombres y
     valores), solo se reacomodan. El mod no lee lo que se escribe.
     ------------------------------------------------------------------------ */
  const PASOS_ACCESO = {
    username: {
      paso: 1, titulo: 'Inicia sesión', texto: 'Escribe tu usuario (clave de docente).',
      etiqueta: 'Usuario', auto: 'username'
    },
    password: {
      paso: 2, titulo: 'Contraseña', texto: 'Escribe tu contraseña del portal.',
      etiqueta: 'Contraseña', auto: 'current-password', volver: 'xyz_p1_Logi_Us13_Acce.html'
    },
    passwordCC: {
      titulo: 'Contraseña de captura', texto: 'Para capturar calificaciones escribe tu contraseña de captura.',
      etiqueta: 'Contraseña de captura', auto: 'off'
    }
  };

  function detectarAcceso() {
    for (const nombre of Object.keys(PASOS_ACCESO)) {
      const campo = $('input[name="' + nombre + '"]');
      if (campo && campo.form) return { nombre, campo, form: campo.form, cfg: PASOS_ACCESO[nombre] };
    }
    return null;
  }

  function nombreDocente() {
    try {
      const p = new URLSearchParams(location.search);
      const n = (p.get('catnombreUser_Nombre') || p.get('cat_nombre') || '').trim();
      if (!n || n.includes('\ufffd')) return '';
      return n.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
    } catch (e) {
      return '';
    }
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function icono(trazos, tam) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', tam || 20);
    svg.setAttribute('height', tam || 20);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    trazos.forEach(d => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }
  const ICONO_BIRRETE = ['M22 10 12 5 2 10l10 5 10-5Z', 'M6 12v5c3 2 9 2 12 0v-5', 'M22 10v6'];
  const ICONO_OJO = ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'];
  const ICONO_SOL = ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'];
  const ICONO_LUNA = ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'];

  /* ------------------------------------------------------------------------
     Tema claro / oscuro: misma lógica y misma preferencia que la versión de
     estudiantes (localStorage "cmod.tema": 'auto' | 'light' | 'dark'). Ambos
     portales están en el mismo dominio, así que comparten la elección.
     ------------------------------------------------------------------------ */
  const PREF_TEMA = 'cmod.tema';
  function leerPref(clave, porDefecto) {
    try { const v = window.localStorage.getItem(clave); return v === null ? porDefecto : v; } catch (e) { return porDefecto; }
  }
  function guardarPref(clave, valor) {
    try { window.localStorage.setItem(clave, String(valor)); } catch (e) { /* almacenamiento no disponible */ }
  }
  function temaEfectivo() {
    const t = leerPref(PREF_TEMA, 'auto');
    if (t === 'light' || t === 'dark') return t;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function aplicarTema() {
    const t = temaEfectivo();
    document.documentElement.setAttribute('data-cdoc-tema', t);
    document.dispatchEvent(new CustomEvent('cdoc:tema'));
    // App de Android: color de la barra de estado
    try {
      if (window.CMODAndroid && typeof window.CMODAndroid.postMessage === 'function') {
        window.CMODAndroid.postMessage(JSON.stringify({ tipo: 'tema', valor: t }));
      }
    } catch (e) { /* nada */ }
  }
  function suavizarCambioTema() {
    const raiz = document.documentElement;
    raiz.classList.add('cdoc-cambiando-tema');
    clearTimeout(suavizarCambioTema.t);
    suavizarCambioTema.t = setTimeout(() => raiz.classList.remove('cdoc-cambiando-tema'), 400);
  }
  function alternarTema() {
    suavizarCambioTema();
    guardarPref(PREF_TEMA, temaEfectivo() === 'dark' ? 'light' : 'dark');
    aplicarTema(); // los demás marcos se enteran por el evento "storage"
  }
  function instalarTema() {
    aplicarTema();
    window.addEventListener('storage', e => {
      if (e.key === PREF_TEMA) { suavizarCambioTema(); aplicarTema(); }
    });
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (leerPref(PREF_TEMA, 'auto') === 'auto') aplicarTema();
      });
    } catch (e) { /* navegador antiguo */ }
    // Alt + T, igual que en la versión de estudiantes
    document.addEventListener('keydown', e => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyT') { e.preventDefault(); alternarTema(); }
    });
  }
  function botonTema(clase) {
    const b = el('button', { type: 'button', class: clase || 'cdoc-acc-tema' });
    const pintar = () => {
      const oscuro = temaEfectivo() === 'dark';
      b.replaceChildren(icono(oscuro ? ICONO_SOL : ICONO_LUNA, 18));
      const txt = oscuro ? 'Activar modo claro (Alt + T)' : 'Activar modo oscuro (Alt + T)';
      b.setAttribute('aria-label', txt);
      b.title = txt;
    };
    b.addEventListener('click', () => { alternarTema(); pintar(); });
    document.addEventListener('cdoc:tema', pintar);
    pintar();
    return b;
  }

  const ICONO_OJO_NO = ['M3 3l18 18', 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2', 'M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'];

  function moduloAcceso(acc) {
    const { form, campo, cfg } = acc;
    const enviar = Array.from(form.elements).find(e => e.type === 'submit');
    document.documentElement.classList.add('cdoc-acceso');
    inyectarEstilosAcceso();
    if (!$('meta[name="viewport"]')) {
      const meta = el('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' });
      (document.head || document.documentElement).appendChild(meta);
    }

    // Textos sueltos ("Usuario:", "Contraseña:") y saltos de línea del formulario original
    Array.from(form.querySelectorAll('br')).forEach(b => b.remove());
    const sueltos = document.createTreeWalker(form, NodeFilter.SHOW_TEXT);
    const vaciar = [];
    while (sueltos.nextNode()) if (sueltos.currentNode.textContent.trim()) vaciar.push(sueltos.currentNode);
    vaciar.forEach(n => { n.textContent = ''; });

    // Campo con etiqueta
    if (!campo.id) campo.id = 'cdoc-' + acc.nombre;
    campo.removeAttribute('style');
    campo.setAttribute('autocomplete', cfg.auto);
    campo.setAttribute('autocapitalize', 'off');
    campo.setAttribute('spellcheck', 'false');
    const caja = el('div', { class: 'cdoc-acc-campo' });
    campo.parentNode.insertBefore(el('label', { class: 'cdoc-acc-etq', for: campo.id, text: cfg.etiqueta }), campo);
    campo.parentNode.insertBefore(caja, campo);
    caja.appendChild(campo);

    if (campo.type === 'password') {
      caja.classList.add('cdoc-con-ojo');
      const ojo = el('button', { type: 'button', class: 'cdoc-acc-ojo', 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false', title: 'Mostrar contraseña' });
      ojo.appendChild(icono(ICONO_OJO));
      ojo.addEventListener('click', () => {
        const mostrar = campo.type === 'password';
        campo.type = mostrar ? 'text' : 'password';
        ojo.replaceChildren(icono(mostrar ? ICONO_OJO_NO : ICONO_OJO));
        ojo.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
        ojo.setAttribute('aria-pressed', String(mostrar));
        campo.focus();
      });
      caja.appendChild(ojo);

      const mayus = el('div', { class: 'cdoc-acc-mayus', role: 'status', hidden: true, text: 'Bloq Mayús está activado.' });
      caja.insertAdjacentElement('afterend', mayus);
      const revisar = e => { if (typeof e.getModifierState === 'function') mayus.hidden = !e.getModifierState('CapsLock'); };
      campo.addEventListener('keydown', revisar);
      campo.addEventListener('keyup', revisar);
      campo.addEventListener('blur', () => { mayus.hidden = true; });
    }

    if (enviar) {
      enviar.removeAttribute('style');
      enviar.classList.add('cdoc-acc-btn');
    }

    // Evitar doble envío sin deshabilitar el botón (su name/value se envía al servidor)
    let enviado = false;
    form.addEventListener('submit', e => {
      if (enviado) { e.preventDefault(); return; }
      enviado = true;
      if (enviar) enviar.classList.add('cdoc-enviando');
      setTimeout(() => { enviado = false; if (enviar) enviar.classList.remove('cdoc-enviando'); }, 15000);
    });

    // Tarjeta
    const nombre = cfg.paso === 2 || acc.nombre === 'passwordCC' ? nombreDocente() : '';
    const logo = el('div', { class: 'cdoc-acc-logo' });
    logo.appendChild(icono(ICONO_BIRRETE, 22));
    const pie = el('p', { class: 'cdoc-acc-pie', text: 'CONECT Mod (no oficial). Tus datos se envían únicamente al portal del instituto.' });
    const tarjeta = el('main', { class: 'cdoc-acc-tarjeta' }, [
      el('div', { class: 'cdoc-acc-marca' }, [
        logo,
        el('div', { class: 'cdoc-acc-nombre' }, [el('b', { text: 'CONECT Docentes' }), el('span', { text: 'ITS Purísima del Rincón' })]),
        botonTema()
      ]),
      cfg.paso ? el('div', { class: 'cdoc-acc-paso', text: 'Paso ' + cfg.paso + ' de 2' }) : null,
      el('h1', { class: 'cdoc-acc-titulo', text: cfg.titulo }),
      el('p', { class: 'cdoc-acc-texto', text: (nombre ? 'Hola, ' + nombre + '. ' : '') + cfg.texto })
    ]);
    tarjeta.appendChild(form);
    if (cfg.volver) tarjeta.appendChild(el('a', { class: 'cdoc-acc-volver', href: cfg.volver, text: '¿No eres tú? Cambiar de usuario' }));
    tarjeta.appendChild(pie);
    document.body.appendChild(el('div', { class: 'cdoc-acc-fondo' }, [tarjeta]));

    // Título de la pestaña y foco
    try { if (window.top === window || window.name === 'fraizq') window.top.document.title = 'CONECT Docentes · Acceso'; } catch (e) { /* nada */ }
    setTimeout(() => { try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); } }, 50);
  }

  const CSS_ACCESO = `
html.cdoc-acceso{--a-p:#1b396a;--a-p2:#132a4f;--a-ac:#8a2036;--a-f:#f3f5f9;--a-s:#fff;--a-b:#dfe5ee;--a-t:#1a2433;--a-ts:#4b5768;--a-in:#fff;--a-en:#1d4f9e;--a-foco:rgba(29,79,158,.3);--a-av:#8f5200;--a-sombra:0 12px 32px rgba(16,24,40,.10);color-scheme:light}
html.cdoc-acceso[data-cdoc-tema="dark"]{--a-p:#3a64aa;--a-p2:#4a75bd;--a-ac:#f0a3b3;--a-f:#0e141d;--a-s:#151d29;--a-b:#2a3546;--a-t:#e5e9f0;--a-ts:#a9b3c2;--a-in:#1a2331;--a-en:#9cbcf0;--a-foco:rgba(156,188,240,.35);--a-av:#f5c06a;--a-sombra:0 12px 32px rgba(0,0,0,.5);color-scheme:dark}
html.cdoc-acceso,html.cdoc-acceso body{margin:0!important;padding:0!important;min-height:100%;background:var(--a-f)!important}
html.cdoc-acceso body>:not(.cdoc-acc-fondo){display:none!important}
.cdoc-acc-fondo{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--a-t);text-align:left}
.cdoc-acc-fondo *{box-sizing:border-box}
.cdoc-acc-tarjeta{width:100%;max-width:350px;background:var(--a-s);border:1px solid var(--a-b);border-radius:16px;padding:28px 24px 18px;box-shadow:var(--a-sombra)}
.cdoc-acc-marca{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.cdoc-acc-logo{flex:none;width:42px;height:42px;border-radius:12px;background:var(--a-p);color:#fff;display:grid;place-items:center}
.cdoc-acc-marca b{display:block;font-size:16px;line-height:1.2}
.cdoc-acc-marca span{display:block;font-size:12.5px;color:var(--a-ts)}
.cdoc-acc-nombre{flex:1;min-width:0}
.cdoc-acc-tema{flex:none;width:38px;height:38px;border:1px solid var(--a-b);border-radius:10px;background:transparent;color:var(--a-ts);cursor:pointer;display:grid;place-items:center;padding:0}
.cdoc-acc-tema:hover{background:var(--a-f);color:var(--a-t)}
.cdoc-acc-tema:focus-visible{outline:3px solid var(--a-foco);outline-offset:2px}
html.cdoc-cambiando-tema *,html.cdoc-cambiando-tema *::before{transition:background-color .3s ease,color .3s ease,border-color .3s ease!important}
.cdoc-acc-paso{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--a-ac)}
.cdoc-acc-titulo{font-size:22px;line-height:1.25;margin:2px 0 6px;font-weight:700;color:var(--a-t)}
.cdoc-acc-texto{margin:0 0 20px;color:var(--a-ts);font-size:14px}
.cdoc-acc-tarjeta form{margin:0}
.cdoc-acc-tarjeta center{display:block;text-align:left}
.cdoc-acc-tarjeta center>h3,.cdoc-acc-tarjeta center>h4,.cdoc-acc-tarjeta img{display:none}
.cdoc-acc-etq{display:block;font-weight:600;font-size:13px;margin-bottom:6px;color:var(--a-t)}
.cdoc-acc-campo{position:relative;margin-bottom:18px}
.cdoc-acc-campo input{display:block;width:100%!important;font:inherit;font-size:16px;padding:11px 12px;border:1px solid var(--a-b);border-radius:10px;background:var(--a-in);color:var(--a-t);outline:none;transition:border-color .15s,box-shadow .15s}
.cdoc-acc-campo input:focus{border-color:var(--a-p);box-shadow:0 0 0 4px var(--a-foco)}
.cdoc-acc-campo.cdoc-con-ojo input{padding-right:48px}
.cdoc-acc-ojo{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:38px;height:38px;border:0;border-radius:8px;background:transparent;color:var(--a-ts);cursor:pointer;display:grid;place-items:center;padding:0}
.cdoc-acc-ojo:hover{background:var(--a-f);color:var(--a-t)}
.cdoc-acc-ojo:focus-visible,.cdoc-acc-volver:focus-visible{outline:3px solid var(--a-foco);outline-offset:2px}
.cdoc-acc-mayus{font-size:12.5px;color:var(--a-av);margin:-10px 0 14px}
.cdoc-acc-mayus[hidden]{display:none}
.cdoc-acc-btn{display:block;width:100%;font:inherit;font-weight:700;font-size:15px;padding:12px;border:0;border-radius:10px;background:var(--a-p);color:#fff;cursor:pointer;-webkit-appearance:none;appearance:none;transition:background .15s}
.cdoc-acc-btn:hover{background:var(--a-p2)}
.cdoc-acc-btn:focus-visible{outline:3px solid var(--a-foco);outline-offset:2px}
.cdoc-acc-btn.cdoc-enviando{opacity:.6;cursor:progress;pointer-events:none}
.cdoc-acc-volver{display:inline-block;margin-top:14px;font-size:13px;color:var(--a-en);text-decoration:none}
.cdoc-acc-volver:hover{text-decoration:underline}
.cdoc-acc-btn-enlace{text-align:center;text-decoration:none;margin-top:4px}
.cdoc-acc-error{color:var(--a-ac)}
.cdoc-acc-pie{margin:22px 0 0;padding-top:14px;border-top:1px solid var(--a-b);font-size:11.5px;color:var(--a-ts)}
`;

  function inyectarEstilosAcceso() {
    if ($('#cdoc-estilos-acceso')) return;
    const st = el('style', { id: 'cdoc-estilos-acceso' });
    st.textContent = CSS_ACCESO;
    (document.head || document.documentElement).appendChild(st);
  }


  /* ------------------------------------------------------------------------
     Marcos (frameset principal: fraizq | fracontenido)
     - 'acceso': el marco izquierdo se ensancha (pantalla completa en celular)
     - 'menu'  : barra lateral de 248 px; en celular se oculta y se abre con
                 el botón de menú del encabezado
     ------------------------------------------------------------------------ */
  const ANCHO_CELULAR = 760;
  function marcoPrincipal() {
    try {
      const top = window.top;
      const fs = top.document.querySelector('frameset');
      return fs ? { top, fs } : null;
    } catch (e) {
      return null;
    }
  }
  function esCelular() {
    try { return Math.min(window.top.innerWidth, window.top.screen.width || Infinity) < ANCHO_CELULAR; } catch (e) { return window.innerWidth < ANCHO_CELULAR; }
  }
  function asegurarViewport(doc) {
    if (doc.querySelector('meta[name="viewport"]')) return;
    const meta = doc.createElement('meta');
    meta.id = 'cdoc-viewport';
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1';
    (doc.head || doc.documentElement).appendChild(meta);
  }
  function aplicarMarcos() {
    const m = marcoPrincipal();
    if (!m) return;
    const modo = m.fs.getAttribute('data-cdoc-modo');
    const abierto = m.fs.getAttribute('data-cdoc-menu') === 'abierto';
    let cols;
    if (modo === 'acceso') cols = esCelular() ? '*,0' : '420,*';
    else if (modo === 'menu') cols = esCelular() ? (abierto ? '*,0' : '0,*') : '248,*';
    if (cols && m.fs.getAttribute('cols') !== cols) m.fs.setAttribute('cols', cols);
  }
  function marcos(modo) {
    if (window.name !== 'fraizq' || window.parent !== window.top) return;
    const m = marcoPrincipal();
    if (!m) return;
    if (!m.fs.hasAttribute('data-cdoc-cols')) m.fs.setAttribute('data-cdoc-cols', m.fs.getAttribute('cols') || '165px,*');
    m.fs.setAttribute('data-cdoc-modo', modo);
    m.fs.setAttribute('data-cdoc-menu', 'cerrado');
    asegurarViewport(m.top.document);
    aplicarMarcos();
    if (!m.top.__cdocResize) {
      m.top.__cdocResize = true;
      m.top.addEventListener('resize', aplicarMarcos);
    }
  }
  function alternarMenu(abrir) {
    const m = marcoPrincipal();
    if (!m) return;
    const actual = m.fs.getAttribute('data-cdoc-menu') === 'abierto';
    m.fs.setAttribute('data-cdoc-menu', (abrir == null ? !actual : abrir) ? 'abierto' : 'cerrado');
    aplicarMarcos();
  }

  /* ------------------------------------------------------------------------
     Datos de la sesión (se reutiliza tal cual el query string del portal)
     ------------------------------------------------------------------------ */
  const RE_SESION = /session_id=[^"'&\s]+&cat_id=[^"'&\s]*&cat_nombre=[^"'&]*&cat_clave=[^"'&\s]*/;
  function consultaSesion(doc) {
    const d = doc || document;
    const fuentes = [d.location ? d.location.search : ''];
    d.querySelectorAll('[href],[onclick],[action],[src]').forEach(n => {
      ['href', 'onclick', 'action', 'src'].forEach(a => { const v = n.getAttribute(a); if (v) fuentes.push(v); });
    });
    d.querySelectorAll('script').forEach(s => fuentes.push(s.textContent || ''));
    for (const f of fuentes) {
      const m = RE_SESION.exec(f);
      if (m) return m[0];
    }
    return '';
  }
  function nombreSesion(q) {
    const m = /cat_nombre=([^&]*)/.exec(q || '');
    if (!m) return '';
    let n = m[1];
    try { n = decodeURIComponent(n); } catch (e) { /* tal cual */ }
    if (n.includes('\ufffd')) return '';
    return n.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).trim();
  }
  const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'para', 'por', 'en', 'a', 'con']);
  function tituloBonito(t) {
    return String(t || '').toLowerCase().split(/\s+/).filter(Boolean)
      .map((p, i) => (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(p) ? p.toUpperCase() : (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))).join(' ');
  }
  function urlPagina(q, pageId) {
    return 'cat_contenido.asp?' + q + '&tipo=cat&page_id=' + pageId;
  }

  /* ------------------------------------------------------------------------
     Iconos (trazos estilo "lucide", MIT)
     ------------------------------------------------------------------------ */
  const IC = {
    inicio: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9.5 21v-6h5v6'],
    grupos: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    materias: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z', 'M9 7h7', 'M9 11h5'],
    horario: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 18h.01', 'M12 18h.01'],
    avisos: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
    clave: ['M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4Z', 'M16.5 7.5h.01'],
    documentos: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M12 18v-6', 'm9 15 3 3 3-3'],
    sol: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'],
    salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
    menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
    cerrar: ['M18 6 6 18', 'm6 6 12 12'],
    captura: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
    abrir: ['M5 12h14', 'm12 5 7 7-7 7'],
    alerta: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
    ok: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4'],
    imprimir: ['M6 9V2h12v7', 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 14h12v8H6z']
  };

  /* ------------------------------------------------------------------------
     Barra lateral (mnucatedraticos.asp en #fraizq)
     ------------------------------------------------------------------------ */
  function moduloMenu() {
    const q = consultaSesion();
    if (!q) throw new Error('No se encontró la sesión en el menú.');
    const nombre = nombreSesion(q);
    const ir = (url, destino) => {
      try {
        if (destino === '_top') window.top.location.href = url;
        else window.top.frames.fracontenido.location.href = url;
      } catch (e) {
        window.open(url, destino || 'fracontenido');
      }
      if (esCelular()) alternarMenu(false);
    };

    const secciones = [
      { titulo: 'Semestre actual', items: [
        { id: 'inicio', txt: 'Inicio', ic: IC.inicio, url: 'cat_home.asp?' + q + '&tipo=cat' },
        { id: 'misgpos', txt: 'Mis grupos', ic: IC.grupos, url: urlPagina(q, 'misgpos') },
        { id: 'det_materias', txt: 'Detalle de materias', ic: IC.materias, url: urlPagina(q, 'det_materias') },
        { id: 'horario', txt: 'Mi horario', ic: IC.horario, url: urlPagina(q, 'horario') },
        { id: 'avisos', txt: 'Avisos', ic: IC.avisos, url: urlPagina(q, 'avisos') }
      ] },
      { titulo: 'Generales', items: [
        { id: 'cambiapwd', txt: 'Cambiar contraseña', ic: IC.clave, url: urlPagina(q, 'cambiapwd') },
        { id: 'doctos', txt: 'Documentos', ic: IC.documentos, url: urlPagina(q, 'doctos') }
      ] },
      { titulo: 'Curso de verano', items: [
        { id: 'misgposvera', txt: 'Mis grupos de verano', ic: IC.grupos, url: urlPagina(q, 'misgposvera') },
        { id: 'mihorariovera', txt: 'Horario de verano', ic: IC.horario, url: urlPagina(q, 'mihorariovera') },
        { id: 'det_materiasvera', txt: 'Materias de verano', ic: IC.materias, url: urlPagina(q, 'det_materiasvera') }
      ] }
    ];

    const nav = el('nav', { class: 'cdoc-nav', 'aria-label': 'Menú principal' });
    const marcar = id => $$('.cdoc-nav-item', nav).forEach(a => a.classList.toggle('activo', a.dataset.id === id));
    secciones.forEach(sec => {
      nav.appendChild(el('div', { class: 'cdoc-nav-sec', text: sec.titulo }));
      sec.items.forEach(it => {
        const a = el('a', { class: 'cdoc-nav-item', href: it.url, 'data-id': it.id, target: 'fracontenido' });
        a.append(icono(it.ic, 18), el('span', { text: it.txt }));
        a.addEventListener('click', e => { e.preventDefault(); marcar(it.id); ir(it.url); });
        nav.appendChild(a);
      });
    });

    const salir = el('button', { type: 'button', class: 'cdoc-nav-item cdoc-nav-salir' });
    salir.append(icono(IC.salir, 18), el('span', { text: 'Cerrar sesión' }));
    salir.addEventListener('click', () => {
      if (window.confirm('¿Realmente deseas salir del portal?')) ir('cerrar_sesion.asp?' + q + '&tipo=cat', '_top');
    });

    const cerrar = el('button', { type: 'button', class: 'cdoc-side-cerrar', 'aria-label': 'Cerrar menú' });
    cerrar.appendChild(icono(IC.cerrar, 20));
    cerrar.addEventListener('click', () => alternarMenu(false));

    const logo = el('div', { class: 'cdoc-side-logo' });
    logo.appendChild(icono(ICONO_BIRRETE, 20));
    const iniciales = (nombre || 'D').split(' ').map(p => p[0]).slice(0, 2).join('');

    document.body.appendChild(el('aside', { class: 'cdoc-side' }, [
      el('div', { class: 'cdoc-side-marca' }, [
        logo,
        el('div', { class: 'cdoc-side-nombre' }, [el('b', { text: 'CONECT Docentes' }), el('span', { text: 'ITS Purísima del Rincón' })]),
        cerrar
      ]),
      el('div', { class: 'cdoc-side-perfil' }, [
        el('div', { class: 'cdoc-avatar', text: iniciales }),
        el('div', {}, [el('b', { text: nombre || 'Docente' }), el('span', { text: 'Sesión iniciada' })])
      ]),
      nav,
      el('div', { class: 'cdoc-side-pie' }, [botonTema('cdoc-btn-icono', true), salir])
    ]));
    marcar('inicio');
  }

  /* ------------------------------------------------------------------------
     Encabezado de cada sección (cat_contenido.asp)
     ------------------------------------------------------------------------ */
  function moduloContenido() {
    const titulo = texto($('label b') || $('b')) || 'CONECT Docentes';
    const iframe = $('iframe');
    if (!iframe) return moduloGenerico();
    const menu = el('button', { type: 'button', class: 'cdoc-btn-icono cdoc-solo-celular', 'aria-label': 'Abrir menú' });
    menu.appendChild(icono(IC.menu, 20));
    menu.addEventListener('click', () => alternarMenu(true));
    const cab = el('header', { class: 'cdoc-cabecera' }, [
      menu,
      el('h1', { class: 'cdoc-cabecera-titulo', text: titulo }),
      botonTema('cdoc-btn-icono')
    ]);
    iframe.removeAttribute('width');
    iframe.removeAttribute('height');
    iframe.className = 'cdoc-marco';
    document.body.classList.add('cdoc-con-marco');
    document.body.append(cab, iframe);
    try { window.top.document.title = titulo + ' \u00b7 CONECT Docentes'; } catch (e) { /* nada */ }
  }

  /** Barra superior para páginas que se cargan sin cat_contenido (p. ej. Inicio). */
  function cabeceraSimple(titulo) {
    const menu = el('button', { type: 'button', class: 'cdoc-btn-icono cdoc-solo-celular', 'aria-label': 'Abrir menú' });
    menu.appendChild(icono(IC.menu, 20));
    menu.addEventListener('click', () => alternarMenu(true));
    try { window.top.document.title = titulo + ' · CONECT Docentes'; } catch (e) { /* nada */ }
    return el('header', { class: 'cdoc-cabecera cdoc-cabecera-simple' }, [menu, el('h1', { class: 'cdoc-cabecera-titulo', text: titulo }), botonTema('cdoc-btn-icono')]);
  }

  /* ------------------------------------------------------------------------
     Inicio (cat_home.asp)
     ------------------------------------------------------------------------ */
  function moduloInicio() {
    const datos = {};
    $$('td').forEach(td => {
      const m = /^\s*([^:]+):\s*$/.exec((td.childNodes[0] && td.childNodes[0].textContent) || '');
      const lbl = $('label', td);
      if (m && lbl) datos[normalizar(m[1])] = texto(lbl);
    });
    const nombre = datos.NOMBRE || nombreSesion(consultaSesion()) || 'Docente';
    const q = consultaSesion();
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : (hora < 19 ? 'Buenas tardes' : 'Buenas noches');
    const corto = nombre.split(' ')[0];
    const nombreBonito = tituloBonito;
    const iniciales = nombre.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('');

    const datosLista = [
      ['Clave', datos.CLAVE], ['Estatus', datos.ESTATUS], ['Fecha de ingreso', datos['FECHA DE INGRESO']],
      ['Academia', datos['ASOCIADO EN EL'] ? nombreBonito(datos['ASOCIADO EN EL']) : '']
    ].filter(d => d[1]);

    const accesos = [
      { txt: 'Mis grupos', desc: 'Capturar calificaciones y listas', ic: IC.grupos, id: 'misgpos' },
      { txt: 'Detalle de materias', desc: 'Indicadores y fechas de captura', ic: IC.materias, id: 'det_materias' },
      { txt: 'Mi horario', desc: 'Horario semanal visual', ic: IC.horario, id: 'horario' },
      { txt: 'Cambiar contraseña', desc: 'Seguridad de tu cuenta', ic: IC.clave, id: 'cambiapwd' }
    ];
    const tarjetas = accesos.map(a => {
      const t = el('a', { class: 'cdoc-acceso-rapido', href: q ? urlPagina(q, a.id) : '#' });
      const ic = el('span', { class: 'cdoc-acceso-ic' });
      ic.appendChild(icono(a.ic, 22));
      t.append(ic, el('b', { text: a.txt }), el('span', { text: a.desc }));
      return t;
    });

    document.body.appendChild(cabeceraSimple('Inicio'));
    document.body.appendChild(el('main', { class: 'cdoc-pagina' }, [
      el('section', { class: 'cdoc-card cdoc-bienvenida' }, [
        el('div', { class: 'cdoc-avatar cdoc-avatar-grande', text: iniciales }),
        el('div', {}, [
          el('div', { class: 'cdoc-eyebrow', text: saludo }),
          el('h1', { class: 'cdoc-h1', text: nombreBonito(corto) }),
          el('p', { class: 'cdoc-suave', text: nombreBonito(nombre) })
        ])
      ]),
      el('section', { class: 'cdoc-card' }, [
        el('h2', { class: 'cdoc-h2', text: 'Mis datos' }),
        el('dl', { class: 'cdoc-datos' }, datosLista.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]))
      ]),
      el('h2', { class: 'cdoc-h2 cdoc-sep', text: 'Accesos rápidos' }),
      el('div', { class: 'cdoc-rejilla-accesos' }, tarjetas)
    ]));
  }

  /* ------------------------------------------------------------------------
     Mis grupos (cat_cap_misgrupos.asp)
     ------------------------------------------------------------------------ */
  function agruparOpciones(sel) {
    const opciones = Array.from(sel.options);
    let grupo = null;
    const nuevos = [];
    opciones.forEach(o => {
      const t = o.textContent.trim();
      if (o.value === 'nada' || !t) { o.remove(); return; }
      const sep = /^-{3,}\s*(.*?)\s*-{3,}$/.exec(t);
      if (sep) {
        grupo = el('optgroup', { label: sep[1].replace(/\s+/g, ' ').trim() || 'Opciones' });
        nuevos.push(grupo);
        o.remove();
        return;
      }
      if (grupo) grupo.appendChild(o); else nuevos.push(o);
    });
    nuevos.forEach(n => sel.appendChild(n));
    const primera = sel.querySelector('option');
    if (primera) sel.value = primera.value;
  }

  function moduloGrupos() {
    const form = $('form');
    const radios = $$('input[type=radio][name=materia]');
    if (!form || !radios.length) return moduloGenerico();
    const enviar = $$('input[type=submit]', form)[0];
    const tablaOriginal = radios[0].closest('table');

    const enviarGrupo = (radio, sel) => {
      radios.forEach(r => { r.checked = r === radio; });
      $$('select', form).forEach(s => { s.disabled = s !== sel; });
      if (form.requestSubmit) form.requestSubmit(enviar || undefined); else if (enviar) enviar.click(); else form.submit();
    };

    const tarjetas = radios.map((radio, i) => {
      const tr = radio.closest('tr');
      const clave = texto(tr.cells[1]);
      const materia = texto(tr.cells[2]);
      const sel = $('select', tr);
      if (!sel) return null;
      agruparOpciones(sel);
      sel.disabled = false;
      sel.classList.add('cdoc-select');
      const opcCaptura = Array.from(sel.options).find(o => /^EVALUACI/i.test(normalizar(o.textContent)));

      const botones = el('div', { class: 'cdoc-grupo-acciones' });
      if (opcCaptura) {
        const cap = el('button', { type: 'button', class: 'cdoc-btn' });
        cap.append(icono(IC.captura, 16), el('span', { text: 'Capturar' }));
        cap.title = opcCaptura.textContent.trim();
        cap.addEventListener('click', () => { sel.value = opcCaptura.value; enviarGrupo(radio, sel); });
        botones.appendChild(cap);
      }
      const abrir = el('button', { type: 'button', class: 'cdoc-btn cdoc-btn-sec' });
      abrir.append(el('span', { text: 'Abrir' }), icono(IC.abrir, 16));
      abrir.addEventListener('click', () => enviarGrupo(radio, sel));
      botones.appendChild(abrir);

      return el('article', { class: 'cdoc-card cdoc-grupo cdoc-tono-' + ((i % 8) + 1) }, [
        el('div', { class: 'cdoc-grupo-cab' }, [
          el('span', { class: 'cdoc-grupo-clave', text: clave }),
          opcCaptura ? el('span', { class: 'cdoc-chip cdoc-chip-ok', text: 'Captura abierta' }) : null
        ]),
        el('h3', { class: 'cdoc-grupo-materia', text: tituloBonito(materia) }),
        el('label', { class: 'cdoc-etq-mini', text: 'Acción' }),
        sel,
        botones
      ]);
    }).filter(Boolean);

    const contenedor = el('div', { class: 'cdoc-pagina' }, [
      el('p', { class: 'cdoc-suave', text: 'Elige una acción para cada grupo. "Capturar" abre la captura del parcial vigente.' }),
      el('div', { class: 'cdoc-rejilla-grupos' }, tarjetas)
    ]);
    form.insertBefore(contenedor, form.firstChild);
    if (tablaOriginal) tablaOriginal.classList.add('cdoc-oculto');
    if (enviar) enviar.classList.add('cdoc-oculto');
    $$('body > br').forEach(b => b.remove());
    // Texto suelto "Sus materias asignadas..."
    Array.from(document.body.childNodes).forEach(n => { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ''; });
  }

  /* ------------------------------------------------------------------------
     Horario (cat_horario.asp): el portal lo entrega como texto <pre> con
     columnas fijas de 16 caracteres a partir del 24 (Lu, Ma, Mi, Ju, Vi, Sa).
     ------------------------------------------------------------------------ */
  const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  function leerHorarioPre(pre) {
    const lineas = pre.textContent.replace(/\r/g, '').split('\n');
    const iEnc = lineas.findIndex(l => /Lunes/.test(l) && /Martes/.test(l));
    if (iEnc < 0) return null;
    const enc = lineas[iEnc];
    const base = enc.indexOf('Lunes') - 2;
    const paso = (enc.indexOf('Martes') - enc.indexOf('Lunes')) || 16;
    const posCred = enc.search(/Crdt/);
    const clases = [];
    lineas.slice(iEnc + 1).forEach(l => {
      const re = /(\d\d):(\d\d)-(\d\d):(\d\d)-(\S+)/g;
      let m;
      // "2V1-MATE. DISCRETA 5    07:00-..." -> materia y créditos (lo que va antes de la primera hora)
      const primera = l.search(/\d\d:\d\d-\d\d:\d\d-/);
      const cabeza = (primera >= 0 ? l.slice(0, primera) : l).trim();
      const mc = /^(.*\S)\s+(\d{1,2})$/.exec(cabeza);
      const materia = mc ? mc[1] : cabeza;
      const cred = mc ? mc[2] : '';
      void posCred;
      while ((m = re.exec(l))) {
        const dia = Math.max(0, Math.min(5, Math.round((m.index - base) / paso)));
        clases.push({ materia, cred, dia, ini: +m[1] + m[2] / 60, fin: +m[3] + m[4] / 60, hIni: m[1] + ':' + m[2], hFin: m[3] + ':' + m[4], salon: m[5] });
      }
    });
    return clases;
  }

  function moduloHorario() {
    const pre = $('pre');
    const clases = pre ? leerHorarioPre(pre) : null;
    if (!clases || !clases.length) return moduloGenerico();

    // Mismo horario y salón en dos renglones (p. ej. grupos compartidos): un solo bloque
    const bloques = [];
    clases.forEach(c => {
      const igual = bloques.find(b => b.dia === c.dia && b.ini === c.ini && b.fin === c.fin && b.salon === c.salon);
      if (igual) { if (!igual.materias.includes(c.materia)) igual.materias.push(c.materia); } else bloques.push(Object.assign({ materias: [c.materia] }, c));
    });
    const claves = Array.from(new Set(clases.map(c => c.materia.split('-')[0])));
    const tono = m => (claves.indexOf(m.split('-')[0]) % 8) + 1;
    const hMin = Math.floor(Math.min(...bloques.map(b => b.ini)));
    const hMax = Math.ceil(Math.max(...bloques.map(b => b.fin)));
    const nDias = bloques.some(b => b.dia === 5) ? 6 : 5;

    const rejilla = el('div', { class: 'cdoc-horario', style: '--dias:' + nDias + ';--horas:' + (hMax - hMin) });
    rejilla.appendChild(el('div', { class: 'cdoc-h-esquina' }));
    for (let d = 0; d < nDias; d++) rejilla.appendChild(el('div', { class: 'cdoc-h-dia', style: 'grid-column:' + (d + 2), text: DIAS[d] }));
    for (let h = hMin; h < hMax; h++) {
      const fila = (h - hMin) + 2;
      rejilla.appendChild(el('div', { class: 'cdoc-h-hora', style: 'grid-row:' + fila, text: String(h).padStart(2, '0') + ':00' }));
      for (let d = 0; d < nDias; d++) rejilla.appendChild(el('div', { class: 'cdoc-h-celda', style: 'grid-row:' + fila + ';grid-column:' + (d + 2) }));
    }
    bloques.forEach(b => {
      const r1 = Math.round((b.ini - hMin) * 1) + 2;
      const r2 = Math.round((b.fin - hMin) * 1) + 2;
      rejilla.appendChild(el('div', {
        class: 'cdoc-h-clase cdoc-tono-' + tono(b.materia) + (b.fin - b.ini <= 1 ? ' cdoc-h-corta' : ''),
        style: 'grid-column:' + (b.dia + 2) + ';grid-row:' + r1 + '/' + r2,
        title: b.materias.join(' / ') + '\n' + DIAS[b.dia] + ' ' + b.hIni + '-' + b.hFin + ' \u00b7 ' + b.salon
      }, [
        el('b', { text: b.materias.join(' / ') }),
        el('span', { text: b.hIni + '\u2013' + b.hFin }),
        el('span', { class: 'cdoc-h-salon', text: b.salon })
      ]));
    });

    // Lista por materia
    const porMateria = new Map();
    clases.forEach(c => {
      if (!porMateria.has(c.materia)) porMateria.set(c.materia, { cred: c.cred, horas: 0, sesiones: [] });
      const x = porMateria.get(c.materia);
      x.horas += c.fin - c.ini;
      x.sesiones.push(DIAS[c.dia].slice(0, 2) + ' ' + c.hIni + '\u2013' + c.hFin + ' (' + c.salon + ')');
    });
    const totalHoras = Array.from(porMateria.values()).reduce((a, x) => a + x.horas, 0);
    const lista = el('div', { class: 'cdoc-lista-materias' }, Array.from(porMateria.entries()).map(([m, x]) =>
      el('div', { class: 'cdoc-materia-fila cdoc-tono-' + tono(m) }, [
        el('span', { class: 'cdoc-punto' }),
        el('div', {}, [el('b', { text: m }), el('span', { class: 'cdoc-suave', text: x.sesiones.join(' \u00b7 ') })]),
        el('span', { class: 'cdoc-chip', text: x.horas + ' h' + (x.cred ? ' \u00b7 ' + x.cred + ' cr' : '') })
      ])));

    // Texto suelto del portal (instrucciones de temarios que solo funcionaban en Internet Explorer)
    Array.from(document.body.childNodes).forEach(n => { if (n.nodeType === 3) n.textContent = ''; });
    pre.classList.add('cdoc-oculto');
    const verOriginal = el('details', { class: 'cdoc-original' }, [el('summary', { text: 'Ver formato original del portal' }), pre]);
    pre.classList.remove('cdoc-oculto');
    document.body.appendChild(el('main', { class: 'cdoc-pagina' }, [
      el('div', { class: 'cdoc-chips-fila' }, [
        el('span', { class: 'cdoc-chip', text: porMateria.size + ' materias' }),
        el('span', { class: 'cdoc-chip', text: totalHoras + ' horas/semana' })
      ]),
      el('section', { class: 'cdoc-card cdoc-card-scroll' }, [rejilla]),
      el('h2', { class: 'cdoc-h2 cdoc-sep', text: 'Por materia' }),
      el('section', { class: 'cdoc-card' }, [lista]),
      verOriginal
    ]));
  }

  /* ------------------------------------------------------------------------
     Tablas de datos (detalle de materias, reportes, captura, genérico)
     ------------------------------------------------------------------------ */
  function estilizarTablas(raiz) {
    $$('table', raiz).forEach(t => {
      if (t.closest('.cdoc-panel')) return;
      const datos = t.getAttribute('border') === '1' || t.rows.length > 3 && $$('th', t).length > 0;
      if (!datos) { t.classList.add('cdoc-t-info'); return; }
      t.classList.add('cdoc-t');
      t.removeAttribute('width');
      if (!t.parentElement.classList.contains('cdoc-t-envoltura')) {
        const env = el('div', { class: 'cdoc-t-envoltura' });
        t.parentNode.insertBefore(env, t);
        env.appendChild(t);
      }
    });
  }
  function colorearCalificaciones(raiz, calMin) {
    $$('table.cdoc-t td', raiz).forEach(td => {
      if ($('input', td)) return;
      const v = texto(td);
      if (/^\d{1,3}$/.test(v) && td.cellIndex > 2) {
        const n = +v;
        if (n <= 100) td.classList.add(n < calMin ? 'cdoc-cal-rep' : 'cdoc-cal-apr');
      } else if (/^(NC|NP|RN|PEND\.?|PENDIENTE)$/i.test(v)) {
        td.classList.add('cdoc-cal-nc');
      }
    });
  }

  function moduloDetalle() {
    estilizarTablas(document);
    // Cada materia es una tabla: se convierte en tarjeta con título
    $$('table.cdoc-t').forEach(t => {
      const celda = t.rows[0] && t.rows[0].cells[1];
      if (!celda || !/Grupo\/Materia/i.test(texto(t.rows[0].cells[0]))) return;
      const titulo = texto(celda);
      t.rows[0].classList.add('cdoc-oculto');
      // Días/hora/salón como fichas
      Array.from(t.rows).forEach(tr => {
        if (/D.a\/Hora\/Sal.n/i.test(texto(tr.cells[0]))) {
          const c = tr.cells[1];
          const txt = texto(c).replace(/\s+/g, ' ');
          const partes = txt.match(/\b(Lu|Ma|Mi|Ju|Vi|Sa)\b\s+\d\d:\d\d-\d\d:\d\d-\S+/g);
          if (partes) { c.textContent = ''; partes.forEach(p => c.appendChild(el('span', { class: 'cdoc-chip', text: p }))); }
        }
      });
      const env = t.closest('.cdoc-t-envoltura');
      const card = el('section', { class: 'cdoc-card cdoc-materia' }, [el('h2', { class: 'cdoc-h2', text: titulo })]);
      env.parentNode.insertBefore(card, env);
      card.appendChild(env);
    });
    const h5 = $('h5');
    if (h5) h5.className = 'cdoc-suave';
    document.body.classList.add('cdoc-pagina-cuerpo');
  }

  function moduloReporte() {
    estilizarTablas(document);
    colorearCalificaciones(document, 70);
    // Resumen: alumnos, aprobados y reprobados de la columna de calificación
    const t = $$('table.cdoc-t').sort((a, b) => b.rows.length - a.rows.length)[0];
    if (t) {
      const enc = Array.from(t.rows[0].cells).map(c => normalizar(texto(c)));
      let col = enc.findIndex(h => /^CALIFICACION|^CAL FINAL/.test(h));
      if (col >= 0) {
        let apr = 0, rep = 0, pend = 0, suma = 0, n = 0;
        Array.from(t.rows).slice(1).forEach(tr => {
          // Si hay 2 filas de encabezado, la columna puede desplazarse: se toma la celda equivalente desde el final
          const c = tr.cells.length === t.rows[0].cells.length ? tr.cells[col] : tr.cells[tr.cells.length - (t.rows[0].cells.length - col)];
          const v = texto(c);
          if (/^\d{1,3}$/.test(v)) { n++; suma += +v; if (+v >= 70) apr++; else rep++; } else if (v) pend++;
        });
        if (n || pend) {
          const chips = el('div', { class: 'cdoc-chips-fila' }, [
            el('span', { class: 'cdoc-chip', text: (n + pend) + ' alumnos' }),
            n ? el('span', { class: 'cdoc-chip cdoc-chip-ok', text: apr + ' aprobados' }) : null,
            n ? el('span', { class: 'cdoc-chip cdoc-chip-error', text: rep + ' reprobados' }) : null,
            n ? el('span', { class: 'cdoc-chip', text: 'Promedio ' + (Math.round(suma / n * 10) / 10) }) : null,
            pend ? el('span', { class: 'cdoc-chip cdoc-chip-aviso', text: pend + ' pendientes / NC' }) : null
          ]);
          const env = t.closest('.cdoc-t-envoltura') || t;
          env.parentNode.insertBefore(chips, env);
        }
      }
    }
    document.body.classList.add('cdoc-pagina-cuerpo');
  }

  function moduloCaptura() {
    estilizarTablas(document);
    document.body.classList.add('cdoc-pagina-cuerpo', 'cdoc-captura');
  }

  /* ------------------------------------------------------------------------
     Cambio de contraseña (cat_cambiapwd.asp)
     ------------------------------------------------------------------------ */
  function moduloContrasena() {
    const form = $('form');
    const campos = ['old', 'new', 'conf'].map(n => $('input[name="' + n + '"]'));
    const enviar = $('input[type=submit]', form || document);
    if (!form || campos.some(c => !c) || !enviar) return moduloGenerico();
    const etiquetas = ['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña'];
    const tarjeta = el('section', { class: 'cdoc-card cdoc-form-card' }, [
      el('h2', { class: 'cdoc-h2', text: 'Cambiar contraseña' }),
      el('p', { class: 'cdoc-suave', text: 'Entre 10 y 15 caracteres: letras mayúsculas, minúsculas y números. Sin espacios ni caracteres especiales.' })
    ]);
    campos.forEach((c, i) => {
      c.id = c.id || 'cdoc-pwd-' + i;
      c.removeAttribute('style');
      c.setAttribute('autocomplete', i === 0 ? 'current-password' : 'new-password');
      const caja = el('div', { class: 'cdoc-campo' });
      tarjeta.append(el('label', { class: 'cdoc-etq', for: c.id, text: etiquetas[i] }), caja);
      caja.appendChild(c);
      const ojo = el('button', { type: 'button', class: 'cdoc-ojo', 'aria-label': 'Mostrar contraseña' });
      ojo.appendChild(icono(ICONO_OJO, 18));
      ojo.addEventListener('click', () => {
        const mostrar = c.type === 'password';
        c.type = mostrar ? 'text' : 'password';
        ojo.replaceChildren(icono(mostrar ? ICONO_OJO_NO : ICONO_OJO, 18));
      });
      caja.appendChild(ojo);
    });
    const aviso = el('div', { class: 'cdoc-nota-error', role: 'status' });
    const revisar = () => {
      const [a, n, f] = campos.map(c => c.value);
      let msg = '';
      if (n && !/^[A-Za-z0-9]{10,15}$/.test(n)) msg = 'La nueva contraseña debe tener de 10 a 15 letras o números.';
      else if (f && n !== f) msg = 'La confirmación no coincide.';
      else if (n && a && n === a) msg = 'La nueva contraseña es igual a la actual.';
      aviso.textContent = msg;
      return !msg;
    };
    campos.forEach(c => c.addEventListener('input', revisar));
    form.addEventListener('submit', e => { if (!revisar()) e.preventDefault(); });
    enviar.removeAttribute('style');
    enviar.classList.add('cdoc-btn');
    tarjeta.append(aviso, enviar);
    $$('input[type=hidden]', form).forEach(h => tarjeta.appendChild(h));
    const viejo = $('table', form);
    form.insertBefore(el('div', { class: 'cdoc-pagina' }, [tarjeta]), form.firstChild);
    if (viejo) viejo.classList.add('cdoc-oculto');
  }

  /* ------------------------------------------------------------------------
     Resultado de guardar calificaciones (cat_guarda_calpar.asp)
     ------------------------------------------------------------------------ */
  function moduloGuardado() {
    const ok = /guardadas correctamente/i.test(document.body.textContent);
    const msg = texto($('ul li b')) || (ok ? 'Las calificaciones fueron guardadas.' : texto(document.body).slice(0, 200));
    const grupo = (() => { const td = $$('td').find(t => /^\s*Grupo\s*:/.test(t.textContent)); return td && td.nextElementSibling ? texto(td.nextElementSibling) : ''; })();
    const imprimir = $('#impresion');
    const regresar = $('#btnregresagpos');
    const ic = el('div', { class: 'cdoc-resultado-ic' + (ok ? '' : ' cdoc-mal') });
    ic.appendChild(icono(ok ? IC.ok : IC.alerta, 34));
    const acciones = el('div', { class: 'cdoc-grupo-acciones' });
    if (imprimir) {
      const b = el('button', { type: 'button', class: 'cdoc-btn cdoc-btn-sec' });
      b.append(icono(IC.imprimir, 16), el('span', { text: 'Formato de impresión' }));
      b.addEventListener('click', () => imprimir.click());
      acciones.appendChild(b);
    }
    if (regresar) {
      regresar.removeAttribute('style');
      regresar.classList.add('cdoc-btn');
      regresar.value = 'Volver a mis grupos';
      acciones.appendChild(regresar);
    }
    document.body.appendChild(el('main', { class: 'cdoc-pagina' }, [
      el('section', { class: 'cdoc-card cdoc-resultado' }, [
        ic,
        el('h1', { class: 'cdoc-h1', text: ok ? '¡Listo!' : 'Atención' }),
        el('p', { text: msg }),
        grupo ? el('p', { class: 'cdoc-suave', text: grupo }) : null,
        acciones
      ])
    ]));
    if (imprimir) imprimir.classList.add('cdoc-oculto');
    document.body.classList.add('cdoc-solo-nuevo');
  }

  /* ------------------------------------------------------------------------
     Página de excepción (contraseña incorrecta, sesión expirada...)
     ------------------------------------------------------------------------ */
  function moduloExcepcion() {
    const enlace = $('a[href]');
    const cuerpo = texto(document.body).replace(/^.*?Descripci.n:\s*/i, '').replace(/Intentar otra vez\s*$/i, '').trim();
    if (window.name === 'fraizq') {
      marcos('acceso');
      document.documentElement.classList.add('cdoc-acceso');
      inyectarEstilosAcceso();
      asegurarViewport(document);
      const logo = el('div', { class: 'cdoc-acc-logo' });
      logo.appendChild(icono(ICONO_BIRRETE, 22));
      const boton = el('a', { class: 'cdoc-acc-btn cdoc-acc-btn-enlace', href: enlace ? enlace.getAttribute('href') : 'xyz_p1_Logi_Us13_Acce.html', text: 'Intentar otra vez' });
      document.body.appendChild(el('div', { class: 'cdoc-acc-fondo' }, [el('main', { class: 'cdoc-acc-tarjeta' }, [
        el('div', { class: 'cdoc-acc-marca' }, [logo, el('div', { class: 'cdoc-acc-nombre' }, [el('b', { text: 'CONECT Docentes' }), el('span', { text: 'ITS Purísima del Rincón' })]), botonTema()]),
        el('div', { class: 'cdoc-acc-paso cdoc-acc-error', text: 'No se pudo entrar' }),
        el('h1', { class: 'cdoc-acc-titulo', text: cuerpo || 'Ocurrió un problema' }),
        boton,
        el('a', { class: 'cdoc-acc-volver', href: 'xyz_p1_Logi_Us13_Acce.html', text: 'Volver a escribir el usuario' })
      ])]));
      return;
    }
    const ic = el('div', { class: 'cdoc-resultado-ic cdoc-mal' });
    ic.appendChild(icono(IC.alerta, 34));
    document.body.appendChild(el('main', { class: 'cdoc-pagina' }, [el('section', { class: 'cdoc-card cdoc-resultado' }, [
      ic, el('h1', { class: 'cdoc-h1', text: 'Ocurrió un problema' }), el('p', { text: cuerpo }),
      enlace ? el('a', { class: 'cdoc-btn', href: enlace.getAttribute('href'), text: texto(enlace) || 'Intentar otra vez' }) : null
    ])]));
    document.body.classList.add('cdoc-solo-nuevo');
  }

  /* ------------------------------------------------------------------------
     Genérico: avisos, verano, documentos y cualquier otra página
     ------------------------------------------------------------------------ */
  function moduloGenerico() {
    estilizarTablas(document);
    document.body.classList.add('cdoc-pagina-cuerpo');
    // Mensajes "No tiene..." con imagen de exclamación
    $$('h4, h5').forEach(h => {
      if ($('img[src*="exclamacion"]', h)) {
        $$('img', h).forEach(i => i.remove());
        h.classList.add('cdoc-vacio');
      }
    });
    if (!texto(document.body)) {
      document.body.appendChild(el('div', { class: 'cdoc-vacio', text: 'No hay información para mostrar por ahora.' }));
    }
  }

  /* ------------------------------------------------------------------------
     Estilos generales del portal
     ------------------------------------------------------------------------ */
  const CSS_PORTAL = `
html.cdoc-mod{
  --cm-primario:#1b396a;--cm-primario-hover:#132a4f;--cm-primario-suave:#e8eef8;--cm-enlace:#1d4f9e;--cm-foco:rgba(29,79,158,.3);
  --cm-acento:#8a2036;--cm-acento-suave:#f8e9ec;
  --cm-fondo:#f3f5f9;--cm-superficie:#ffffff;--cm-superficie-2:#f8fafc;--cm-encabezado-tabla:#eef2f7;--cm-hover:#f1f5fb;--cm-borde:#dfe5ee;
  --cm-texto:#1a2433;--cm-texto-suave:#4b5768;
  --cm-exito:#17784a;--cm-exito-fondo:#e4f4ec;--cm-peligro:#b42318;--cm-peligro-fondo:#fdeceb;--cm-aviso:#8f5200;--cm-aviso-fondo:#fff2dc;--cm-neutro:#556274;--cm-neutro-fondo:#edf0f4;
  --cm-m1-f:#e3ecfb;--cm-m1-t:#173f7a;--cm-m2-f:#e2f4ea;--cm-m2-t:#145c39;--cm-m3-f:#fbe7ea;--cm-m3-t:#7d1d30;--cm-m4-f:#fff0d9;--cm-m4-t:#7a4600;
  --cm-m5-f:#efe6fb;--cm-m5-t:#4e2a84;--cm-m6-f:#e0f3f6;--cm-m6-t:#11586a;--cm-m7-f:#f4ecdf;--cm-m7-t:#5f4521;--cm-m8-f:#eceff3;--cm-m8-t:#36424f;
  --cm-sombra:0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.08);--cm-sombra-alta:0 12px 32px rgba(16,24,40,.14);
  --cm-fuente:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--cm-radio:12px;
  color-scheme:light}
html.cdoc-mod[data-cdoc-tema="dark"]{
  --cm-primario:#3a64aa;--cm-primario-hover:#4a75bd;--cm-primario-suave:#1c2a40;--cm-enlace:#9cbcf0;--cm-foco:rgba(156,188,240,.35);
  --cm-acento:#f0a3b3;--cm-acento-suave:#3a1c24;
  --cm-fondo:#0e141d;--cm-superficie:#151d29;--cm-superficie-2:#1a2331;--cm-encabezado-tabla:#1d2736;--cm-hover:#1f2a3a;--cm-borde:#2a3546;
  --cm-texto:#e5e9f0;--cm-texto-suave:#a9b3c2;
  --cm-exito:#6fd7a1;--cm-exito-fondo:#12301f;--cm-peligro:#ff9a8f;--cm-peligro-fondo:#3a1714;--cm-aviso:#f5c06a;--cm-aviso-fondo:#33260f;--cm-neutro:#b1bccb;--cm-neutro-fondo:#222c3a;
  --cm-m1-f:#1c2c47;--cm-m1-t:#b9d0f7;--cm-m2-f:#15322a;--cm-m2-t:#a7e3c4;--cm-m3-f:#3a1d25;--cm-m3-t:#f4b9c5;--cm-m4-f:#3a2a12;--cm-m4-t:#f6d29a;
  --cm-m5-f:#2b2142;--cm-m5-t:#d4c1f5;--cm-m6-f:#133238;--cm-m6-t:#a5dde8;--cm-m7-f:#33291b;--cm-m7-t:#e6d2b0;--cm-m8-f:#252d38;--cm-m8-t:#c9d2de;
  --cm-sombra:0 1px 2px rgba(0,0,0,.4);--cm-sombra-alta:0 12px 32px rgba(0,0,0,.5);color-scheme:dark}
html.cdoc-mod,html.cdoc-mod body{background:var(--cm-fondo)!important;color:var(--cm-texto)!important}
html.cdoc-mod body{margin:0!important;font:15px/1.55 var(--cm-fuente)!important;-webkit-font-smoothing:antialiased}
html.cdoc-mod *{box-sizing:border-box}
html.cdoc-cambiando-tema *,html.cdoc-cambiando-tema *::before{transition:background-color .3s ease,color .3s ease,border-color .3s ease!important}
html.cdoc-mod a{color:var(--cm-enlace)}
html.cdoc-mod [style*="darkred"]{color:var(--cm-acento)!important}
html.cdoc-mod [style*="color:black"],html.cdoc-mod [style*="color: black"]{color:var(--cm-texto)!important}
html.cdoc-mod font[color="red"]{color:var(--cm-peligro)!important}
.cdoc-oculto{display:none!important}
.cdoc-pagina{max-width:1100px;margin:0 auto;padding:20px 20px 40px}
body.cdoc-pagina-cuerpo{padding:20px!important;max-width:1140px;margin:0 auto!important}
body.cdoc-solo-nuevo>:not(.cdoc-pagina):not(script):not(style){display:none!important}
.cdoc-card{background:var(--cm-superficie);border:1px solid var(--cm-borde);border-radius:var(--cm-radio);box-shadow:var(--cm-sombra);padding:18px 20px;margin-bottom:16px}
.cdoc-card-scroll{overflow-x:auto}
.cdoc-h1{font-size:24px;line-height:1.2;margin:0;font-weight:700;color:var(--cm-texto)}
.cdoc-h2{font-size:16px;margin:0 0 12px;font-weight:700;color:var(--cm-texto)}
.cdoc-h2.cdoc-sep{margin:22px 2px 10px}
.cdoc-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--cm-acento)}
.cdoc-suave{color:var(--cm-texto-suave);margin:4px 0}
.cdoc-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:var(--cm-neutro-fondo);color:var(--cm-neutro);font-size:12px;font-weight:600;white-space:nowrap}
.cdoc-chip-ok{background:var(--cm-exito-fondo);color:var(--cm-exito)}
.cdoc-chip-error{background:var(--cm-peligro-fondo);color:var(--cm-peligro)}
.cdoc-chip-aviso{background:var(--cm-aviso-fondo);color:var(--cm-aviso)}
.cdoc-chips-fila{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
html.cdoc-mod .cdoc-btn,html.cdoc-mod input[type=submit].cdoc-btn,html.cdoc-mod input[type=button].cdoc-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-weight:600;font-size:14px;border:1px solid var(--cm-primario)!important;background:var(--cm-primario)!important;color:#fff!important;border-radius:9px;padding:8px 14px;cursor:pointer;text-decoration:none;-webkit-appearance:none;appearance:none}
html.cdoc-mod .cdoc-btn:hover{background:var(--cm-primario-hover)!important}
html.cdoc-mod .cdoc-btn-sec{background:transparent!important;color:var(--cm-primario)!important}
html.cdoc-mod[data-cdoc-tema="dark"] .cdoc-btn-sec{color:var(--cm-enlace)!important;border-color:var(--cm-borde)!important}
html.cdoc-mod .cdoc-btn-sec:hover{background:var(--cm-primario-suave)!important}
.cdoc-btn:focus-visible,.cdoc-btn-icono:focus-visible,.cdoc-nav-item:focus-visible,.cdoc-acceso-rapido:focus-visible,.cdoc-select:focus-visible{outline:3px solid var(--cm-foco);outline-offset:2px}
.cdoc-btn-icono{display:inline-grid;place-items:center;width:38px;height:38px;border:1px solid var(--cm-borde);border-radius:10px;background:var(--cm-superficie);color:var(--cm-texto-suave);cursor:pointer;padding:0;flex:none}
.cdoc-btn-icono:hover{background:var(--cm-hover);color:var(--cm-texto)}
html.cdoc-mod select,html.cdoc-mod input[type=text],html.cdoc-mod input[type=password]{font:inherit;color:var(--cm-texto);background:var(--cm-superficie);border:1px solid var(--cm-borde);border-radius:8px}
html.cdoc-mod .cdoc-select{width:100%;padding:8px 10px;font-size:14px}
/* Barra lateral */
html.cdoc-mod body:has(.cdoc-side)>:not(.cdoc-side):not(script):not(style){display:none!important}
.cdoc-side{min-height:100vh;display:flex;flex-direction:column;background:var(--cm-superficie);border-right:1px solid var(--cm-borde);padding:14px 12px}
.cdoc-side-marca{display:flex;align-items:center;gap:10px;padding:4px 6px 14px}
.cdoc-side-logo{width:36px;height:36px;border-radius:10px;background:var(--cm-primario);color:#fff;display:grid;place-items:center;flex:none}
.cdoc-side-nombre{flex:1;min-width:0}
.cdoc-side-nombre b{display:block;font-size:15px;line-height:1.2}
.cdoc-side-nombre span{display:block;font-size:11.5px;color:var(--cm-texto-suave)}
.cdoc-side-cerrar{display:none;border:0;background:transparent;color:var(--cm-texto-suave);cursor:pointer;padding:6px;border-radius:8px}
.cdoc-side-perfil{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;background:var(--cm-superficie-2);border:1px solid var(--cm-borde);margin-bottom:10px}
.cdoc-side-perfil b{display:block;font-size:13.5px;line-height:1.25}
.cdoc-side-perfil span{display:block;font-size:11.5px;color:var(--cm-texto-suave)}
.cdoc-avatar{width:36px;height:36px;border-radius:50%;background:var(--cm-acento-suave);color:var(--cm-acento);display:grid;place-items:center;font-weight:700;font-size:14px;flex:none;text-transform:uppercase}
.cdoc-avatar-grande{width:64px;height:64px;font-size:24px}
.cdoc-nav{flex:1;display:flex;flex-direction:column;gap:2px;overflow-y:auto}
.cdoc-nav-sec{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--cm-texto-suave);padding:12px 10px 4px}
.cdoc-nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;color:var(--cm-texto)!important;text-decoration:none;font-size:14px;font-weight:500;border:0;background:transparent;cursor:pointer;width:100%;text-align:left;font-family:inherit}
.cdoc-nav-item svg{color:var(--cm-texto-suave);flex:none}
.cdoc-nav-item:hover{background:var(--cm-hover)}
.cdoc-nav-item.activo{background:var(--cm-primario-suave);color:var(--cm-primario)!important;font-weight:700}
html.cdoc-mod[data-cdoc-tema="dark"] .cdoc-nav-item.activo{color:var(--cm-enlace)!important}
.cdoc-nav-item.activo svg{color:inherit}
.cdoc-side-pie{display:flex;align-items:center;gap:8px;border-top:1px solid var(--cm-borde);padding-top:10px;margin-top:8px}
.cdoc-nav-salir{color:var(--cm-peligro)!important}
.cdoc-nav-salir svg{color:var(--cm-peligro)}
html.cdoc-celular .cdoc-side-cerrar{display:block}
/* Encabezado de sección */
html.cdoc-mod body.cdoc-con-marco{height:100vh;display:flex;flex-direction:column;overflow:hidden}
html.cdoc-mod body.cdoc-con-marco>:not(.cdoc-cabecera):not(.cdoc-marco):not(script):not(style){display:none!important}
.cdoc-cabecera{display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--cm-superficie);border-bottom:1px solid var(--cm-borde);flex:none}
.cdoc-cabecera-titulo{flex:1;font-size:17px;font-weight:700;margin:0;color:var(--cm-texto);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cdoc-marco{flex:1;width:100%;border:0;display:block;background:var(--cm-fondo)}
.cdoc-solo-celular{display:none}
html.cdoc-celular .cdoc-solo-celular{display:inline-grid}
/* Inicio */
html.cdoc-mod body:has(.cdoc-bienvenida)>:not(main):not(.cdoc-cabecera):not(script):not(style){display:none!important}
.cdoc-cabecera-simple{position:sticky;top:0;z-index:5}
.cdoc-bienvenida{display:flex;align-items:center;gap:18px}
.cdoc-datos{display:grid;grid-template-columns:max-content 1fr;gap:8px 18px;margin:0}
.cdoc-datos dt{color:var(--cm-texto-suave);font-size:13.5px}
.cdoc-datos dd{margin:0;font-weight:600}
.cdoc-rejilla-accesos{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.cdoc-acceso-rapido{display:flex;flex-direction:column;gap:4px;padding:16px;border-radius:var(--cm-radio);background:var(--cm-superficie);border:1px solid var(--cm-borde);box-shadow:var(--cm-sombra);text-decoration:none;color:var(--cm-texto)!important;transition:transform .15s ease,box-shadow .15s ease}
.cdoc-acceso-rapido:hover{transform:translateY(-2px);box-shadow:var(--cm-sombra-alta)}
.cdoc-acceso-rapido span:last-child{color:var(--cm-texto-suave);font-size:13px}
.cdoc-acceso-ic{width:40px;height:40px;border-radius:10px;background:var(--cm-primario-suave);color:var(--cm-primario);display:grid;place-items:center;margin-bottom:6px}
html.cdoc-mod[data-cdoc-tema="dark"] .cdoc-acceso-ic{color:var(--cm-enlace)}
/* Grupos */
.cdoc-rejilla-grupos{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px;margin-top:10px}
.cdoc-grupo{display:flex;flex-direction:column;gap:8px;margin:0;border-top:4px solid var(--tono-t)}
.cdoc-grupo-cab{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cdoc-grupo-clave{font-weight:800;font-size:13px;padding:3px 10px;border-radius:8px;background:var(--tono-f);color:var(--tono-t)}
.cdoc-grupo-materia{font-size:16px;margin:2px 0 4px;line-height:1.3;color:var(--cm-texto)}
.cdoc-etq-mini{font-size:12px;font-weight:600;color:var(--cm-texto-suave)}
.cdoc-grupo-acciones{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.cdoc-tono-1{--tono-f:var(--cm-m1-f);--tono-t:var(--cm-m1-t)}.cdoc-tono-2{--tono-f:var(--cm-m2-f);--tono-t:var(--cm-m2-t)}
.cdoc-tono-3{--tono-f:var(--cm-m3-f);--tono-t:var(--cm-m3-t)}.cdoc-tono-4{--tono-f:var(--cm-m4-f);--tono-t:var(--cm-m4-t)}
.cdoc-tono-5{--tono-f:var(--cm-m5-f);--tono-t:var(--cm-m5-t)}.cdoc-tono-6{--tono-f:var(--cm-m6-f);--tono-t:var(--cm-m6-t)}
.cdoc-tono-7{--tono-f:var(--cm-m7-f);--tono-t:var(--cm-m7-t)}.cdoc-tono-8{--tono-f:var(--cm-m8-f);--tono-t:var(--cm-m8-t)}
/* Horario */
html.cdoc-mod body:has(.cdoc-horario)>:not(main):not(script):not(style){display:none!important}
.cdoc-horario{display:grid;grid-template-columns:56px repeat(var(--dias),minmax(110px,1fr));grid-template-rows:auto repeat(var(--horas),60px);min-width:640px}
.cdoc-h-dia{grid-row:1;text-align:center;font-weight:700;font-size:13px;padding:6px 4px 10px;color:var(--cm-texto)}
.cdoc-h-hora{grid-column:1;font-size:11.5px;color:var(--cm-texto-suave);padding-top:2px;text-align:right;padding-right:8px;font-variant-numeric:tabular-nums}
.cdoc-h-celda{border-top:1px solid var(--cm-borde);border-left:1px dashed var(--cm-borde)}
.cdoc-h-clase{margin:2px 3px;border-radius:9px;padding:6px 8px;background:var(--tono-f);color:var(--tono-t);border-left:4px solid var(--tono-t);display:flex;flex-direction:column;gap:1px;font-size:12px;overflow:hidden;z-index:1}
.cdoc-h-clase b{font-size:12px;line-height:1.2;overflow:hidden;text-overflow:ellipsis}
.cdoc-h-salon{font-weight:700;opacity:.85}
.cdoc-h-corta{padding:4px 7px;gap:0;justify-content:center}
.cdoc-h-corta b{white-space:nowrap}
.cdoc-h-corta span:not(.cdoc-h-salon){display:none}
.cdoc-lista-materias{display:flex;flex-direction:column}
.cdoc-materia-fila{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid var(--cm-borde)}
.cdoc-materia-fila:last-child{border-bottom:0}
.cdoc-materia-fila>div{flex:1;min-width:0;display:flex;flex-direction:column}
.cdoc-materia-fila .cdoc-suave{font-size:12.5px}
.cdoc-punto{width:12px;height:12px;border-radius:50%;background:var(--tono-t);flex:none}
.cdoc-original{margin-top:14px;color:var(--cm-texto-suave);font-size:13px}
.cdoc-original pre{overflow:auto;background:var(--cm-superficie);border:1px solid var(--cm-borde);border-radius:10px;padding:12px;color:var(--cm-texto)}
/* Tablas */
.cdoc-t-envoltura{overflow-x:auto;border-radius:var(--cm-radio);border:1px solid var(--cm-borde);background:var(--cm-superficie);box-shadow:var(--cm-sombra);margin:10px 0 16px}
html.cdoc-mod table.cdoc-t{border-collapse:collapse!important;width:100%!important;font:13.5px/1.4 var(--cm-fuente)!important;border:0!important;background:transparent!important;margin:0!important}
html.cdoc-mod table.cdoc-t th,html.cdoc-mod table.cdoc-t td{padding:8px 10px!important;border:0!important;border-bottom:1px solid var(--cm-borde)!important;color:var(--cm-texto)!important;background:transparent!important;font-size:13.5px!important}
html.cdoc-mod table.cdoc-t tr{background:transparent!important;color:var(--cm-texto)!important}
html.cdoc-mod table.cdoc-t tr:last-child td{border-bottom:0!important}
html.cdoc-mod table.cdoc-t th,html.cdoc-mod table.cdoc-t tr[style*="E9EDE8"]:first-child td{background:var(--cm-encabezado-tabla)!important;font-weight:700!important;font-size:12.5px!important}
html.cdoc-mod table.cdoc-t tr:hover td{background:var(--cm-hover)!important}
html.cdoc-mod table.cdoc-t-info{color:var(--cm-texto)!important;font-size:14px!important;margin:0 0 6px}
html.cdoc-mod table.cdoc-t-info td{padding:2px 8px 2px 0}
.cdoc-cal-apr{color:var(--cm-exito)!important;font-weight:700}
.cdoc-cal-rep{color:var(--cm-peligro)!important;font-weight:700}
.cdoc-cal-nc{color:var(--cm-texto-suave)!important}
.cdoc-materia{padding-bottom:6px}
.cdoc-materia .cdoc-t-envoltura{box-shadow:none;margin:0 0 12px}
.cdoc-materia .cdoc-chip{margin:2px 4px 2px 0}
.cdoc-vacio{background:var(--cm-superficie);border:1px dashed var(--cm-borde);border-radius:var(--cm-radio);padding:28px;text-align:center;color:var(--cm-texto-suave);font-weight:500}
html.cdoc-mod h4,html.cdoc-mod h5{color:var(--cm-texto)}
/* Captura */
body.cdoc-captura input.cdoc-caja{padding:4px!important;width:52px;font-size:14px}
html.cdoc-mod body.cdoc-captura input[disabled]{background:var(--cm-superficie-2)!important;color:var(--cm-texto)!important;border:1px solid var(--cm-borde);border-radius:6px;width:52px;text-align:center;padding:4px}
html.cdoc-mod body.cdoc-captura input[type=submit],html.cdoc-mod body.cdoc-captura input[type=reset]{font:inherit;font-weight:600;padding:8px 14px;border-radius:9px!important;border:1px solid var(--cm-primario)!important;background:var(--cm-primario)!important;color:#fff!important;cursor:pointer}
html.cdoc-mod body.cdoc-captura input[type=reset]{background:transparent!important;color:var(--cm-texto)!important;border-color:var(--cm-borde)!important}
/* Formularios */
.cdoc-form-card{max-width:480px}
.cdoc-etq{display:block;font-weight:600;font-size:13px;margin:12px 0 6px}
.cdoc-campo{position:relative}
.cdoc-campo input{width:100%;padding:10px 46px 10px 12px!important;font-size:15px!important}
.cdoc-campo input:focus{outline:none;border-color:var(--cm-primario);box-shadow:0 0 0 4px var(--cm-foco)}
.cdoc-ojo{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:36px;height:36px;border:0;border-radius:8px;background:transparent;color:var(--cm-texto-suave);cursor:pointer;display:grid;place-items:center}
.cdoc-nota-error{color:var(--cm-peligro);font-size:13px;min-height:20px;margin:10px 0}
.cdoc-form-card .cdoc-btn{width:100%;padding:11px}
/* Resultado */
.cdoc-resultado{max-width:520px;margin:30px auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;padding:30px 24px}
.cdoc-resultado-ic{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--cm-exito-fondo);color:var(--cm-exito);margin-bottom:6px}
.cdoc-resultado-ic.cdoc-mal{background:var(--cm-peligro-fondo);color:var(--cm-peligro)}
.cdoc-resultado .cdoc-grupo-acciones{justify-content:center;margin-top:12px}
@media (max-width:560px){.cdoc-pagina{padding:14px 12px 30px}body.cdoc-pagina-cuerpo{padding:12px!important}.cdoc-bienvenida{flex-direction:column;align-items:flex-start}}
`;

  function inyectarCSSPortal() {
    if ($('#cdoc-css-portal')) return;
    const st = el('style', { id: 'cdoc-css-portal' });
    st.textContent = CSS_PORTAL;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------------
     Enrutador
     ------------------------------------------------------------------------ */
  const MODULOS = {
    'mnucatedraticos.asp': moduloMenu,
    'cat_contenido.asp': moduloContenido,
    'cat_home.asp': moduloInicio,
    'cat_cap_misgrupos.asp': moduloGrupos,
    'cat_horario.asp': moduloHorario,
    'cat_vera_horario.asp': moduloHorario,
    'cat_detmaterias.asp': moduloDetalle,
    'cat_rpt_conscalparcial.asp': moduloReporte,
    'cat_rpt_calfinales.asp': moduloReporte,
    'cat_cap_parcial.asp': moduloCaptura,
    'cat_cambiapwd.asp': moduloContrasena,
    'cat_guarda_calpar.asp': moduloGuardado
  };
  const SIN_DISENO = ['', 'index.html', 'bienvenido.asp', 'portal_contenido.asp', 'redireccionar.asp', 'cat_posic_nav.asp', 'cerrar_sesion.asp'];

  function iniciar() {
    if (window.__cdocDiseno) return;
    window.__cdocDiseno = true;
    if (/[?&]sinmod\b/i.test(location.search)) return;
    if (!document.body || document.body.tagName === 'FRAMESET') return;
    instalarTema();
    const acceso = detectarAcceso();
    if (acceso) {
      marcos('acceso');
      try { moduloAcceso(acceso); } catch (err) { console.error('[CONECT Mod Docentes] Acceso:', err); }
      return;
    }
    const pagina = (location.pathname.split('/').pop() || '').toLowerCase();
    if (pagina === 'excepcion.asp') {
      document.documentElement.classList.add('cdoc-mod');
      inyectarCSSPortal();
      try { moduloExcepcion(); } catch (err) { console.error('[CONECT Mod Docentes] Excepción:', err); }
      return;
    }
    if (SIN_DISENO.includes(pagina)) return;
    if (pagina === 'mnucatedraticos.asp') marcos('menu');
    document.documentElement.classList.add('cdoc-mod');
    // "Celular" se decide por el ancho de la ventana, no del marco
    const marcarCelular = () => document.documentElement.classList.toggle('cdoc-celular', esCelular());
    marcarCelular();
    try { window.top.addEventListener('resize', marcarCelular); } catch (e) { window.addEventListener('resize', marcarCelular); }
    inyectarCSSPortal();
    const modulo = MODULOS[pagina] || moduloGenerico;
    try {
      modulo();
    } catch (err) {
      console.error('[CONECT Mod Docentes] No se pudo rediseñar ' + pagina + ':', err);
      // Si algo falla se deja la página original visible
      document.documentElement.classList.remove('cdoc-mod');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

;
/* ==========================================================================
   CONECT Mod Docentes (no oficial)
   Captura de calificaciones parciales desde un archivo Excel.

   Cómo funciona el portal (ver LOGICA_PORTAL_DOCENTES.md):
   - La página cat_cap_parcial.asp contiene un <form> que hace POST a
     cat_guarda_calpar.asp con un campo por alumno e indicador:
         R{fila}L{inscripción}P{parcial}I{idIndicador}V{peso}E{númIndicador}
     y una columna final deshabilitada (no se envía):
         R{fila}L{inscripción}P{parcial}I{idPrimerIndicador}V{peso}F
   - El cálculo original está en VBScript (solo Internet Explorer), así que en
     navegadores modernos no se ejecuta. Aquí se reimplementa en JS.

   Este script NO envía nada por su cuenta: llena las cajas del formulario
   original y el docente decide cuándo presionar "Guardar".
   ========================================================================== */
(function () {
  'use strict';

  const EN_NODE = typeof window === 'undefined';
  if (!EN_NODE) {
    if (window.__cdocActivo) return;
    window.__cdocActivo = true;
  }

  const RE_CAMPO = /^R(\d+)L(\d+)P(\d+)I(\d+)V(\d+)E(\d+)$/i;
  const RE_FINAL = /^R(\d+)L(\d+)P(\d+)I(\d+)V(\d+)F$/i;
  const TIEMPO_SESION_MS = 1080000; // 18 min: mismo valor que el autoguardado original
  const VALORES_TEXTO = ['NC', 'NP'];

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  const $ = (sel, raiz) => (raiz || document).querySelector(sel);
  const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

  function el(tag, attrs, hijos) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const h of [].concat(hijos || [])) {
      if (h == null || h === false) continue;
      n.appendChild(typeof h === 'string' || typeof h === 'number' ? document.createTextNode(String(h)) : h);
    }
    return n;
  }

  function texto(n) {
    return (n ? n.textContent : '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Mayúsculas, sin acentos ni signos, espacios simples. */
  function normalizar(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\ufffd/g, '') // caracteres mal decodificados por el portal (ISO-8859-1)
      .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  }

  /** "*AB12345678" -> "AB12345678" */
  function normalizarControl(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function claveNombre(s) {
    return normalizar(s).split(' ').filter(Boolean).sort().join(' ');
  }

  function letraColumna(i) {
    let s = '';
    i += 1;
    while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  /* ------------------------------------------------------------------------
     Reglas de calificación (traducción de las subrutinas VBScript Calcula)
     ------------------------------------------------------------------------ */

  /**
   * Valida y redondea un valor como lo hace el portal al salir de la caja:
   * - "NC" / "NP" se respetan.
   * - Menor a la mínima aprobatoria: se trunca (Fix).
   * - Mayor o igual: se redondea (x.5 sube).
   * Devuelve { ok, valor (texto a escribir), num (para el promedio), vacio }.
   */
  function evaluarValor(entrada, calMin) {
    if (entrada == null) return { ok: true, vacio: true, valor: '', num: 0 };
    let s = String(entrada).trim().toUpperCase();
    if (s === '') return { ok: true, vacio: true, valor: '', num: 0 };
    if (VALORES_TEXTO.includes(s)) return { ok: true, valor: s, num: 0 };
    s = s.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return { ok: false, valor: String(entrada).trim(), num: 0, error: 'No es número' };
    const n = parseFloat(s);
    if (n < 0 || n > 100) return { ok: false, valor: String(entrada).trim(), num: 0, error: 'Fuera de 0-100' };
    const r = n < calMin ? Math.trunc(n) : Math.floor(n + 0.5);
    return { ok: true, valor: String(r), num: r };
  }

  /**
   * Calificación del parcial = suma(peso/100 * calificación del indicador).
   * Se usa peso/100 * calificación (no peso*calificación/100) porque así
   * coincide con lo que devuelve el servidor, incluido su error de redondeo
   * (p. ej. 14 en todos los indicadores se guarda como 13).
   */
  function calcularFinal(valores, indicadores, calMin) {
    let total = 0;
    indicadores.forEach((ind, i) => {
      total += (ind.peso / 100) * (valores[i] || 0);
    });
    return total < calMin ? Math.trunc(total) : Math.round(total);
  }

  /* ------------------------------------------------------------------------
     Lectura de la página de captura
     ------------------------------------------------------------------------ */
  function leerModelo(form, campos) {
    // Mínima aprobatoria: onfocusout='Calcula(70 )'
    let calMin = 70;
    const conCalcula = campos.find(c => /Calcula\s*\(/i.test(c.getAttribute('onfocusout') || ''));
    if (conCalcula) {
      const m = (conCalcula.getAttribute('onfocusout') || '').match(/Calcula\s*\(\s*([\d.]+)/i);
      if (m) calMin = parseFloat(m[1]);
    }

    // Nombres de indicadores: "Indicadores/Competencias Evaluados: 1-PROYECTO ...   2-EXAMEN ..."
    const nombres = {};
    const celdaInd = $$('td').find(td => /Indicadores\s*\/\s*Competencias/i.test(td.textContent));
    if (celdaInd) {
      const b = $('b', celdaInd);
      const crudo = (b ? b.textContent : celdaInd.textContent).replace(/^[\s\S]*Evaluados:/i, '');
      crudo.split(/[\u00a0\s]{2,}/).forEach(parte => {
        const m = parte.trim().match(/^(\d+)\s*-\s*(.+)$/);
        if (m) nombres[m[1]] = m[2].trim();
      });
    }

    // Agrupar campos por fila (R)
    const filas = new Map();
    campos.forEach(c => {
      const m = c.name.match(RE_CAMPO);
      const r = +m[1];
      if (!filas.has(r)) filas.set(r, { r, inscripcion: m[2], parcial: m[3], campos: [] });
      filas.get(r).campos.push({ input: c, id: m[4], peso: +m[5], num: m[6] });
    });

    // Indicadores (de la primera fila, en orden de documento)
    const primera = filas.values().next().value;
    const indicadores = primera.campos.map(c => ({
      num: c.num,
      id: c.id,
      peso: c.peso,
      nombre: nombres[c.num] || ('Indicador ' + c.num)
    }));

    const alumnos = [];
    for (const f of filas.values()) {
      const tr = f.campos[0].input.closest('tr');
      if (!tr) continue;
      const celdas = tr.cells;
      const controlCrudo = texto(celdas[1]);
      const finalInput = $$('input', tr).find(i => RE_FINAL.test(i.name || ''));
      // Ordenar las cajas de la fila igual que los indicadores
      const cajas = indicadores.map(ind => (f.campos.find(c => c.num === ind.num) || {}).input || null);
      alumnos.push({
        fila: f.r,
        inscripcion: f.inscripcion,
        num: texto(celdas[0]),
        control: normalizarControl(controlCrudo),
        marcado: controlCrudo.includes('*'),
        nombre: texto(celdas[2]),
        tr,
        cajas,
        finalInput
      });
    }

    // Datos del grupo
    let grupo = '';
    const tdGrupo = $$('td').find(td => /^\s*Grupo\s*:\s*$/i.test(td.textContent));
    if (tdGrupo && tdGrupo.nextElementSibling) grupo = texto(tdGrupo.nextElementSibling);
    let docente = '';
    const tdDoc = $$('td').find(td => /^\s*Docente\s*:\s*$/i.test(td.textContent));
    if (tdDoc && tdDoc.nextElementSibling) docente = texto(tdDoc.nextElementSibling);

    return {
      form,
      calMin,
      parcial: primera.parcial,
      indicadores,
      alumnos,
      grupo,
      claveGrupo: grupo.split('-')[0].trim(),
      docente
    };
  }

  /* ------------------------------------------------------------------------
     Reparación del formulario (lo que el VBScript hacía en IE)
     ------------------------------------------------------------------------ */
  const estado = { sucio: false, enviando: false, inicio: Date.now() };

  function recalcularFila(modelo, al) {
    if (!al.finalInput) return;
    const nums = al.cajas.map(c => (c ? evaluarValor(c.value, modelo.calMin).num : 0));
    const f = calcularFinal(nums, modelo.indicadores, modelo.calMin);
    al.finalInput.value = String(f);
    al.finalInput.classList.toggle('cdoc-reprobado', f < modelo.calMin);
  }

  function validarCaja(modelo, caja) {
    const ev = evaluarValor(caja.value, modelo.calMin);
    caja.classList.toggle('cdoc-invalido', !ev.ok);
    caja.title = ev.ok ? '' : (ev.error + ': use 0-100, NC o NP');
    return ev;
  }

  function repararFormulario(modelo) {
    const todas = [];
    modelo.alumnos.forEach((al, iFila) => {
      al.cajas.forEach((caja, iCol) => {
        if (!caja) return;
        todas.push(caja);
        // Los manejadores originales son VBScript: en Chrome/Firefox/Safari solo generan errores
        caja.removeAttribute('onfocusout');
        caja.removeAttribute('onkeydown');
        caja.setAttribute('autocomplete', 'off');
        caja.setAttribute('inputmode', 'decimal');
        caja.classList.add('cdoc-caja');

        caja.addEventListener('input', () => {
          estado.sucio = true;
          validarCaja(modelo, caja);
          recalcularFila(modelo, al);
        });
        caja.addEventListener('change', () => {
          const ev = validarCaja(modelo, caja);
          if (ev.ok && !ev.vacio) caja.value = ev.valor;
          recalcularFila(modelo, al);
        });
        caja.addEventListener('focus', () => caja.select());
        caja.addEventListener('keydown', e => {
          let destino = null;
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            destino = (modelo.alumnos[iFila + 1] || modelo.alumnos[0]).cajas[iCol];
          } else if (e.key === 'ArrowUp') {
            destino = (modelo.alumnos[iFila - 1] || modelo.alumnos[modelo.alumnos.length - 1]).cajas[iCol];
          }
          if (destino) {
            e.preventDefault(); // Enter ya no envía el formulario por accidente
            caja.dispatchEvent(new Event('change', { bubbles: true }));
            destino.focus();
          }
        });
      });
      recalcularFila(modelo, al);
    });

    // "Deshacer Captura" (reset): recalcular después de que el navegador restaure los valores
    modelo.form.addEventListener('reset', () => {
      setTimeout(() => {
        todas.forEach(c => { c.classList.remove('cdoc-invalido', 'cdoc-cambiado'); });
        modelo.alumnos.forEach(al => recalcularFila(modelo, al));
        estado.sucio = false;
      }, 0);
    });

    // Validar antes de enviar (el portal original no lo hacía en navegadores modernos)
    modelo.form.addEventListener('submit', e => {
      const malos = [];
      todas.forEach(c => {
        const ev = validarCaja(modelo, c);
        if (ev.ok) { if (!ev.vacio) c.value = ev.valor; } else malos.push(c);
      });
      if (malos.length) {
        e.preventDefault();
        e.stopImmediatePropagation();
        malos[0].focus();
        window.alert('Hay ' + malos.length + ' calificación(es) inválida(s) marcadas en rojo.\nUse números de 0 a 100, NC o NP.');
        return;
      }
      estado.enviando = true;
    }, true);

    window.addEventListener('beforeunload', e => {
      if (estado.sucio && !estado.enviando) { e.preventDefault(); e.returnValue = ''; }
    });

    // Autoguardado: el original (VBScript) envía el formulario a los 18 min.
    // Aquí se reproduce solo si hay cambios y todo es válido.
    setTimeout(() => {
      if (!estado.sucio || estado.enviando) return;
      const hayInvalidos = todas.some(c => !evaluarValor(c.value, modelo.calMin).ok);
      if (hayInvalidos) return;
      estado.enviando = true;
      window.alert('El tiempo de su sesión está por expirar. Se guardarán las calificaciones capturadas para no perderlas.');
      modelo.form.submit();
    }, TIEMPO_SESION_MS);

    return todas;
  }

  /* ------------------------------------------------------------------------
     Lectura del Excel
     ------------------------------------------------------------------------ */
  const RE_ES_CONTROL = /^[A-Z]{0,3}\d{6,}[A-Z]?$/;

  function leerLibro(buffer) {
    if (typeof XLSX === 'undefined') throw new Error('No se cargó la librería para leer Excel (SheetJS).');
    return XLSX.read(buffer, { type: 'array', cellDates: false });
  }

  function hojaAMatriz(libro, nombreHoja) {
    const ws = libro.Sheets[nombreHoja];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
  }

  /** Detecta la fila de encabezados y arma la lista de columnas. */
  function analizarMatriz(matriz) {
    const limite = Math.min(matriz.length, 25);
    let filaEnc = -1;
    for (let i = 0; i < limite; i++) {
      const fila = matriz[i] || [];
      if (fila.some(c => /CONTROL|MATRICULA|NO CTRL|NUM CTRL/.test(normalizar(c)))) { filaEnc = i; break; }
    }
    let inicioDatos;
    if (filaEnc >= 0) {
      inicioDatos = filaEnc + 1;
    } else {
      // Sin encabezado reconocible: los datos empiezan en la primera fila con un número de control
      inicioDatos = matriz.findIndex(f => (f || []).some(c => RE_ES_CONTROL.test(normalizarControl(c))));
      if (inicioDatos < 0) inicioDatos = 0;
      filaEnc = inicioDatos > 0 ? inicioDatos - 1 : -1;
      // Si la fila anterior no parece encabezado (sin texto), no la uses
      if (filaEnc >= 0 && !(matriz[filaEnc] || []).some(c => typeof c === 'string' && c.trim())) filaEnc = -1;
    }

    const datos = matriz.slice(inicioDatos);
    const ancho = Math.max(0, ...matriz.slice(Math.max(0, filaEnc), inicioDatos + 50).map(f => (f || []).length));
    const encabezados = filaEnc >= 0 ? matriz[filaEnc] : [];
    const columnas = [];
    for (let j = 0; j < ancho; j++) {
      const enc = String(encabezados[j] == null ? '' : encabezados[j]).replace(/\s+/g, ' ').trim();
      const tieneDatos = datos.some(f => f && f[j] !== '' && f[j] != null);
      if (!enc && !tieneDatos) continue;
      columnas.push({ idx: j, encabezado: enc, etiqueta: letraColumna(j) + (enc ? ' · ' + enc : '') });
    }
    return { filaEnc, inicioDatos, datos, columnas };
  }

  /** Propone qué columna corresponde a qué cosa. */
  function autoMapear(analisis, modelo) {
    const cols = analisis.columnas;
    const norm = c => normalizar(c.encabezado);
    const mapa = { control: null, nombre: null, indicadores: modelo.indicadores.map(() => null) };

    // No. de control: por encabezado o por contenido
    let c = cols.find(c => /CONTROL|MATRICULA|CTRL/.test(norm(c)));
    if (!c) {
      c = cols.find(c => {
        const muestra = analisis.datos.slice(0, 30).map(f => normalizarControl(f[c.idx])).filter(Boolean);
        return muestra.length && muestra.filter(v => RE_ES_CONTROL.test(v)).length / muestra.length > 0.6;
      });
    }
    if (c) mapa.control = c.idx;

    c = cols.find(c => /NOMBRE|ALUMNO|ESTUDIANTE/.test(norm(c)) && c.idx !== mapa.control);
    if (c) mapa.nombre = c.idx;

    const usadas = new Set([mapa.control, mapa.nombre]);
    const libres = () => cols.filter(c => !usadas.has(c.idx));

    // Indicadores: "1 - PROYECTO...", "1", "PROYECTO DE ASIGNATURA", "Indicador 1", "I1"
    modelo.indicadores.forEach((ind, i) => {
      const nombreInd = normalizar(ind.nombre);
      const prefijo = nombreInd.slice(0, Math.min(10, nombreInd.length));
      const cand = libres().find(c => {
        const h = norm(c);
        if (!h) return false;
        if (h === ind.num) return true;
        if (new RegExp('^' + ind.num + ' [A-Z]').test(h)) return true;
        if (new RegExp('^(INDICADOR|IND|I|COMPETENCIA|C) ?' + ind.num + '$').test(h)) return true;
        if (prefijo.length >= 5 && h.includes(prefijo)) return true;
        // "Proyecto", "Examen", "Trabajos": encabezado = inicio del nombre o misma primera palabra
        const sinNum = h.replace(/^\d+ /, '');
        if (sinNum.length >= 4 && nombreInd.startsWith(sinNum)) return true;
        const p1 = nombreInd.split(' ')[0];
        return p1.length >= 4 && sinNum.split(' ')[0] === p1;
      });
      if (cand) { mapa.indicadores[i] = cand.idx; usadas.add(cand.idx); }
    });

    // Si no se reconoció ningún indicador, buscar una sola columna de calificación
    if (mapa.indicadores.every(v => v == null)) {
      const unica = libres().find(c => /CALIF|FINAL|PROMEDIO|PARCIAL|NOTA|PUNTAJE|TOTAL/.test(norm(c)));
      if (unica) {
        mapa.indicadores = mapa.indicadores.map(() => unica.idx);
      } else {
        // Última opción: columnas numéricas en orden
        const numericas = libres().filter(c => {
          const vals = analisis.datos.slice(0, 30).map(f => f[c.idx]).filter(v => v !== '' && v != null);
          return vals.length && vals.every(v => evaluarValor(v, 0).ok);
        });
        if (numericas.length === modelo.indicadores.length) {
          mapa.indicadores = numericas.map(c => c.idx);
        } else if (numericas.length === 1) {
          mapa.indicadores = mapa.indicadores.map(() => numericas[0].idx);
        }
      }
    }
    return mapa;
  }

  /** Cruza el Excel con los alumnos del portal. */
  function cruzar(analisis, mapa, modelo) {
    const porControl = new Map();
    const porNombre = new Map();
    const duplicados = new Set();
    const filasExcel = [];

    analisis.datos.forEach((f, i) => {
      if (!f || f.every(v => v === '' || v == null)) return;
      const control = mapa.control != null ? normalizarControl(f[mapa.control]) : '';
      const nombre = mapa.nombre != null ? String(f[mapa.nombre] || '').trim() : '';
      if (!control && !nombre) return;
      const reg = { filaExcel: analisis.inicioDatos + i + 1, control, nombre, celdas: f, usado: false };
      filasExcel.push(reg);
      if (control) {
        if (porControl.has(control)) duplicados.add(control);
        porControl.set(control, reg);
      }
      if (nombre) porNombre.set(claveNombre(nombre), reg);
    });

    const resultado = modelo.alumnos.map(al => {
      let reg = al.control ? porControl.get(al.control) : null;
      let via = 'control';
      if (!reg && porNombre.size) { reg = porNombre.get(claveNombre(al.nombre)); via = 'nombre'; }
      if (!reg) return { al, reg: null, cambios: [], estado: 'sin-datos' };
      reg.usado = true;

      const cambios = modelo.indicadores.map((ind, i) => {
        const col = mapa.indicadores[i];
        const caja = al.cajas[i];
        if (col == null || !caja) return null;
        const crudo = reg.celdas[col];
        const ev = evaluarValor(crudo, modelo.calMin);
        if (ev.vacio) return null; // celda vacía: no se toca
        return { i, caja, antes: caja.value, despues: ev.valor, ok: ev.ok, error: ev.error, num: ev.num };
      });

      const hayError = cambios.some(c => c && !c.ok);
      const nums = al.cajas.map((caja, i) => {
        const c = cambios[i];
        if (c && c.ok) return c.num;
        return caja ? evaluarValor(caja.value, modelo.calMin).num : 0;
      });
      const finalNuevo = calcularFinal(nums, modelo.indicadores, modelo.calMin);
      const hayCambio = cambios.some(c => c && c.ok && c.despues !== String(c.antes).trim().toUpperCase());
      return {
        al, reg, via, cambios, finalNuevo,
        duplicado: al.control && duplicados.has(al.control),
        estado: hayError ? 'error' : (hayCambio ? 'cambia' : 'igual')
      };
    });

    const sobrantes = filasExcel.filter(r => !r.usado);
    return { resultado, sobrantes, duplicados };
  }

  /* ------------------------------------------------------------------------
     Plantilla Excel
     ------------------------------------------------------------------------ */
  function descargarPlantilla(modelo) {
    const encInd = modelo.indicadores.map(ind => ind.num + ' - ' + ind.nombre + ' (' + ind.peso + '%)');
    const aoa = [['Núm.', 'No. Control', 'Nombre'].concat(encInd)];
    modelo.alumnos.forEach(al => {
      const fila = [Number(al.num) || al.num, al.control, al.nombre];
      al.cajas.forEach(c => {
        const v = c ? c.value.trim() : '';
        fila.push(v === '' ? '' : (isNaN(+v) ? v : +v));
      });
      aoa.push(fila);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 38 }].concat(encInd.map(e => ({ wch: Math.max(12, Math.min(30, e.length)) })));
    ws['!autofilter'] = { ref: 'A1:' + letraColumna(aoa[0].length - 1) + aoa.length };

    const info = XLSX.utils.aoa_to_sheet([
      ['CONECT Mod Docentes - Plantilla de captura'],
      [],
      ['Grupo', modelo.grupo],
      ['Docente', modelo.docente],
      ['Parcial', modelo.parcial],
      ['Calificación mínima aprobatoria', modelo.calMin],
      [],
      ['Instrucciones'],
      ['1. Escribe la calificación (0 a 100) de cada indicador en la hoja "Calificaciones". También se acepta NC o NP.'],
      ['2. No cambies la columna "No. Control": con ella se identifica a cada alumno.'],
      ['3. Una celda vacía deja la calificación actual del portal sin cambios.'],
      ['4. Menores a la mínima aprobatoria se truncan; las demás se redondean (igual que el portal).'],
      ['5. En CONECT, abre la captura del parcial, sube este archivo, revisa la vista previa y presiona Guardar.']
    ]);
    info['!cols'] = [{ wch: 32 }, { wch: 60 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.utils.book_append_sheet(wb, info, 'Info');
    guardarLibro(wb, nombrePlantilla(modelo, 'basica_P' + modelo.parcial));
  }

  function nombrePlantilla(modelo, sufijo) {
    return 'Calificaciones_' + (modelo.claveGrupo || 'grupo').replace(/[^\w-]+/g, '') + '_' + sufijo + '.xlsx';
  }

  function guardarLibro(wb, nombre) {
    // En la app de Android (WebView) las descargas blob: no funcionan: se manda el archivo a la app
    if (window.CMODAndroid && typeof window.CMODAndroid.postMessage === 'function') {
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      window.CMODAndroid.postMessage(JSON.stringify({
        tipo: 'descargar',
        nombre,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64
      }));
      return;
    }
    XLSX.writeFile(wb, nombre);
  }

  /* ------------------------------------------------------------------------
     Plantilla mejorada (basada en la lista real de un docente)
     Hoja "Calificaciones": Equipo | No. Control | Nombre | y por cada parcial:
       PUNTOS MENOS | por indicador: actividades individuales, PROMEDIO (si hay
       varias) y PONDERADO | FINAL
     Encabezados en 3 filas (parcial / indicador / actividad); datos desde la 4.
     Hoja "Puntos extra": por parcial, una columna por criterio de evaluación
       (indicador) + OTRO + TOTAL EXTRA. Se suman solo a la FINAL (tope 100).
     Hojas "Asistencia" y "Segunda oportunidad" como en la lista original.
     ------------------------------------------------------------------------ */
  const RE_INDICADOR_ACTIVIDADES = /PRACTIC|TAREA|TRABAJO|EJERCIC|ACTIVIDAD/;
  const FILA_DATOS = 3; // índice 0 -> fila 4 de Excel
  const HOJA_EXTRA = 'Puntos extra';

  function nuevaHoja() {
    const ws = {};
    const merges = [];
    const cols = [];
    let maxR = 0;
    let maxC = 0;
    return {
      cols,
      put(r, c, v) {
        if (v == null || v === '') return;
        const a = XLSX.utils.encode_cell({ r, c });
        if (typeof v === 'object' && v.f) ws[a] = { t: 'n', f: v.f };
        else if (typeof v === 'number') ws[a] = { t: 'n', v };
        else ws[a] = { t: 's', v: String(v) };
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      },
      merge(r1, c1, r2, c2) {
        if (r1 !== r2 || c1 !== c2) merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
        maxR = Math.max(maxR, r2);
        maxC = Math.max(maxC, c2);
      },
      ancho(c, wch) { cols[c] = { wch }; },
      fin() {
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
        ws['!merges'] = merges;
        for (let i = 0; i < cols.length; i++) if (!cols[i]) cols[i] = { wch: 10 };
        ws['!cols'] = cols;
        return ws;
      }
    };
  }

  const celda = (r, c, abs) => (abs ? '$' : '') + letraColumna(c) + (abs ? '$' : '') + (r + 1);

  function columnasFijas(h, modelo) {
    ['Equipo', 'No. Control', 'Nombre'].forEach((t, c) => { h.put(0, c, t); h.merge(0, c, 2, c); });
    h.ancho(0, 8); h.ancho(1, 14); h.ancho(2, 36);
    modelo.alumnos.forEach((al, i) => { h.put(FILA_DATOS + i, 1, al.control); h.put(FILA_DATOS + i, 2, al.nombre); });
  }

  function descargarPlantillaMejorada(modelo) {
    const inds = modelo.indicadores;
    const n = modelo.alumnos.length;
    const ultima = FILA_DATOS + n - 1;
    const tituloInd = ind => ind.num + ' · ' + ind.nombre + ' (' + ind.peso + '%)';

    // --- Puntos extra (primero, para conocer la columna del total de cada parcial)
    const hx = nuevaHoja();
    columnasFijas(hx, modelo);
    const totalExtra = {};
    let c = 3;
    for (let p = 1; p <= 3; p++) {
      const ini = c;
      const criterios = inds.map(tituloInd).concat(['OTRO']);
      criterios.forEach(t => { hx.put(1, c, t); hx.put(2, c, 'pts'); hx.ancho(c, Math.max(10, Math.min(22, t.length))); c++; });
      totalExtra[p] = c;
      hx.put(1, c, 'TOTAL EXTRA'); hx.merge(1, c, 2, c); hx.ancho(c, 12);
      for (let r = FILA_DATOS; r <= ultima; r++) {
        const rango = celda(r, ini) + ':' + celda(r, c - 1);
        hx.put(r, c, { f: 'IF(COUNT(' + rango + ')=0,"",SUM(' + rango + '))' });
      }
      c++;
      hx.put(0, ini, 'PARCIAL ' + p); hx.merge(0, ini, 0, c - 1);
    }

    // --- Calificaciones
    const h = nuevaHoja();
    columnasFijas(h, modelo);
    c = 3;
    for (let p = 1; p <= 3; p++) {
      const ini = c;
      const menos = c;
      h.put(1, c, 'PUNTOS MENOS'); h.merge(1, c, 2, c); h.ancho(c, 9); c++;
      const ponderados = [];
      inds.forEach(ind => {
        const varias = RE_INDICADOR_ACTIVIDADES.test(normalizar(ind.nombre));
        const nAct = varias ? 6 : 1;
        const iniInd = c;
        for (let k = 1; k <= nAct; k++) { h.put(2, c, varias ? 'T' + k : 'Calificación'); h.ancho(c, varias ? 6 : 12); c++; }
        let prom = null;
        if (varias) { prom = c; h.put(2, c, 'PROMEDIO'); h.ancho(c, 10); c++; }
        const pond = c;
        h.put(2, c, 'PONDERADO ' + ind.peso + '%'); h.ancho(c, 13); c++;
        h.put(1, iniInd, tituloInd(ind)); h.merge(1, iniInd, 1, c - 1);
        for (let r = FILA_DATOS; r <= ultima; r++) {
          let fuente = celda(r, iniInd);
          if (varias) {
            const rango = celda(r, iniInd) + ':' + celda(r, prom - 1);
            h.put(r, prom, { f: 'IF(COUNT(' + rango + ')=0,"",AVERAGE(' + rango + '))' });
            fuente = celda(r, prom);
          }
          h.put(r, pond, { f: 'IF(' + fuente + '="","",' + fuente + '*' + ind.peso + '/100)' });
        }
        ponderados.push(pond);
      });
      const fin = c;
      h.put(1, c, 'FINAL'); h.merge(1, c, 2, c); h.ancho(c, 9); c++;
      const colTotal = letraColumna(totalExtra[p]);
      for (let r = FILA_DATOS; r <= ultima; r++) {
        const lista = ponderados.map(pc => celda(r, pc)).join(',');
        const extra = "SUMIF('" + HOJA_EXTRA + "'!$B:$B,$B" + (r + 1) + ",'" + HOJA_EXTRA + "'!" + colTotal + ':' + colTotal + ')';
        h.put(r, fin, { f: 'IF(COUNT(' + lista + ')=0,"",MIN(100,MAX(0,SUM(' + lista + ')-N(' + celda(r, menos) + ')+' + extra + ')))' });
      }
      h.put(0, ini, 'PARCIAL ' + p); h.merge(0, ini, 0, c - 1);
    }

    // --- Asistencia (1 = falta)
    const ha = nuevaHoja();
    ha.put(0, 0, 'ASISTENCIA (escribe la fecha arriba de cada sesión; 1 = falta)'); ha.merge(0, 0, 0, 2);
    ['Equipo', 'No. Control', 'Nombre'].forEach((t, i) => ha.put(1, i, t));
    ha.ancho(0, 8); ha.ancho(1, 14); ha.ancho(2, 36);
    const SESIONES = 40;
    for (let s = 0; s < SESIONES; s++) { ha.put(1, 3 + s, 'S' + (s + 1)); ha.ancho(3 + s, 6); }
    const colFaltas = 3 + SESIONES;
    ha.put(1, colFaltas, 'TOTAL FALTAS'); ha.ancho(colFaltas, 12);
    modelo.alumnos.forEach((al, i) => {
      const r = 2 + i;
      ha.put(r, 1, al.control); ha.put(r, 2, al.nombre);
      ha.put(r, colFaltas, { f: 'SUM(' + celda(r, 3) + ':' + celda(r, colFaltas - 1) + ')' });
    });

    // --- Segunda oportunidad
    const hs = nuevaHoja();
    ['No. Control', 'Nombre', 'Parcial 1', 'Parcial 2', 'Parcial 3'].forEach((t, i) => hs.put(0, i, t));
    hs.ancho(0, 14); hs.ancho(1, 36); hs.ancho(2, 10); hs.ancho(3, 10); hs.ancho(4, 10);
    modelo.alumnos.forEach((al, i) => { hs.put(1 + i, 0, al.control); hs.put(1 + i, 1, al.nombre); });

    // --- Info
    const info = XLSX.utils.aoa_to_sheet([
      ['CONECT Mod Docentes - Plantilla mejorada'],
      [],
      ['Grupo', modelo.grupo],
      ['Docente', modelo.docente],
      ['Indicadores', inds.map(tituloInd).join('  |  ')],
      ['Calificación mínima aprobatoria', modelo.calMin],
      [],
      ['Cómo usarla'],
      ['1. En "Calificaciones" captura cada trabajo por separado (T1, T2, ...). El PROMEDIO ignora las celdas vacías.'],
      ['2. ¿Más trabajos? Inserta columnas dentro del bloque del indicador (antes de PROMEDIO): la extensión las detecta sola.'],
      ['3. PUNTOS MENOS se restan y "Puntos extra" se suma, ambos solo sobre la calificación FINAL. La final nunca pasa de 100 ni baja de 0.'],
      ['4. No cambies la columna "No. Control": con ella se identifica a cada alumno.'],
      ['5. En CONECT abre la captura del parcial y sube este archivo: se lee el bloque del parcial que estás capturando.'],
      ['6. El portal guarda una calificación por indicador; para que su final coincida con la tuya, la extensión reparte'],
      ['   los puntos extra/menos entre los indicadores (ninguno pasa de 100). Revisa la vista previa antes de guardar.']
    ]);
    info['!cols'] = [{ wch: 30 }, { wch: 90 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, h.fin(), 'Calificaciones');
    XLSX.utils.book_append_sheet(wb, hx.fin(), HOJA_EXTRA);
    XLSX.utils.book_append_sheet(wb, ha.fin(), 'Asistencia');
    XLSX.utils.book_append_sheet(wb, hs.fin(), 'Segunda oportunidad');
    XLSX.utils.book_append_sheet(wb, info, 'Info');
    guardarLibro(wb, nombrePlantilla(modelo, 'mejorada'));
  }

  /* ---------------- Lectura de la plantilla mejorada ---------------- */
  function numeroCelda(v) {
    if (v === '' || v == null) return null;
    if (typeof v === 'number') return v;
    const s = String(v).trim().replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
  }

  /** Columnas [ini, fin] del bloque "PARCIAL p" (fila 1 de Excel). */
  function bloqueParcial(m, merges, p) {
    const fila = m[0] || [];
    const inicios = [];
    fila.forEach((v, c) => {
      const r = /^PARCIAL (\d)/.exec(normalizar(v));
      if (r) inicios.push({ c, p: +r[1] });
    });
    const b = inicios.find(x => x.p === +p);
    if (!b) return { hay: inicios.length > 0, ini: -1, fin: -1 };
    const mg = merges.find(g => g.s.r === 0 && g.s.c === b.c);
    const sig = inicios.find(x => x.c > b.c);
    const ancho = Math.max(...m.slice(0, 4).map(f => (f || []).length));
    return { hay: true, ini: b.c, fin: mg ? mg.e.c : (sig ? sig.c - 1 : ancho - 1) };
  }

  /** Texto del encabezado de grupo (fila 2 de Excel) que cubre la columna c. */
  function grupoColumna(m, merges, c) {
    const g = merges.find(x => x.s.r <= 1 && x.e.r >= 1 && x.s.c <= c && x.e.c >= c);
    return normalizar(g ? (m[g.s.r] || [])[g.s.c] : (m[1] || [])[c]);
  }

  function columnaPorEncabezado(m, re, hasta) {
    for (let r = 0; r < 3; r++) {
      const fila = m[r] || [];
      for (let c = 0; c < Math.min(fila.length, hasta); c++) if (re.test(normalizar(fila[c]))) return c;
    }
    return -1;
  }

  /**
   * Reparte un ajuste entre los indicadores para que la calificación del
   * portal sea "objetivo" (ya limitado a 0-100). Ningún indicador pasa de 100.
   * Devuelve calificaciones enteras ya redondeadas como lo hace el portal.
   */
  function ajustarIndicadores(vals, pesos, objetivo, calMin) {
    const lim = v => Math.min(100, Math.max(0, v));
    const f = d => vals.reduce((a, v, i) => a + (pesos[i] / 100) * lim(v + d), 0);
    let lo = -100;
    let hi = 100;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < objetivo) lo = mid; else hi = mid;
    }
    const res = vals.map(v => evaluarValor(Math.round(lim(v + hi) * 1e6) / 1e6, calMin).num);
    const o = Math.round(objetivo * 1e6) / 1e6;
    const esperado = o < calMin ? Math.trunc(o) : Math.round(o);
    const inds = pesos.map(peso => ({ peso }));
    const orden = pesos.map((_, i) => i).sort((a, b) => pesos[b] - pesos[a]);
    for (let k = 0; k < 400; k++) {
      const fin = calcularFinal(res, inds, calMin);
      if (fin === esperado) break;
      const i = fin < esperado ? orden.find(j => res[j] < 100) : orden.find(j => res[j] > 0);
      if (i == null) break;
      res[i] += fin < esperado ? 1 : -1;
    }
    return res;
  }

  /**
   * Si el libro es una plantilla mejorada, devuelve un "análisis" ya resuelto
   * para el parcial que se está capturando: [No. Control, Nombre, ind1..indN].
   */
  function leerPlantillaMejorada(libro, modelo) {
    const ws = libro.Sheets.Calificaciones;
    if (!ws) return null;
    const m = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    const merges = ws['!merges'] || [];
    const b = bloqueParcial(m, merges, modelo.parcial);
    if (!b.hay) return null;
    if (b.ini < 0) throw new Error('La plantilla no tiene un bloque "PARCIAL ' + modelo.parcial + '".');

    const colCtrl = columnaPorEncabezado(m, /CONTROL/, b.ini);
    const colNom = columnaPorEncabezado(m, /NOMBRE/, b.ini);
    if (colCtrl < 0) throw new Error('No se encontró la columna "No. Control" en la hoja Calificaciones.');

    const inds = modelo.indicadores;
    const actividades = inds.map(() => []);
    let colMenos = -1;
    for (let c = b.ini; c <= b.fin; c++) {
      const g = grupoColumna(m, merges, c);
      const etq = normalizar((m[2] || [])[c]);
      if (!g) continue;
      if (/^PUNTOS MENOS/.test(g)) { colMenos = c; continue; }
      if (/^FINAL/.test(g) || /^PROMEDIO|^PONDERADO/.test(etq)) continue;
      const num = /^(\d+)/.exec(g);
      let i = num ? inds.findIndex(ind => ind.num === num[1]) : -1;
      if (i < 0) i = inds.findIndex(ind => g.includes(normalizar(ind.nombre).slice(0, 10)));
      if (i >= 0) actividades[i].push(c);
    }
    const faltan = inds.filter((_, i) => !actividades[i].length).map(ind => ind.num + '-' + ind.nombre);

    // Puntos extra del mismo parcial, por número de control
    const extras = new Map();
    const nombreExtra = libro.SheetNames.find(n => /EXTRA/.test(normalizar(n)));
    if (nombreExtra) {
      const wx = libro.Sheets[nombreExtra];
      const mx = XLSX.utils.sheet_to_json(wx, { header: 1, raw: true, defval: '' });
      const gx = wx['!merges'] || [];
      const bx = bloqueParcial(mx, gx, modelo.parcial);
      const cx = columnaPorEncabezado(mx, /CONTROL/, bx.ini < 0 ? 3 : bx.ini);
      if (bx.ini >= 0 && cx >= 0) {
        const cols = [];
        for (let c = bx.ini; c <= bx.fin; c++) if (!/^TOTAL/.test(grupoColumna(mx, gx, c))) cols.push(c);
        mx.slice(FILA_DATOS).forEach(f => {
          const ctrl = normalizarControl(f[cx]);
          if (!ctrl) return;
          const s = cols.reduce((a, c) => a + (numeroCelda(f[c]) || 0), 0);
          if (s) extras.set(ctrl, (extras.get(ctrl) || 0) + s);
        });
      }
    }

    const porControl = new Map(modelo.alumnos.map(al => [al.control, al]));
    const pesos = inds.map(ind => ind.peso);
    const notas = new Map();
    const datos = [];
    let fuera = 0;
    m.slice(FILA_DATOS).forEach(f => {
      const ctrl = normalizarControl(f[colCtrl]);
      const nombre = colNom >= 0 ? String(f[colNom] || '').trim() : '';
      if (!ctrl) { datos.push([]); return; }
      const vals = inds.map((ind, i) => {
        const nums = actividades[i].map(c => numeroCelda(f[c])).filter(v => v != null);
        const validos = nums.filter(v => v >= 0 && v <= 100);
        fuera += nums.length - validos.length;
        return validos.length ? validos.reduce((a, v) => a + v, 0) / validos.length : null;
      });
      const menos = colMenos >= 0 ? Math.max(0, numeroCelda(f[colMenos]) || 0) : 0;
      const extra = extras.get(ctrl) || 0;
      if (vals.every(v => v == null)) { datos.push([ctrl, nombre]); return; }
      // Indicadores sin trabajos capturados: se toma lo que ya tiene el portal
      const al = porControl.get(ctrl);
      const base = vals.map((v, i) => (v != null ? v : (al && al.cajas[i] ? evaluarValor(al.cajas[i].value, modelo.calMin).num : 0)));
      const finalExcel = base.reduce((a, v, i) => a + (pesos[i] / 100) * v, 0);
      const objetivo = Math.min(100, Math.max(0, finalExcel - menos + extra));
      const res = ajustarIndicadores(base, pesos, objetivo, modelo.calMin);
      notas.set(ctrl, { finalExcel, menos, extra, objetivo, tope: finalExcel - menos + extra > 100 });
      datos.push([ctrl, nombre].concat(res.map(String)));
    });

    const columnas = [{ idx: 0, encabezado: 'No. Control', etiqueta: 'No. Control' }, { idx: 1, encabezado: 'Nombre', etiqueta: 'Nombre' }]
      .concat(inds.map((ind, i) => ({ idx: 2 + i, encabezado: ind.nombre, etiqueta: ind.num + ' · ' + ind.nombre })));
    const avisos = [];
    if (faltan.length) avisos.push('Sin columnas de trabajos para: ' + faltan.join(', ') + ' (se conserva lo que tiene el portal).');
    if (fuera) avisos.push(fuera + ' valor(es) fuera de 0-100 se ignoraron.');
    if (extras.size) avisos.push(extras.size + ' alumno(s) con puntos extra.');
    return {
      analisis: { filaEnc: 2, inicioDatos: FILA_DATOS, datos, columnas, notas, mejorada: true },
      mapa: { control: 0, nombre: 1, indicadores: inds.map((_, i) => 2 + i) },
      avisos
    };
  }

  /* ------------------------------------------------------------------------
     Panel
     ------------------------------------------------------------------------ */
  function construirPanel(modelo) {
    const ui = {};
    let libro = null;
    let analisis = null;
    let mapa = null;
    let cruce = null;

    const chip = (t, cls) => el('span', { class: 'cdoc-chip' + (cls ? ' ' + cls : ''), text: t });

    ui.archivo = el('input', { type: 'file', accept: '.xlsx,.xls,.xlsm,.ods,.csv,.txt', class: 'cdoc-oculto', id: 'cdoc-archivo' });
    ui.zona = el('label', { class: 'cdoc-zona', for: 'cdoc-archivo' }, [
      el('strong', { text: 'Selecciona o arrastra tu archivo Excel' }),
      el('span', { text: '.xlsx, .xls, .ods o .csv · se lee solo en tu navegador' })
    ]);
    ui.nombreArchivo = el('div', { class: 'cdoc-nota' });
    ui.mapeo = el('div', { class: 'cdoc-mapeo cdoc-oculto' });
    ui.resumen = el('div', { class: 'cdoc-resumen cdoc-oculto' });
    ui.vista = el('div', { class: 'cdoc-vista cdoc-oculto' });
    ui.acciones = el('div', { class: 'cdoc-acciones cdoc-oculto' });
    ui.mensaje = el('div', { class: 'cdoc-mensaje', role: 'status', 'aria-live': 'polite' });
    ui.reloj = chip('Sesión: 18:00', 'cdoc-chip-reloj');

    const panel = el('section', { class: 'cdoc-panel', 'aria-label': 'Captura desde Excel' }, [
      el('div', { class: 'cdoc-cab' }, [
        el('div', {}, [
          el('div', { class: 'cdoc-titulo', text: 'Captura desde Excel' }),
          el('div', { class: 'cdoc-sub', text: (modelo.grupo || 'Grupo') + ' · Parcial ' + modelo.parcial })
        ]),
        el('div', { class: 'cdoc-chips' }, [
          chip(modelo.alumnos.length + ' alumnos'),
          chip(modelo.indicadores.length + ' indicadores'),
          chip('Mínima ' + modelo.calMin),
          ui.reloj
        ])
      ]),
      el('ol', { class: 'cdoc-pasos' }, [
        el('li', {}, [
          el('div', { class: 'cdoc-paso-tit', text: 'Descarga una plantilla (opcional)' }),
          el('div', { class: 'cdoc-nota', text: 'Ambas vienen con la lista del grupo ya llenada. También puedes usar tu propio Excel con una columna de número de control.' }),
          el('div', { class: 'cdoc-plantillas' }, [
            el('div', { class: 'cdoc-plantilla' }, [
              el('b', { text: 'Básica' }),
              el('span', { text: 'Una columna por indicador, con las calificaciones actuales del portal.' }),
              el('button', { type: 'button', class: 'cdoc-btn cdoc-btn-sec', onclick: () => {
                try { descargarPlantilla(modelo); } catch (err) { avisar('No se pudo generar la plantilla: ' + err.message, 'error'); }
              } }, 'Descargar básica')
            ]),
            el('div', { class: 'cdoc-plantilla cdoc-plantilla-destacada' }, [
              el('b', { text: 'Mejorada' }),
              el('span', { text: 'Los 3 parciales, cada trabajo por separado, puntos menos, hoja de puntos extra (tope 100), asistencia y segunda oportunidad.' }),
              el('button', { type: 'button', class: 'cdoc-btn', onclick: () => {
                try { descargarPlantillaMejorada(modelo); } catch (err) { avisar('No se pudo generar la plantilla: ' + err.message, 'error'); }
              } }, 'Descargar mejorada')
            ])
          ])
        ]),
        el('li', {}, [
          el('div', { class: 'cdoc-paso-tit', text: 'Sube el archivo' }),
          ui.archivo, ui.zona, ui.nombreArchivo, ui.mapeo
        ]),
        el('li', {}, [
          el('div', { class: 'cdoc-paso-tit', text: 'Revisa y aplica' }),
          el('div', { class: 'cdoc-nota', text: 'Nada se guarda hasta que presiones Guardar. Las celdas vacías no modifican la calificación actual.' }),
          ui.resumen, ui.vista, ui.acciones
        ])
      ]),
      ui.mensaje
    ]);

    // Ubicar el panel al inicio del formulario
    modelo.form.insertBefore(panel, modelo.form.firstChild);

    function avisar(t, tipo) {
      ui.mensaje.textContent = t;
      ui.mensaje.className = 'cdoc-mensaje' + (tipo ? ' cdoc-' + tipo : '');
    }

    // Reloj de sesión
    const tic = () => {
      const resta = Math.max(0, TIEMPO_SESION_MS - (Date.now() - estado.inicio));
      const m = Math.floor(resta / 60000), s = Math.floor((resta % 60000) / 1000);
      ui.reloj.textContent = 'Sesión ' + m + ':' + String(s).padStart(2, '0');
      ui.reloj.classList.toggle('cdoc-chip-alerta', resta < 3 * 60000);
      ui.reloj.title = 'El portal autoguarda a los 18 minutos de abrir la captura. Guarda antes para no perder cambios.';
    };
    tic();
    setInterval(tic, 1000);

    // Arrastrar y soltar
    ['dragenter', 'dragover'].forEach(ev => ui.zona.addEventListener(ev, e => { e.preventDefault(); ui.zona.classList.add('cdoc-sobre'); }));
    ['dragleave', 'drop'].forEach(ev => ui.zona.addEventListener(ev, e => { e.preventDefault(); ui.zona.classList.remove('cdoc-sobre'); }));
    ui.zona.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) cargarArchivo(f);
    });
    ui.archivo.addEventListener('change', () => {
      const f = ui.archivo.files && ui.archivo.files[0];
      if (f) cargarArchivo(f);
      ui.archivo.value = '';
    });

    function cargarArchivo(archivo) {
      avisar('Leyendo ' + archivo.name + '\u2026');
      const lector = new FileReader();
      lector.onerror = () => avisar('No se pudo leer el archivo.', 'error');
      lector.onload = () => {
        try {
          libro = leerLibro(new Uint8Array(lector.result));
          ui.nombreArchivo.textContent = 'Archivo: ' + archivo.name;
          // ¿Plantilla mejorada? Se lee por su estructura (bloques por parcial)
          const mej = leerPlantillaMejorada(libro, modelo);
          if (mej) {
            analisis = mej.analisis;
            mapa = mej.mapa;
            ui.mapeo.textContent = '';
            ui.mapeo.classList.remove('cdoc-oculto');
            ui.mapeo.appendChild(el('div', { class: 'cdoc-aviso-mejorada' }, [
              el('b', { text: 'Plantilla mejorada · Parcial ' + modelo.parcial }),
              el('span', { text: ' Se promediaron los trabajos de cada indicador y se aplicaron puntos menos y extra sobre la final (máximo 100).' }),
              mej.avisos.length ? el('div', { class: 'cdoc-nota', text: mej.avisos.join(' ') }) : null
            ]));
            actualizarVista();
            avisar('');
            return;
          }
          // Elegir la hoja "Calificaciones" si existe, si no la primera con datos
          const hoja = libro.SheetNames.find(n => /calif/i.test(n)) || libro.SheetNames[0];
          seleccionarHoja(hoja);
          avisar('');
        } catch (err) {
          console.error('[CONECT Mod Docentes]', err);
          avisar('No se pudo interpretar el archivo: ' + err.message, 'error');
        }
      };
      lector.readAsArrayBuffer(archivo);
    }

    function seleccionarHoja(nombre) {
      analisis = analizarMatriz(hojaAMatriz(libro, nombre));
      mapa = autoMapear(analisis, modelo);
      dibujarMapeo(nombre);
      actualizarVista();
    }

    function selectColumnas(valor, alCambiar, textoVacio) {
      const s = el('select', { class: 'cdoc-select' });
      s.appendChild(el('option', { value: '' }, textoVacio));
      analisis.columnas.forEach(c => s.appendChild(el('option', { value: String(c.idx) }, c.etiqueta)));
      s.value = valor == null ? '' : String(valor);
      s.addEventListener('change', () => alCambiar(s.value === '' ? null : +s.value));
      return s;
    }

    function dibujarMapeo(hojaActual) {
      ui.mapeo.textContent = '';
      ui.mapeo.classList.remove('cdoc-oculto');

      const filas = [];
      if (libro.SheetNames.length > 1) {
        const s = el('select', { class: 'cdoc-select' }, libro.SheetNames.map(n => el('option', { value: n }, n)));
        s.value = hojaActual;
        s.addEventListener('change', () => seleccionarHoja(s.value));
        filas.push(['Hoja', s]);
      }
      filas.push(['No. de control', selectColumnas(mapa.control, v => { mapa.control = v; actualizarVista(); }, '\u2014 ninguna \u2014')]);
      filas.push(['Nombre (respaldo)', selectColumnas(mapa.nombre, v => { mapa.nombre = v; actualizarVista(); }, '\u2014 ninguna \u2014')]);

      const selectsInd = modelo.indicadores.map((ind, i) => {
        const s = selectColumnas(mapa.indicadores[i], v => { mapa.indicadores[i] = v; actualizarVista(); }, '\u2014 no cambiar \u2014');
        filas.push([ind.num + ' · ' + ind.nombre + ' (' + ind.peso + '%)', s]);
        return s;
      });

      const todos = selectColumnas(null, v => {
        if (v == null) return;
        mapa.indicadores = mapa.indicadores.map(() => v);
        selectsInd.forEach(s => { s.value = String(v); });
        todos.value = '';
        actualizarVista();
      }, 'Elegir\u2026');

      const tabla = el('div', { class: 'cdoc-grid' });
      filas.forEach(([etq, ctl]) => { tabla.appendChild(el('label', { class: 'cdoc-etq' }, etq)); tabla.appendChild(ctl); });
      tabla.appendChild(el('span', { class: 'cdoc-etq cdoc-etq-suave' }, 'Misma columna para todos los indicadores'));
      tabla.appendChild(todos);

      ui.mapeo.appendChild(el('div', { class: 'cdoc-nota' },
        'Columnas detectadas automáticamente' + (analisis.filaEnc >= 0 ? ' (encabezados en la fila ' + (analisis.filaEnc + 1) + ')' : ' (sin fila de encabezados)') + '. Ajusta si algo no coincide.'));
      ui.mapeo.appendChild(tabla);
    }

    function actualizarVista() {
      if (!analisis) return;
      if (mapa.control == null && mapa.nombre == null) {
        cruce = null;
        ui.resumen.classList.remove('cdoc-oculto');
        ui.resumen.textContent = 'Elige la columna con el número de control (o el nombre) para identificar a los alumnos.';
        ui.vista.classList.add('cdoc-oculto');
        ui.acciones.classList.add('cdoc-oculto');
        return;
      }
      cruce = cruzar(analisis, mapa, modelo);
      const r = cruce.resultado;
      const n = {
        cambia: r.filter(x => x.estado === 'cambia').length,
        igual: r.filter(x => x.estado === 'igual').length,
        error: r.filter(x => x.estado === 'error').length,
        sinDatos: r.filter(x => x.estado === 'sin-datos').length,
        porNombre: r.filter(x => x.reg && x.via === 'nombre').length
      };

      ui.resumen.textContent = '';
      ui.resumen.classList.remove('cdoc-oculto');
      ui.resumen.append(
        chip(n.cambia + ' con cambios', 'cdoc-chip-ok'),
        chip(n.igual + ' sin cambios'),
        n.error ? chip(n.error + ' con valores inválidos', 'cdoc-chip-error') : '',
        n.sinDatos ? chip(n.sinDatos + ' no están en el Excel', 'cdoc-chip-aviso') : '',
        cruce.sobrantes.length ? chip(cruce.sobrantes.length + ' filas del Excel sin alumno', 'cdoc-chip-aviso') : '',
        n.porNombre ? chip(n.porNombre + ' identificados por nombre', 'cdoc-chip-aviso') : '',
        cruce.duplicados.size ? chip(cruce.duplicados.size + ' controles duplicados', 'cdoc-chip-error') : ''
      );

      // Tabla de vista previa
      const thead = el('tr', {}, [
        el('th', { text: '#' }), el('th', { text: 'No. Control' }), el('th', { text: 'Nombre' }),
        ...modelo.indicadores.map(ind => el('th', { title: ind.nombre, text: ind.num + ' (' + ind.peso + '%)' })),
        el('th', { text: 'Calif.' }),
        analisis.notas ? el('th', { title: 'Final calculada en tu Excel y ajustes aplicados', text: 'Excel' }) : null
      ]);
      const fmt = v => String(Math.round(v * 100) / 100);
      const cuerpo = r.map(x => {
        const tr = el('tr', { class: 'cdoc-fila-' + x.estado });
        tr.append(
          el('td', { text: x.al.num }),
          el('td', { class: 'cdoc-mono', text: x.al.control }),
          el('td', { text: x.al.nombre, title: x.reg ? ('Fila ' + x.reg.filaExcel + ' del Excel' + (x.via === 'nombre' ? ' (por nombre)' : '')) : 'No se encontró en el Excel' })
        );
        modelo.indicadores.forEach((ind, i) => {
          const c = x.cambios[i];
          const actual = x.al.cajas[i] ? x.al.cajas[i].value : '';
          if (!c) { tr.appendChild(el('td', { class: 'cdoc-sin', text: actual || '·' })); return; }
          if (!c.ok) { tr.appendChild(el('td', { class: 'cdoc-err', title: c.error, text: c.despues || '?' })); return; }
          const cambia = c.despues !== String(c.antes).trim().toUpperCase();
          tr.appendChild(el('td', { class: cambia ? 'cdoc-nuevo' : '' }, cambia
            ? [el('s', { text: c.antes || '\u2013' }), ' ', el('b', { text: c.despues })]
            : c.despues));
        });
        const finalAnt = x.al.finalInput ? x.al.finalInput.value : '';
        if (x.reg) {
          tr.appendChild(el('td', { class: (x.finalNuevo < modelo.calMin ? 'cdoc-rep ' : '') + (String(x.finalNuevo) !== finalAnt ? 'cdoc-nuevo' : '') },
            String(x.finalNuevo) !== finalAnt ? [el('s', { text: finalAnt || '\u2013' }), ' ', el('b', { text: String(x.finalNuevo) })] : String(x.finalNuevo)));
        } else {
          tr.appendChild(el('td', { class: 'cdoc-sin', text: finalAnt }));
        }
        if (analisis.notas) {
          const nt = x.reg ? analisis.notas.get(x.reg.control) : null;
          tr.appendChild(nt
            ? el('td', { class: 'cdoc-ajuste', title: 'Final del Excel ' + fmt(nt.finalExcel) + (nt.menos ? ', menos ' + fmt(nt.menos) : '') + (nt.extra ? ', extra ' + fmt(nt.extra) : '') + (nt.tope ? ' (limitada a 100)' : '') }, [
              fmt(nt.finalExcel),
              nt.menos ? el('span', { class: 'cdoc-menos', text: ' \u2212' + fmt(nt.menos) }) : null,
              nt.extra ? el('span', { class: 'cdoc-extra', text: ' +' + fmt(nt.extra) }) : null,
              nt.tope ? el('span', { class: 'cdoc-tope', text: ' \u2192 100' }) : null
            ])
            : el('td', { class: 'cdoc-sin', text: '·' }));
        }
        return tr;
      });
      const tabla = el('table', { class: 'cdoc-tabla' }, [el('thead', {}, thead), el('tbody', {}, cuerpo)]);
      ui.vista.textContent = '';
      ui.vista.classList.remove('cdoc-oculto');
      ui.vista.appendChild(tabla);

      if (cruce.sobrantes.length) {
        ui.vista.appendChild(el('div', { class: 'cdoc-nota cdoc-sobrantes' },
          'Filas del Excel que no coinciden con ningún alumno: ' +
          cruce.sobrantes.slice(0, 15).map(s => 'fila ' + s.filaExcel + ' (' + (s.control || s.nombre) + ')').join(', ') +
          (cruce.sobrantes.length > 15 ? '\u2026' : '')));
      }

      ui.acciones.textContent = '';
      ui.acciones.classList.remove('cdoc-oculto');
      const total = r.reduce((a, x) => a + x.cambios.filter(c => c && c.ok).length, 0);
      ui.acciones.append(
        el('button', { type: 'button', class: 'cdoc-btn', disabled: total ? null : true, onclick: () => aplicar(false) }, 'Aplicar al formulario'),
        el('button', { type: 'button', class: 'cdoc-btn cdoc-btn-guardar', disabled: total ? null : true, onclick: () => aplicar(true) }, 'Aplicar y guardar en CONECT')
      );
      if (n.error) ui.acciones.appendChild(el('span', { class: 'cdoc-nota', text: 'Los valores inválidos se omiten.' }));
    }

    function aplicar(guardar) {
      if (!cruce) return;
      let aplicadas = 0;
      $$('.cdoc-cambiado', modelo.form).forEach(c => c.classList.remove('cdoc-cambiado'));
      cruce.resultado.forEach(x => {
        let toco = false;
        x.cambios.forEach(c => {
          if (!c || !c.ok) return;
          if (c.caja.value !== c.despues) {
            c.caja.value = c.despues;
            c.caja.classList.add('cdoc-cambiado');
            aplicadas++;
            toco = true;
          }
          c.caja.classList.remove('cdoc-invalido');
        });
        if (toco) recalcularFila(modelo, x.al);
      });
      if (aplicadas) estado.sucio = true;
      actualizarVista();

      if (!guardar) {
        avisar(aplicadas
          ? 'Se aplicaron ' + aplicadas + ' calificaciones (resaltadas en amarillo). Revisa y presiona "Guardar".'
          : 'El formulario ya tenía esas calificaciones.', 'ok');
        const primera = $('.cdoc-cambiado', modelo.form);
        if (primera) primera.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      const total = cruce.resultado.filter(x => x.reg).length;
      if (!window.confirm('Se guardarán en CONECT las calificaciones del grupo ' + (modelo.claveGrupo || '') +
        ' (parcial ' + modelo.parcial + ').\n\n' + aplicadas + ' calificaciones modificadas, ' + total + ' alumnos encontrados en el Excel.\n\n¿Continuar?')) {
        avisar('Se aplicaron los cambios al formulario pero no se guardaron. Presiona "Guardar" cuando estés listo.', 'ok');
        return;
      }
      const boton = $$('input[type=submit]', modelo.form)[0];
      if (modelo.form.requestSubmit) modelo.form.requestSubmit(boton || undefined);
      else if (boton) boton.click();
      else modelo.form.submit();
    }
  }

  /* ------------------------------------------------------------------------
     Estilos
     ------------------------------------------------------------------------ */
  const CSS = `
.cdoc-panel{--p:var(--cm-primario,#1b396a);--p2:var(--cm-primario-hover,#132a4f);--ps:var(--cm-primario-suave,#e8eef8);--ac:var(--cm-acento,#8a2036);--b:var(--cm-borde,#dfe5ee);--t:var(--cm-texto,#1a2433);--ts:var(--cm-texto-suave,#4b5768);--ok:var(--cm-exito,#17784a);--okf:var(--cm-exito-fondo,#e4f4ec);--er:var(--cm-peligro,#b42318);--erf:var(--cm-peligro-fondo,#fdeceb);--av:var(--cm-aviso,#8f5200);--avf:var(--cm-aviso-fondo,#fff2dc);--sup:var(--cm-superficie,#fff);--sup2:var(--cm-superficie-2,#f8fafc);--enc:var(--cm-encabezado-tabla,#eef2f7);
  font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--t);background:var(--sup);border:1px solid var(--b);border-radius:12px;
  box-shadow:0 1px 3px rgba(16,24,40,.08);max-width:860px;margin:4px auto 18px;padding:16px 18px;text-align:left;box-sizing:border-box}
.cdoc-panel *{box-sizing:border-box}
.cdoc-cab{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--b);padding-bottom:12px;margin-bottom:6px}
.cdoc-titulo{font-size:18px;font-weight:700;color:var(--p)}
.cdoc-sub{color:var(--ts);font-size:13px}
.cdoc-chips,.cdoc-resumen{display:flex;flex-wrap:wrap;gap:6px}
.cdoc-resumen{margin:8px 0}
.cdoc-chip{display:inline-block;padding:2px 10px;border-radius:999px;background:var(--cm-neutro-fondo,#edf0f4);color:var(--cm-neutro,#36424f);font-size:12px;font-weight:600;white-space:nowrap}
.cdoc-chip-ok{background:var(--okf);color:var(--ok)}
.cdoc-chip-error{background:var(--erf);color:var(--er)}
.cdoc-chip-aviso{background:var(--avf);color:var(--av)}
.cdoc-chip-reloj{background:var(--ps);color:var(--p);font-variant-numeric:tabular-nums}
.cdoc-chip-alerta{background:var(--erf);color:var(--er)}
.cdoc-pasos{margin:0;padding:0 0 0 22px}
.cdoc-pasos>li{padding:10px 0;border-bottom:1px dashed var(--b)}
.cdoc-pasos>li:last-child{border-bottom:0}
.cdoc-pasos>li::marker{color:var(--p);font-weight:700}
.cdoc-paso-tit{font-weight:700;margin-bottom:2px}
.cdoc-nota{color:var(--ts);font-size:12.5px;margin:2px 0 8px}
.cdoc-oculto{display:none!important}
.cdoc-zona{display:flex;flex-direction:column;align-items:center;gap:2px;padding:18px;border:2px dashed var(--b);border-radius:10px;background:var(--sup2);cursor:pointer;text-align:center;color:var(--t)}
.cdoc-zona span{color:var(--ts);font-size:12.5px}
.cdoc-zona:hover,.cdoc-sobre{border-color:var(--p);background:var(--ps)}
.cdoc-btn{font:inherit;font-weight:600;border:1px solid var(--p);background:var(--p);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;margin:2px 6px 2px 0}
.cdoc-btn:hover{background:var(--p2)}
.cdoc-btn:disabled{opacity:.45;cursor:not-allowed}
.cdoc-btn-sec{background:transparent;color:var(--p)}
.cdoc-plantillas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:4px}
.cdoc-plantilla{display:flex;flex-direction:column;gap:4px;border:1px solid var(--b);border-radius:10px;padding:12px}
.cdoc-plantilla span{color:var(--ts);font-size:12.5px;flex:1}
.cdoc-plantilla .cdoc-btn{align-self:flex-start;margin-top:6px}
.cdoc-plantilla-destacada{border-color:var(--p);background:var(--ps)}
.cdoc-aviso-mejorada{border:1px solid var(--p);background:var(--ps);border-radius:10px;padding:10px 12px;font-size:13px}
.cdoc-ajuste{font-variant-numeric:tabular-nums;color:var(--ts)}
.cdoc-extra{color:var(--ok);font-weight:700}
.cdoc-menos{color:var(--er);font-weight:700}
.cdoc-tope{color:var(--av);font-weight:700}
.cdoc-btn-sec:hover{background:var(--ps)}
.cdoc-btn-guardar{background:var(--ac);border-color:var(--ac)}
.cdoc-btn-guardar:hover{background:#6e1a2b}
.cdoc-btn:focus-visible,.cdoc-select:focus-visible,.cdoc-zona:focus-within{outline:3px solid rgba(29,79,158,.35);outline-offset:2px}
.cdoc-grid{display:grid;grid-template-columns:minmax(160px,1fr) minmax(180px,1.4fr);gap:6px 12px;align-items:center}
@media (max-width:560px){.cdoc-grid{grid-template-columns:1fr}}
.cdoc-etq{font-size:13px;font-weight:600}
.cdoc-etq-suave{font-weight:400;color:var(--ts)}
.cdoc-select{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--b);border-radius:7px;background:var(--sup);color:var(--t);width:100%}
.cdoc-vista{max-height:380px;overflow:auto;border:1px solid var(--b);border-radius:8px;margin:6px 0}
.cdoc-tabla{border-collapse:collapse;width:100%;font-size:12.5px}
.cdoc-tabla th{position:sticky;top:0;background:var(--enc);color:var(--t);text-align:left;padding:6px 8px;border-bottom:1px solid var(--b);white-space:nowrap}
.cdoc-tabla td{padding:4px 8px;border-bottom:1px solid var(--b);white-space:nowrap}
.cdoc-tabla td:nth-child(3){white-space:normal;min-width:160px}
.cdoc-tabla s{color:#98a2b3}
.cdoc-mono{font-family:ui-monospace,Consolas,monospace}
.cdoc-nuevo b{color:var(--ok)}
.cdoc-rep b,.cdoc-rep{color:var(--er)}
.cdoc-err{background:var(--erf);color:var(--er);font-weight:700}
.cdoc-sin{color:#98a2b3}
.cdoc-fila-sin-datos td{background:var(--avf)}
.cdoc-fila-error td:first-child{box-shadow:inset 3px 0 var(--er)}
.cdoc-fila-cambia td:first-child{box-shadow:inset 3px 0 var(--ok)}
.cdoc-sobrantes{color:var(--av);padding:6px 8px}
.cdoc-acciones{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-top:6px}
.cdoc-mensaje:empty{display:none}
.cdoc-mensaje{margin-top:10px;padding:8px 12px;border-radius:8px;background:var(--ps);color:var(--p);font-weight:600}
.cdoc-mensaje.cdoc-ok{background:var(--okf);color:var(--ok)}
.cdoc-mensaje.cdoc-error{background:var(--erf);color:var(--er)}
input.cdoc-caja{text-align:center;border:1px solid #c5cedb;border-radius:4px;padding:2px}
input.cdoc-caja:focus{outline:2px solid #1d4f9e;border-color:#1d4f9e}
input.cdoc-cambiado{background:#fff4c2!important}
input.cdoc-invalido{background:#fdeceb!important;border-color:#b42318!important;color:#b42318}
input.cdoc-reprobado{color:#b42318!important;font-weight:700}
html[data-cdoc-tema="dark"] .cdoc-btn-sec{color:var(--cm-enlace,#9cbcf0);border-color:var(--b)}
html[data-cdoc-tema="dark"] input.cdoc-cambiado{background:#4a3b0a!important;color:#fff}
`;

  function inyectarEstilos() {
    if ($('#cdoc-estilos')) return;
    const st = el('style', { id: 'cdoc-estilos' });
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */
  function iniciar() {
    const campos = $$('input[name]').filter(i => RE_CAMPO.test(i.name));
    if (!campos.length || !campos[0].form) return;
    try {
      const modelo = leerModelo(campos[0].form, campos);
      if (!modelo.alumnos.length) return;
      inyectarEstilos();
      repararFormulario(modelo);
      construirPanel(modelo);
      window.CDOC = { modelo, evaluarValor, calcularFinal }; // para depuración desde consola
    } catch (err) {
      console.error('[CONECT Mod Docentes] No se pudo iniciar:', err);
    }
  }

  // Exponer funciones puras para pruebas (Node)
  if (EN_NODE) {
    module.exports = { evaluarValor, calcularFinal, normalizarControl, claveNombre, analizarMatriz, autoMapear, cruzar, descargarPlantillaMejorada, leerPlantillaMejorada, ajustarIndicadores };
    return;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
