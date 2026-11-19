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
