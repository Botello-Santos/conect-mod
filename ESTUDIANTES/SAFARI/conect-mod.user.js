// ==UserScript==
// @name         CONECT Mod - Portal Escolar ITSPR
// @namespace    https://purisima.tecnm.mx/conect/
// @version      1.3.1
// @description  Rediseño moderno, responsivo y con modo oscuro para el portal CONECT del ITS de Purísima del Rincón. Todo se procesa localmente en tu navegador.
// @author       Equipo CONECT Mod
// @match        https://purisima.tecnm.mx/conect/*
// @match        http://purisima.tecnm.mx/conect/*
// @run-at       document-idle
// @inject-into  page
// @require      https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js
// ==/UserScript==

/*
 * Notas sobre los metadatos
 * - Sin @noframes: Tampermonkey ejecuta el script en la página raíz y en cada
 *   iframe del portal (#fraizq, #fracontenido y los iframes anidados).
 * - Sin @grant (Tampermonkey asume "none") e @inject-into page (Userscripts
 *   para Safari en iPhone/iPad y Violentmonkey): el script corre en el
 *   contexto de la página. Así los frames (mismo origen) se comunican con la
 *   ventana superior mediante window.top.CMOD sin APIs especiales.
 * - Única conexión externa: CDN de librerías (jsDelivr y Google Fonts).
 */

(function () {
  'use strict';

/* ==========================================================================
   CSS DEL MOD (fuente: src/10-estilos.css)
   ========================================================================== */
const CSS_MOD = String.raw`
/* ==========================================================================
   CONECT Mod - Hoja de estilos
   Todo está acotado bajo html.cm-activo: si el mod se desactiva o falla,
   basta con quitar esa clase para que la página vuelva a su estado original.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. Paleta (cámbiala aquí). Colores institucionales: azul TecNM y guinda.
   -------------------------------------------------------------------------- */
:root,
[data-bs-theme="light"] {
  --cm-primario: #1b396a;          /* Azul TecNM */
  --cm-primario-rgb: 27, 57, 106;
  --cm-primario-hover: #132a4f;
  --cm-primario-suave: #e8eef8;
  --cm-enlace: #1d4f9e;
  --cm-enlace-rgb: 29, 79, 158;
  --cm-foco-rgb: 29, 79, 158;
  --cm-acento: #8a2036;            /* Guinda (títulos del portal) */
  --cm-acento-suave: #f8e9ec;

  --cm-fondo: #f3f5f9;
  --cm-superficie: #ffffff;
  --cm-superficie-2: #f8fafc;
  --cm-encabezado-tabla: #eef2f7;
  --cm-hover: #f1f5fb;
  --cm-borde: #dfe5ee;
  --cm-texto: #1a2433;
  --cm-texto-suave: #4b5768;       /* 7.4:1 sobre blanco */

  --cm-exito: #17784a;   --cm-exito-fondo: #e4f4ec;
  --cm-peligro: #b42318; --cm-peligro-fondo: #fdeceb;
  --cm-aviso: #8f5200;   --cm-aviso-fondo: #fff2dc;
  --cm-neutro: #556274;  --cm-neutro-fondo: #edf0f4;

  /* Colores para materias en el horario (fondo / texto) */
  --cm-m1-f: #e3ecfb; --cm-m1-t: #173f7a;
  --cm-m2-f: #e2f4ea; --cm-m2-t: #145c39;
  --cm-m3-f: #fbe7ea; --cm-m3-t: #7d1d30;
  --cm-m4-f: #fff0d9; --cm-m4-t: #7a4600;
  --cm-m5-f: #efe6fb; --cm-m5-t: #4e2a84;
  --cm-m6-f: #e0f3f6; --cm-m6-t: #11586a;
  --cm-m7-f: #f4ecdf; --cm-m7-t: #5f4521;
  --cm-m8-f: #eceff3; --cm-m8-t: #36424f;

  --cm-sombra: 0 1px 2px rgba(16, 24, 40, .05), 0 1px 3px rgba(16, 24, 40, .08);
  --cm-sombra-alta: 0 12px 32px rgba(16, 24, 40, .14);
}

[data-bs-theme="dark"] {
  --cm-primario: #3a64aa;          /* Texto blanco encima: 5.5:1 */
  --cm-primario-rgb: 58, 100, 170;
  --cm-primario-hover: #4a75bd;
  --cm-primario-suave: #1c2a40;
  --cm-enlace: #9cbcf0;
  --cm-enlace-rgb: 156, 188, 240;
  --cm-foco-rgb: 156, 188, 240;
  --cm-acento: #f0a3b3;
  --cm-acento-suave: #3a1c24;

  --cm-fondo: #0e141d;
  --cm-superficie: #151d29;
  --cm-superficie-2: #1a2331;
  --cm-encabezado-tabla: #1d2736;
  --cm-hover: #1f2a3a;
  --cm-borde: #2a3546;
  --cm-texto: #e5e9f0;
  --cm-texto-suave: #a9b3c2;

  --cm-exito: #6fd7a1;   --cm-exito-fondo: #12301f;
  --cm-peligro: #ff9a8f; --cm-peligro-fondo: #3a1714;
  --cm-aviso: #f5c06a;   --cm-aviso-fondo: #33260f;
  --cm-neutro: #b1bccb;  --cm-neutro-fondo: #222c3a;

  --cm-m1-f: #1c2c47; --cm-m1-t: #b9d0f7;
  --cm-m2-f: #15322a; --cm-m2-t: #a7e3c4;
  --cm-m3-f: #3a1d25; --cm-m3-t: #f4b9c5;
  --cm-m4-f: #3a2a12; --cm-m4-t: #f6d29a;
  --cm-m5-f: #2b2142; --cm-m5-t: #d4c1f5;
  --cm-m6-f: #133238; --cm-m6-t: #a5dde8;
  --cm-m7-f: #33291b; --cm-m7-t: #e6d2b0;
  --cm-m8-f: #252d38; --cm-m8-t: #c9d2de;

  --cm-sombra: 0 1px 2px rgba(0, 0, 0, .4);
  --cm-sombra-alta: 0 12px 32px rgba(0, 0, 0, .5);
}

:root {
  --cm-fuente: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  --cm-mono: ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace;
  --cm-radio: .75rem;
  --cm-radio-sm: .5rem;
  --cm-nav-h: 3.75rem;
  --cm-side-w: 17rem;
}

/* Oculta el parpadeo mientras carga Bootstrap (máximo 2.5 s, lo controla el JS) */
html.cm-cargando body { visibility: hidden; }

/* --------------------------------------------------------------------------
   2. Integración con Bootstrap 5.3
   -------------------------------------------------------------------------- */
html.cm-activo {
  --bs-body-font-family: var(--cm-fuente);
  --bs-body-font-size: .9375rem;
  --bs-body-line-height: 1.55;
  --bs-body-bg: var(--cm-fondo);
  --bs-body-color: var(--cm-texto);
  --bs-emphasis-color: var(--cm-texto);
  --bs-heading-color: var(--cm-texto);
  --bs-secondary-color: var(--cm-texto-suave);
  --bs-tertiary-bg: var(--cm-superficie-2);
  --bs-border-color: var(--cm-borde);
  --bs-primary: var(--cm-primario);
  --bs-primary-rgb: var(--cm-primario-rgb);
  --bs-link-color: var(--cm-enlace);
  --bs-link-color-rgb: var(--cm-enlace-rgb);
  --bs-link-hover-color: var(--cm-enlace);
  --bs-link-hover-color-rgb: var(--cm-enlace-rgb);
  --bs-border-radius: var(--cm-radio-sm);
  --bs-border-radius-lg: var(--cm-radio);
  --bs-focus-ring-color: rgba(var(--cm-foco-rgb), .35);
  color-scheme: light;
}
html.cm-activo[data-bs-theme="dark"] { color-scheme: dark; }

/* Tamaño del texto ajustable (Opciones > Tamaño del texto). Todo el diseño
   usa rem, así que crece o se reduce en proporción. */
html.cm-activo { font-size: calc(16px * var(--cm-escala, 1)); -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

html.cm-activo body {
  font-family: var(--cm-fuente);
  font-size: var(--bs-body-font-size);
  background: var(--cm-fondo);
  color: var(--cm-texto);
  -webkit-font-smoothing: antialiased;
}
/* En modo quirks las tablas no heredan la fuente */
html.cm-activo table { font-size: inherit; font-family: inherit; color: inherit; }

html.cm-activo .btn { font-weight: 500; border-radius: var(--cm-radio-sm); background-image: none; }
html.cm-activo h1, html.cm-activo h2, html.cm-activo h3, html.cm-activo h4 { color: var(--cm-texto); }
html.cm-activo .btn-primary {
  --bs-btn-bg: var(--cm-primario);
  --bs-btn-border-color: var(--cm-primario);
  --bs-btn-hover-bg: var(--cm-primario-hover);
  --bs-btn-hover-border-color: var(--cm-primario-hover);
  --bs-btn-active-bg: var(--cm-primario-hover);
  --bs-btn-active-border-color: var(--cm-primario-hover);
  --bs-btn-disabled-bg: var(--cm-primario);
  --bs-btn-disabled-border-color: var(--cm-primario);
  --bs-btn-focus-shadow-rgb: var(--cm-foco-rgb);
}
html.cm-activo .btn-outline-primary {
  --bs-btn-color: var(--cm-enlace);
  --bs-btn-border-color: rgba(var(--cm-enlace-rgb), .5);
  --bs-btn-hover-bg: var(--cm-primario);
  --bs-btn-hover-border-color: var(--cm-primario);
  --bs-btn-hover-color: #fff;
  --bs-btn-active-bg: var(--cm-primario-hover);
  --bs-btn-active-color: #fff;
  --bs-btn-disabled-color: var(--cm-texto-suave);
  --bs-btn-focus-shadow-rgb: var(--cm-foco-rgb);
}
html.cm-activo .btn-outline-secondary {
  --bs-btn-color: var(--cm-texto);
  --bs-btn-border-color: var(--cm-borde);
  --bs-btn-hover-bg: var(--cm-hover);
  --bs-btn-hover-color: var(--cm-texto);
  --bs-btn-hover-border-color: var(--cm-borde);
  --bs-btn-active-bg: var(--cm-hover);
  --bs-btn-active-color: var(--cm-texto);
  color: var(--cm-texto);
  border-color: var(--cm-borde);
}
html.cm-activo .btn-outline-secondary:hover { background-color: var(--cm-hover); color: var(--cm-texto); }
html.cm-activo .btn:disabled,
html.cm-activo .btn.disabled { opacity: .55; cursor: not-allowed; }

html.cm-activo :focus-visible {
  outline: 3px solid rgba(var(--cm-foco-rgb), .55);
  outline-offset: 2px;
}
html.cm-activo .form-control,
html.cm-activo .form-select {
  background-color: var(--cm-superficie);
  color: var(--cm-texto);
  border-color: var(--cm-borde);
}
html.cm-activo .form-control:focus,
html.cm-activo .form-select:focus {
  border-color: rgba(var(--cm-foco-rgb), .8);
  box-shadow: 0 0 0 .25rem rgba(var(--cm-foco-rgb), .2);
}
html.cm-activo .form-control:disabled { background-color: var(--cm-superficie-2); opacity: .7; }
html.cm-activo .form-check-input:checked { background-color: var(--cm-primario); border-color: var(--cm-primario); }

html.cm-activo .dropdown-menu,
html.cm-activo .modal-content,
html.cm-activo .toast,
html.cm-activo .offcanvas {
  --bs-dropdown-bg: var(--cm-superficie);
  --bs-modal-bg: var(--cm-superficie);
  --bs-toast-bg: var(--cm-superficie);
  --bs-offcanvas-bg: var(--cm-superficie);
  --bs-dropdown-link-active-bg: var(--cm-primario);
  border-color: var(--cm-borde);
}
html.cm-activo .modal-content,
html.cm-activo .toast { box-shadow: var(--cm-sombra-alta); }
html.cm-activo kbd {
  background: var(--cm-superficie-2);
  color: var(--cm-texto);
  border: 1px solid var(--cm-borde);
  border-bottom-width: 2px;
  font-size: .75em;
  padding: .1rem .35rem;
  font-family: var(--cm-fuente);
}

/* Corrección automática de contraste (la aplica el JS sólo donde el texto
   no se distingue de su fondo: fondo claro con texto claro o al revés) */
html.cm-activo .cm-texto-oscuro { color: #1a2433 !important; }
html.cm-activo .cm-texto-claro { color: #f1f4f8 !important; }

/* Utilidades propias */
html.cm-activo .cm-oculto { display: none !important; }
html.cm-activo .cm-solo-impresion { display: none !important; }
html.cm-activo .cm-num { font-variant-numeric: tabular-nums; }

/* --------------------------------------------------------------------------
   3. Shell (página raíz con #fraizq y #fracontenido)
   -------------------------------------------------------------------------- */
html.cm-activo body.cm-shell {
  margin: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}
html.cm-activo .cm-navbar {
  position: fixed;
  inset: 0 0 auto 0;
  height: var(--cm-nav-h);
  z-index: 1035;
  background: var(--cm-superficie);
  border-bottom: 1px solid var(--cm-borde);
  padding: 0;
}
html.cm-activo .cm-navbar > .container-fluid { height: 100%; flex-wrap: nowrap; }
html.cm-activo .cm-marca {
  display: flex; align-items: center; gap: .6rem;
  color: var(--cm-texto); text-decoration: none; font-size: 1rem; white-space: nowrap;
}
html.cm-activo .cm-marca:hover { color: var(--cm-texto); }
html.cm-activo .cm-logo {
  width: 2.25rem; height: 2.25rem; border-radius: .625rem;
  display: inline-grid; place-items: center;
  background: var(--cm-primario); color: #fff; font-size: 1.15rem;
}
html.cm-activo .cm-titulo-actual {
  font-weight: 600; color: var(--cm-texto-suave);
  padding-left: 1rem; margin-left: .5rem; border-left: 1px solid var(--cm-borde);
  min-width: 0;
}
html.cm-activo .btn-icono {
  width: 2.5rem; height: 2.5rem; padding: 0;
  display: inline-grid; place-items: center;
  border-radius: var(--cm-radio-sm);
  color: var(--cm-texto); background: transparent; border: 1px solid transparent;
  font-size: 1.15rem;
}
html.cm-activo .btn-icono:hover { background: var(--cm-hover); color: var(--cm-texto); }
html.cm-activo .cm-btn-buscar {
  display: inline-flex; align-items: center; gap: .5rem;
  color: var(--cm-texto-suave); background: var(--cm-superficie-2);
  border: 1px solid var(--cm-borde); border-radius: var(--cm-radio-sm);
  padding: .4rem .65rem; min-height: 2.5rem;
}
html.cm-activo .cm-btn-buscar:hover { color: var(--cm-texto); border-color: rgba(var(--cm-enlace-rgb), .5); }
@media (min-width: 768px) {
  html.cm-activo .cm-btn-buscar { min-width: 14.5rem; }
  html.cm-activo .cm-btn-buscar kbd { margin-left: auto; }
}

/* Barra de progreso de carga */
html.cm-activo .cm-progreso {
  position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; overflow: hidden;
}
html.cm-activo .cm-progreso > div {
  width: 35%; height: 100%; background: var(--cm-primario);
  animation: cm-progreso 1.1s ease-in-out infinite;
}
@keyframes cm-progreso {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
@media (prefers-reduced-motion: reduce) {
  html.cm-activo .cm-progreso > div { animation-duration: 3s; }
}

/* Barra lateral (escritorio) / offcanvas (móvil) */
html.cm-activo .cm-sidebar { --bs-offcanvas-width: min(20rem, 86vw); }
html.cm-activo .cm-sidebar .offcanvas-body { display: flex; flex-direction: column; }
@media (min-width: 992px) {
  html.cm-activo .cm-sidebar {
    position: fixed; top: var(--cm-nav-h); bottom: 0; left: 0;
    width: var(--cm-side-w);
    background: var(--cm-superficie) !important;
    border-right: 1px solid var(--cm-borde);
    display: flex; flex-direction: column;
    z-index: 1020;
  }
  html.cm-activo .cm-sidebar .offcanvas-body { flex-grow: 1; overflow-y: auto !important; min-height: 0; }
}
html.cm-activo .cm-nav { padding: .25rem .5rem 1rem; }
html.cm-activo .cm-nav ul { list-style: none; margin: 0; padding: 0; }
html.cm-activo .cm-nav-titulo {
  font-size: .72rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: var(--cm-texto-suave); padding: 1rem .75rem .35rem;
}
html.cm-activo .cm-nav-enlace,
html.cm-activo .cm-nav-seccion {
  display: flex; align-items: center; gap: .7rem; width: 100%;
  padding: .55rem .75rem; border-radius: var(--cm-radio-sm);
  color: var(--cm-texto); background: transparent; border: 0;
  text-align: left; text-decoration: none; font-size: .9rem; line-height: 1.3;
  cursor: pointer;
}
html.cm-activo .cm-nav-enlace .bi,
html.cm-activo .cm-nav-seccion .bi { font-size: 1.05rem; color: var(--cm-texto-suave); flex-shrink: 0; }
html.cm-activo .cm-nav-enlace:hover,
html.cm-activo .cm-nav-seccion:hover { background: var(--cm-hover); }
html.cm-activo .cm-nav-enlace.active {
  background: var(--cm-primario-suave); color: var(--cm-enlace); font-weight: 600;
}
html.cm-activo .cm-nav-enlace.active .bi { color: var(--cm-enlace); }
html.cm-activo .cm-nav-seccion { font-weight: 600; }
html.cm-activo .cm-nav-seccion .cm-chevron { margin-left: auto; font-size: .8rem; transition: transform .2s; }
html.cm-activo .cm-nav-seccion[aria-expanded="true"] .cm-chevron { transform: rotate(180deg); }
html.cm-activo .cm-nav-sub { margin: .1rem 0 .4rem 1.1rem !important; padding-left: .6rem !important; border-left: 1px solid var(--cm-borde); }
html.cm-activo .cm-nav-sub:not(.show) { display: none; }
html.cm-activo .cm-nav-sub .cm-nav-enlace { padding: .45rem .65rem; font-size: .86rem; }
html.cm-activo .cm-nav-salir { color: var(--cm-peligro) !important; }
html.cm-activo .cm-nav-salir .bi { color: var(--cm-peligro) !important; }

/* Contenedor original de los iframes, reacomodado */
html.cm-activo body.cm-shell > .container {
  position: fixed;
  top: var(--cm-nav-h); left: 0; right: 0; bottom: 0;
  display: flex;
  max-width: none; width: auto; margin: 0; padding: 0;
  height: auto; /* el portal le pone height:100%, que anulaba bottom:0 */
  background: var(--cm-fondo);
}
html.cm-activo body.cm-shell > .container > .content { flex: 1 1 auto; min-width: 0; height: 100%; position: relative; }
html.cm-activo body.cm-shell > .container > .sidebar { position: relative; }
/* La página raíz del portal no tiene DOCTYPE (modo quirks): ahí un height:100%
   se calcula contra la ventana completa y el iframe quedaba ~60 px más alto que
   el área visible, cortando el final de cada página. Con posición absoluta el
   iframe mide exactamente lo que su contenedor. */
html.cm-activo body.cm-shell > .container > .content > iframe,
html.cm-activo body.cm-shell > .container > .sidebar > iframe {
  position: absolute; inset: 0; display: block;
  width: 100% !important; height: 100% !important; border: 0;
}

/* Estado: sesión iniciada */
@media (min-width: 992px) {
  html.cm-activo body.cm-shell[data-cm-estado="sesion"] > .container { left: var(--cm-side-w); }
}
html.cm-activo body.cm-shell[data-cm-estado="sesion"]:not(.cm-menu-original) > .container > .sidebar {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  opacity: 0; pointer-events: none;
}
html.cm-activo body.cm-shell.cm-menu-original > .container > .sidebar {
  width: 175px; flex: 0 0 175px; height: 100%;
  border-right: 1px solid var(--cm-borde); background: #fff;
}
html.cm-activo body.cm-shell:not([data-cm-estado="sesion"]) .cm-solo-sesion { display: none !important; }

/* Opción del portal abierta en el marco del menú: ocupa el área principal */
html.cm-activo body.cm-shell[data-cm-estado="sesion"].cm-izq-contenido > .container > .sidebar {
  position: relative; flex: 1 1 auto; width: auto; height: 100%;
  opacity: 1; pointer-events: auto; overflow: visible;
  border-right: 0; background: var(--cm-fondo);
}
html.cm-activo body.cm-shell[data-cm-estado="sesion"].cm-izq-contenido > .container > .content { display: none; }

/* Estado: login (u otra página en el marco izquierdo) */
html.cm-activo body.cm-shell:not([data-cm-estado="sesion"]) > .container > .sidebar {
  flex: 0 0 25rem; width: 25rem; height: 100%;
  border-right: 1px solid var(--cm-borde);
  background: var(--cm-fondo);
}
@media (max-width: 991.98px) {
  html.cm-activo body.cm-shell:not([data-cm-estado="sesion"]) > .container {
    display: block; overflow-y: auto; -webkit-overflow-scrolling: touch;
  }
  html.cm-activo body.cm-shell:not([data-cm-estado="sesion"]) > .container > .sidebar {
    width: 100%; height: 600px; border-right: 0; border-bottom: 1px solid var(--cm-borde);
  }
  html.cm-activo body.cm-shell:not([data-cm-estado="sesion"]) > .container > .content { height: 75vh; }
}

/* --------------------------------------------------------------------------
   4. Login (login.htm dentro de #fraizq)
   -------------------------------------------------------------------------- */
html.cm-activo body.cm-login {
  min-height: 100vh; margin: 0; padding: 1.25rem;
  display: flex; align-items: center; justify-content: center;
  background: var(--cm-fondo);
}
html.cm-activo body.cm-login > table {
  width: 100% !important; max-width: 22.5rem; margin: 0 auto;
  background: var(--cm-superficie);
  border: 1px solid var(--cm-borde); border-radius: 1rem;
  box-shadow: var(--cm-sombra-alta);
  border-collapse: separate;
  font-size: .95rem !important;
}
html.cm-activo body.cm-login > table td { padding: 1.5rem 1.5rem .25rem; text-align: left; }
html.cm-activo body.cm-login > table tr + tr td { padding-top: 0; padding-bottom: 1.5rem; }
html.cm-activo body.cm-login td.login-box { background-image: none !important; height: auto !important; }
html.cm-activo body.cm-login big {
  display: block; font-size: 1.35rem; font-weight: 700; color: var(--cm-texto);
}
html.cm-activo body.cm-login hr { display: none; }
html.cm-activo body.cm-login img[src*="seguridad"] { display: none; }
html.cm-activo body.cm-login #frmLogin br { display: none; }
html.cm-activo body.cm-login #frmLogin label {
  display: block; margin: 0 0 .35rem;
  font-size: .875rem !important; font-weight: 600; color: var(--cm-texto) !important;
}
html.cm-activo body.cm-login #frmLogin input[type="text"],
html.cm-activo body.cm-login #frmLogin input[type="password"],
html.cm-activo body.cm-login #frmLogin select {
  width: 100% !important; font-size: 1rem !important; margin-bottom: 1rem;
  min-height: 2.75rem;
}
html.cm-activo body.cm-login .cm-campo-clave { position: relative; }
html.cm-activo body.cm-login .cm-campo-clave input { padding-right: 3rem; }
html.cm-activo body.cm-login .cm-ver-clave {
  position: absolute; right: 4px; top: 4px; height: 2.25rem; width: 2.5rem;
  border: 0; background: transparent; color: var(--cm-texto-suave); border-radius: var(--cm-radio-sm);
}
html.cm-activo body.cm-login .cm-ver-clave:hover { background: var(--cm-hover); color: var(--cm-texto); }
html.cm-activo body.cm-login #btnEnviar {
  width: 100% !important; min-height: 2.875rem; margin-top: .5rem;
  font-size: 1rem; font-weight: 600;
  background: var(--cm-primario); border: 1px solid var(--cm-primario); color: #fff;
  border-radius: var(--cm-radio-sm);
}
html.cm-activo body.cm-login #btnEnviar:hover { background: var(--cm-primario-hover); }
html.cm-activo body.cm-login #btnEnviar:disabled { opacity: .6; cursor: progress; }
html.cm-activo body.cm-login .cm-login-pie { font-size: .8rem; color: var(--cm-texto-suave); margin-top: 1rem; }
html.cm-activo body.cm-login .cm-mayus { font-size: .8rem; color: var(--cm-aviso); margin: -.6rem 0 .8rem; }

/* Marco intermedio (portal_contenido.asp): sin márgenes blancos */
html.cm-activo body.cm-marco { margin: 0; overflow: hidden; background: var(--cm-fondo); }
html.cm-activo body.cm-marco > iframe { display: block; width: 100%; height: 100vh; border: 0; }

/* --------------------------------------------------------------------------
   5. Bienvenida (bienvenido.asp)
   -------------------------------------------------------------------------- */
html.cm-activo body.cm-bienvenida { padding: 1.5rem; }
html.cm-activo body.cm-bienvenida > .container {
  max-width: 53.75rem;
  background: color-mix(in srgb, var(--cm-superficie) 90%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid var(--cm-borde);
  border-radius: 1rem; padding: 2rem;
  box-shadow: var(--cm-sombra-alta);
}
html.cm-activo body.cm-bienvenida > .container br { display: none; }
html.cm-activo body.cm-bienvenida h5 { font-weight: 700; color: var(--cm-primario); margin-bottom: 1rem; line-height: 1.35; }
html.cm-activo[data-bs-theme="dark"] body.cm-bienvenida h5 { color: var(--cm-enlace); }
html.cm-activo body.cm-bienvenida p { color: var(--cm-texto); }
html.cm-activo body.cm-bienvenida .alert { margin-top: 1.5rem !important; text-align: left; }
html.cm-activo body.cm-bienvenida .alert p { margin: 0; }

/* --------------------------------------------------------------------------
   6. Páginas de contenido (genérico)
   -------------------------------------------------------------------------- */
html.cm-activo body.cm-contenido { margin: 0; padding: 1rem; }
@media (min-width: 768px) { html.cm-activo body.cm-contenido { padding: 1.5rem 2rem; } }
html.cm-activo body.cm-contenido > center { text-align: initial; }
html.cm-activo body.cm-contenido hr { border-color: var(--cm-borde); opacity: 1; }
html.cm-activo .cm-pagina { max-width: 75rem; margin: 0 auto; }

/* Barra de título del portal (tabla con #cmdimprimir / #cmdhome) */
html.cm-activo table.cm-encabezado {
  width: 100% !important;
  background: var(--cm-superficie);
  border: 1px solid var(--cm-borde); border-radius: var(--cm-radio);
  border-collapse: separate; margin-bottom: 1rem;
  color: var(--cm-texto) !important;
}
html.cm-activo table.cm-encabezado td { padding: .6rem 1rem; }
html.cm-activo table.cm-encabezado td:first-child { font-size: 1.15rem; font-weight: 700; }
html.cm-activo table.cm-encabezado #cmdimprimir,
html.cm-activo table.cm-encabezado #cmdhome {
  display: inline-block; cursor: pointer;
  padding: .3rem .7rem; margin: 0 .15rem; border-radius: var(--cm-radio-sm);
  border: 1px solid var(--cm-borde); color: var(--cm-texto); font-size: .85rem; font-weight: 500;
}
html.cm-activo table.cm-encabezado #cmdimprimir:hover,
html.cm-activo table.cm-encabezado #cmdhome:hover { background: var(--cm-hover); }
html.cm-activo table.cm-encabezado + hr { display: none; }

/* Página contenedora con un solo iframe: el iframe ocupa el alto disponible */
html.cm-activo.cm-envoltura,
html.cm-activo.cm-envoltura body { overflow: hidden !important; }
html.cm-activo.cm-envoltura body.cm-contenido { padding-bottom: 0; }

/* Encabezado de página del mod */
html.cm-activo .cm-cabecera {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: .75rem 1rem; margin-bottom: 1.25rem;
}
html.cm-activo .cm-cabecera h1 { font-size: 1.5rem; font-weight: 700; margin: 0; letter-spacing: -.01em; }
html.cm-activo .cm-cabecera .cm-sub { color: var(--cm-texto-suave); margin: .2rem 0 0; font-size: .9rem; }
html.cm-activo .cm-cabecera .cm-acciones { display: flex; flex-wrap: wrap; gap: .5rem; }

/* Tarjetas */
html.cm-activo .cm-tarjeta {
  background: var(--cm-superficie);
  border: 1px solid var(--cm-borde);
  border-radius: var(--cm-radio);
  box-shadow: var(--cm-sombra);
}
html.cm-activo .cm-tarjeta-cuerpo { padding: 1rem 1.15rem; }
@media (min-width: 768px) { html.cm-activo .cm-tarjeta-cuerpo { padding: 1.25rem 1.4rem; } }
html.cm-activo .cm-tarjeta-titulo {
  font-size: 1rem; font-weight: 600; margin: 0 0 .75rem;
  display: flex; align-items: center; gap: .5rem;
}
html.cm-activo .cm-tarjeta-titulo .bi { color: var(--cm-enlace); }
html.cm-activo h2.cm-seccion { font-size: 1.1rem; font-weight: 700; margin: 1.75rem 0 .85rem; }

/* Indicadores (KPI) */
html.cm-activo .cm-kpi { height: 100%; display: flex; flex-direction: column; gap: .25rem; }
html.cm-activo .cm-kpi-etiqueta { color: var(--cm-texto-suave); font-size: .82rem; font-weight: 500; display: flex; align-items: center; gap: .4rem; }
html.cm-activo .cm-kpi-valor { font-size: 1.85rem; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
html.cm-activo .cm-kpi-valor small { font-size: .95rem; font-weight: 500; color: var(--cm-texto-suave); }
html.cm-activo .cm-kpi .progress { height: 8px; background: var(--cm-neutro-fondo); margin-top: .4rem; }
html.cm-activo .cm-kpi .progress-bar { background: var(--cm-primario); }

/* Calificaciones con color semántico */
html.cm-activo .cm-cal {
  display: inline-flex; align-items: center; justify-content: center; gap: .25rem;
  min-width: 2.6rem; padding: .18rem .55rem; border-radius: 999px;
  font-weight: 600; font-size: .85rem; line-height: 1.35; white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
html.cm-activo .cm-cal-ok { background: var(--cm-exito-fondo); color: var(--cm-exito); }
html.cm-activo .cm-cal-mal { background: var(--cm-peligro-fondo); color: var(--cm-peligro); }
html.cm-activo .cm-cal-pend { background: var(--cm-neutro-fondo); color: var(--cm-neutro); font-weight: 500; }
html.cm-activo .cm-cal-aviso { background: var(--cm-aviso-fondo); color: var(--cm-aviso); }
html.cm-activo .cm-cal sup { font-size: .65em; top: 0; font-weight: 500; opacity: .85; }
html.cm-activo .cm-etiqueta {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .15rem .55rem; border-radius: 999px; font-size: .78rem; font-weight: 500;
  background: var(--cm-neutro-fondo); color: var(--cm-neutro);
}
html.cm-activo .cm-etiqueta-ok { background: var(--cm-exito-fondo); color: var(--cm-exito); }
html.cm-activo .cm-etiqueta-aviso { background: var(--cm-aviso-fondo); color: var(--cm-aviso); }
html.cm-activo .cm-etiqueta-primaria { background: var(--cm-primario-suave); color: var(--cm-enlace); }

/* Alertas con colores propios (contraste AA en ambos temas) */
html.cm-activo .cm-alerta {
  display: flex; gap: .75rem; align-items: flex-start;
  padding: .85rem 1rem; border-radius: var(--cm-radio);
  border: 1px solid transparent; font-size: .9rem; margin-bottom: 1rem;
}
html.cm-activo .cm-alerta > .bi { font-size: 1.15rem; line-height: 1.3; }
html.cm-activo .cm-alerta-aviso { background: var(--cm-aviso-fondo); color: var(--cm-aviso); border-color: color-mix(in srgb, var(--cm-aviso) 25%, transparent); }
html.cm-activo .cm-alerta-error { background: var(--cm-peligro-fondo); color: var(--cm-peligro); border-color: color-mix(in srgb, var(--cm-peligro) 25%, transparent); }
html.cm-activo .cm-alerta-info { background: var(--cm-primario-suave); color: var(--cm-texto); border-color: var(--cm-borde); }
html.cm-activo .cm-alerta-info > .bi { color: var(--cm-enlace); }

/* Tablas del mod y tablas originales rediseñadas */
html.cm-activo .cm-tabla {
  width: 100% !important;
  border-collapse: separate !important; border-spacing: 0;
  background: var(--cm-superficie);
  color: var(--cm-texto) !important;
  font: inherit !important; font-size: .875rem !important;
  margin: 0;
}
html.cm-activo .cm-tabla th,
html.cm-activo .cm-tabla td {
  padding: .55rem .75rem;
  border: 0 !important; border-bottom: 1px solid var(--cm-borde) !important;
  color: var(--cm-texto) !important;
  background-color: transparent !important;
  vertical-align: middle;
}
html.cm-activo .cm-tabla thead th,
html.cm-activo .cm-tabla tr.cm-fila-encabezado > th,
html.cm-activo .cm-tabla tr.cm-fila-encabezado > td {
  position: sticky; top: 0; z-index: 2;
  background-color: var(--cm-encabezado-tabla) !important;
  font-weight: 600; font-size: .8rem; white-space: nowrap;
  text-align: left;
}
html.cm-activo .cm-tabla tr.cm-fila-titulo > th,
html.cm-activo .cm-tabla tr.cm-fila-titulo > td {
  background-color: var(--cm-superficie) !important;
  font-size: .95rem; font-weight: 700; text-align: left; padding: .8rem .75rem;
}
/* Las filas originales traen fondos propios (bgcolor o style) pensados para
   texto oscuro: se neutralizan para que el texto siempre contraste. */
html.cm-activo .cm-tabla tr,
html.cm-activo .cm-tabla tbody,
html.cm-activo .cm-tabla thead { background-color: transparent !important; color: var(--cm-texto) !important; }
html.cm-activo .cm-tabla font { color: inherit !important; }
html.cm-activo .cm-tabla tbody tr:hover > td { background-color: var(--cm-hover) !important; }
/* Tablas originales con rowspan: conservan líneas verticales para leerse bien */
html.cm-activo .cm-tabla.cm-tabla-legado th,
html.cm-activo .cm-tabla.cm-tabla-legado td { border-right: 1px solid var(--cm-borde) !important; }
html.cm-activo .cm-tabla.cm-tabla-legado td[rowspan] { background-color: var(--cm-superficie) !important; }
html.cm-activo .cm-tabla.cm-tabla-legado tr:hover > td[rowspan] { background-color: var(--cm-superficie) !important; }
html.cm-activo .cm-tabla label, html.cm-activo .cm-tabla big { color: inherit !important; font-size: inherit; }
html.cm-activo .cm-celda-ok { color: var(--cm-exito) !important; font-weight: 600; }
html.cm-activo .cm-celda-mal { color: var(--cm-peligro) !important; font-weight: 600; }
html.cm-activo .cm-celda-pend { color: var(--cm-texto-suave) !important; }

html.cm-activo .cm-tabla-marco {
  border: 1px solid var(--cm-borde); border-radius: var(--cm-radio);
  background: var(--cm-superficie);
  box-shadow: var(--cm-sombra);
  margin-bottom: 1.25rem;
  overflow: clip; /* bordes redondeados sin romper position: sticky */
}
html.cm-activo .cm-tabla-marco > .cm-tabla tr:last-child > td { border-bottom: 0 !important; }
/* Desplazamiento horizontal sólo en pantallas pequeñas (en escritorio se
   conserva el encabezado fijo, que no funciona dentro de un overflow) */
@media (max-width: 767.98px) {
  html.cm-activo .cm-tabla-marco { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  html.cm-activo .cm-tabla-marco > .cm-tabla { min-width: 40rem; }
  html.cm-activo .cm-tabla-marco > .cm-tabla.cm-tabla-tarjetas { min-width: 0; }
}

/* Tabla que se transforma en tarjetas en móvil */
@media (max-width: 767.98px) {
  html.cm-activo .cm-tabla-tarjetas thead { display: none; }
  html.cm-activo .cm-tabla-tarjetas,
  html.cm-activo .cm-tabla-tarjetas tbody,
  html.cm-activo .cm-tabla-tarjetas tr,
  html.cm-activo .cm-tabla-tarjetas td { display: block; width: 100%; }
  html.cm-activo .cm-tabla-tarjetas tr {
    padding: .75rem 1rem; border-bottom: 1px solid var(--cm-borde);
  }
  html.cm-activo .cm-tabla-tarjetas td {
    display: flex; justify-content: space-between; gap: 1rem;
    padding: .2rem 0; border: 0 !important; text-align: right;
  }
  html.cm-activo .cm-tabla-tarjetas td::before {
    content: attr(data-label); color: var(--cm-texto-suave); font-size: .8rem; text-align: left;
  }
  html.cm-activo .cm-tabla-tarjetas td.cm-td-titulo { font-weight: 600; text-align: left; font-size: .95rem; }
  html.cm-activo .cm-tabla-tarjetas td.cm-td-titulo::before { content: none; }
  html.cm-activo .cm-tabla-tarjetas tbody tr:hover > td { background: transparent !important; }
}

/* Filtros */
html.cm-activo .cm-filtros { display: flex; flex-wrap: wrap; gap: .5rem .75rem; align-items: center; margin-bottom: .85rem; }
html.cm-activo .cm-filtros .form-control,
html.cm-activo .cm-filtros .form-select { max-width: 16.25rem; }

/* Texto preformateado original (cuando se muestra) */
html.cm-activo pre { font-family: var(--cm-mono); color: var(--cm-texto); }
html.cm-activo .cm-original {
  overflow-x: auto; background: var(--cm-superficie); padding: 1rem;
  border: 1px dashed var(--cm-borde); border-radius: var(--cm-radio);
}

/* Gráficas */
html.cm-activo .cm-grafica { position: relative; height: 16.25rem; }

/* Materias (tarjetas de calificaciones) */
html.cm-activo .cm-materia { height: 100%; display: flex; flex-direction: column; }
html.cm-activo .cm-materia-nombre { font-weight: 600; font-size: .95rem; margin: 0; line-height: 1.3; }
html.cm-activo .cm-materia-grupo { font-size: .78rem; color: var(--cm-texto-suave); }
html.cm-activo .cm-parciales { display: flex; flex-wrap: wrap; gap: .4rem; margin: .75rem 0 .25rem; }
html.cm-activo .cm-parcial { display: flex; flex-direction: column; align-items: center; gap: .2rem; font-size: .72rem; color: var(--cm-texto-suave); }
html.cm-activo .cm-materia-pie {
  margin-top: auto; padding-top: .75rem; border-top: 1px solid var(--cm-borde);
  display: flex; justify-content: space-between; align-items: center; gap: .5rem; font-size: .85rem;
}

/* Horario semanal */
html.cm-activo .cm-horario {
  display: grid;
  grid-template-columns: 4rem repeat(var(--cm-dias, 5), minmax(6.875rem, 1fr));
  grid-auto-rows: 1.75rem;
  position: relative;
  min-width: 40rem;
}
html.cm-activo .cm-horario-dia {
  grid-row: 1; position: sticky; top: 0; z-index: 2;
  background: var(--cm-encabezado-tabla);
  font-weight: 600; font-size: .82rem; text-align: center;
  display: grid; place-items: center; border-bottom: 1px solid var(--cm-borde);
}
html.cm-activo .cm-horario-dia.cm-hoy { color: var(--cm-enlace); box-shadow: inset 0 -3px 0 var(--cm-primario); }
html.cm-activo .cm-horario-hora {
  grid-column: 1; font-size: .75rem; color: var(--cm-texto-suave);
  padding: 0 .5rem; text-align: right; transform: translateY(-.55em);
  font-variant-numeric: tabular-nums;
}
html.cm-activo .cm-horario-linea { grid-column: 2 / -1; border-top: 1px solid var(--cm-borde); pointer-events: none; }
html.cm-activo .cm-horario-linea.cm-media { border-top-style: dashed; opacity: .6; }
html.cm-activo .cm-bloque {
  margin: 2px 4px; padding: .35rem .5rem; border-radius: var(--cm-radio-sm);
  font-size: .76rem; line-height: 1.25; overflow: hidden;
  border-left: 4px solid currentColor;
  display: flex; flex-direction: column; gap: .1rem; z-index: 1;
}
html.cm-activo .cm-bloque strong { font-size: .8rem; }
html.cm-activo .cm-bloque span { opacity: .9; }
html.cm-activo .cm-color-1 { background: var(--cm-m1-f); color: var(--cm-m1-t); }
html.cm-activo .cm-color-2 { background: var(--cm-m2-f); color: var(--cm-m2-t); }
html.cm-activo .cm-color-3 { background: var(--cm-m3-f); color: var(--cm-m3-t); }
html.cm-activo .cm-color-4 { background: var(--cm-m4-f); color: var(--cm-m4-t); }
html.cm-activo .cm-color-5 { background: var(--cm-m5-f); color: var(--cm-m5-t); }
html.cm-activo .cm-color-6 { background: var(--cm-m6-f); color: var(--cm-m6-t); }
html.cm-activo .cm-color-7 { background: var(--cm-m7-f); color: var(--cm-m7-t); }
html.cm-activo .cm-color-8 { background: var(--cm-m8-f); color: var(--cm-m8-t); }
html.cm-activo .cm-punto { width: .7rem; height: .7rem; border-radius: 50%; display: inline-block; background: currentColor; flex-shrink: 0; }
html.cm-activo .cm-lista-dia h3 { font-size: .95rem; font-weight: 700; margin: 0 0 .5rem; display: flex; align-items: center; gap: .5rem; }
html.cm-activo .cm-lista-dia + .cm-lista-dia { margin-top: 1rem; }
html.cm-activo .cm-lista-clase { display: flex; gap: .75rem; padding: .6rem .75rem; border-radius: var(--cm-radio-sm); margin-bottom: .4rem; border-left: 4px solid currentColor; }
html.cm-activo .cm-lista-clase .cm-lista-hora { font-weight: 600; font-variant-numeric: tabular-nums; min-width: 6.5rem; }
html.cm-activo .cm-lista-clase small { display: block; opacity: .9; }

/* Perfil (inicio) */
html.cm-activo .cm-perfil { display: flex; gap: 1.25rem; align-items: center; flex-wrap: wrap; }
html.cm-activo .cm-perfil img {
  width: 5.5rem; height: 5.5rem; object-fit: cover; border-radius: 50%;
  border: 3px solid var(--cm-superficie); box-shadow: 0 0 0 1px var(--cm-borde);
}
html.cm-activo .cm-perfil h1 { font-size: 1.45rem; font-weight: 700; margin: 0; }
html.cm-activo .cm-datos { display: grid; grid-template-columns: max-content 1fr; gap: .45rem 1.25rem; margin: 0; font-size: .9rem; }
html.cm-activo .cm-datos dt { color: var(--cm-texto-suave); font-weight: 500; }
html.cm-activo .cm-datos dd { margin: 0; font-weight: 500; }
@media (max-width: 575.98px) {
  html.cm-activo .cm-datos { grid-template-columns: 1fr; gap: 0; }
  html.cm-activo .cm-datos dd { margin-bottom: .55rem; }
}
html.cm-activo .cm-accesos { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
html.cm-activo .cm-accesos .btn { display: flex; flex-direction: column; align-items: flex-start; gap: .35rem; text-align: left; padding: .75rem; }
html.cm-activo .cm-accesos .btn .bi { font-size: 1.2rem; }

/* Esqueletos de carga */
html.cm-activo .cm-esqueleto {
  display: inline-block; height: 1.6rem; width: 70%; border-radius: var(--cm-radio-sm);
  background: linear-gradient(90deg, var(--cm-neutro-fondo), var(--cm-hover), var(--cm-neutro-fondo));
  background-size: 200% 100%; animation: cm-brillo 1.4s ease infinite;
}
@keyframes cm-brillo { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* Botón volver arriba */
html.cm-activo .cm-arriba {
  position: fixed; right: 1rem; bottom: 1rem; z-index: 1040;
  width: 2.75rem; height: 2.75rem; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--cm-primario); color: #fff; border: 0;
  box-shadow: var(--cm-sombra-alta);
  opacity: 0; transform: translateY(10px); pointer-events: none;
  transition: opacity .2s, transform .2s;
}
html.cm-activo .cm-arriba.visible { opacity: 1; transform: none; pointer-events: auto; }
html.cm-activo .cm-arriba:hover { background: var(--cm-primario-hover); }

/* Buscador rápido */
html.cm-activo #cmBuscadorLista .list-group-item {
  display: flex; align-items: center; gap: .75rem; cursor: pointer;
  border: 0; border-radius: var(--cm-radio-sm); background: transparent; color: var(--cm-texto);
}
html.cm-activo #cmBuscadorLista .list-group-item .bi { color: var(--cm-texto-suave); }
html.cm-activo #cmBuscadorLista .list-group-item small { color: var(--cm-texto-suave); }
html.cm-activo #cmBuscadorLista .list-group-item.active {
  background: var(--cm-primario-suave); color: var(--cm-enlace);
}
html.cm-activo #cmBuscadorLista .list-group-item.active .bi { color: var(--cm-enlace); }

/* Botón para reactivar el mod cuando está desactivado (sin Bootstrap) */
.cm-reactivar {
  position: fixed; right: 12px; bottom: 12px; z-index: 99999;
  font: 600 13px/1 system-ui, sans-serif; padding: 9px 12px; border-radius: 8px;
  background: #1b396a; color: #fff; border: 0; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.25);
}

/* --------------------------------------------------------------------------
   7. Gráfica SVG, interacción y animaciones
   -------------------------------------------------------------------------- */
html.cm-activo .cm-svg-grafica { display: block; overflow: visible; }
html.cm-activo .cm-svg-rejilla { stroke: var(--cm-borde); stroke-width: 1; }
html.cm-activo .cm-svg-eje { fill: var(--cm-texto-suave); font-size: .6875rem; font-family: var(--cm-fuente); }
html.cm-activo .cm-svg-etiqueta { fill: var(--cm-texto); font-size: .75rem; font-weight: 600; font-family: var(--cm-fuente); }
html.cm-activo .cm-svg-valor { fill: var(--cm-texto); font-size: .75rem; font-weight: 700; font-family: var(--cm-fuente); }
html.cm-activo .cm-svg-barra rect { fill: var(--cm-primario); transition: fill .2s, filter .2s; }
html.cm-activo .cm-svg-barra:hover rect,
html.cm-activo .cm-svg-barra:focus rect { fill: var(--cm-primario-hover); filter: drop-shadow(0 4px 8px rgba(var(--cm-primario-rgb), .35)); }
html.cm-activo .cm-svg-barra:focus { outline: none; }

/* Horario: resaltado de una materia en toda la semana */
html.cm-activo .cm-horario-detalle {
  display: flex; flex-wrap: wrap; align-items: center; gap: .15rem;
  padding: .65rem 1rem; border-bottom: 1px solid var(--cm-borde);
  font-size: .85rem; min-height: 2.75rem; color: var(--cm-texto-suave);
}
html.cm-activo .cm-horario-detalle strong { color: var(--cm-texto); }
html.cm-activo .cm-bloque { cursor: default; transition: opacity .2s ease, filter .2s ease, transform .2s ease, box-shadow .2s ease; }
html.cm-activo .cm-bloque:focus-visible { outline-offset: 1px; }
html.cm-activo .cm-resaltando .cm-bloque:not(.cm-activa),
html.cm-activo .cm-resaltando .cm-lista-clase:not(.cm-activa) { opacity: .3; filter: saturate(.35); }
html.cm-activo .cm-bloque.cm-activa { box-shadow: 0 6px 18px rgba(16, 24, 40, .22), 0 0 0 2px currentColor; z-index: 3; }
html.cm-activo .cm-lista-clase { transition: opacity .2s, filter .2s, transform .2s; }
html.cm-activo .cm-lista-clase.cm-en-curso { box-shadow: 0 0 0 2px currentColor; }
html.cm-activo .cm-resaltando tr[data-materia] > td { transition: background-color .2s, opacity .2s; }
html.cm-activo .cm-resaltando tr[data-materia]:not(.cm-activa) > td { opacity: .45; }
html.cm-activo tr[data-materia].cm-activa > td { background-color: var(--cm-hover) !important; }
html.cm-activo tr[data-materia] { cursor: default; }
/* Línea de la hora actual */
html.cm-activo .cm-ahora {
  align-self: start; height: 2px; margin-left: 2px; margin-right: 2px;
  background: var(--cm-peligro); position: relative; z-index: 4; pointer-events: none;
}
html.cm-activo .cm-ahora::before {
  content: ""; position: absolute; left: -5px; top: -4px; width: 10px; height: 10px;
  border-radius: 50%; background: var(--cm-peligro);
}

/* Tarjetas y botones con respuesta al pasar el cursor */
html.cm-activo .cm-interactiva,
html.cm-activo .cm-acceso,
html.cm-activo .cm-kpi { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
html.cm-activo .cm-interactiva:hover,
html.cm-activo .cm-acceso:hover,
html.cm-activo .cm-kpi:hover { border-color: rgba(var(--cm-enlace-rgb), .45); box-shadow: var(--cm-sombra-alta); }
html.cm-activo .cm-acceso .bi { transition: transform .2s ease; }
html.cm-activo .cm-cal { transition: transform .15s ease; }
html.cm-activo .cm-nav-enlace, html.cm-activo .cm-nav-seccion { transition: background-color .15s ease, color .15s ease, padding-left .18s ease; }
html.cm-activo .progress-bar { transition: width 1s cubic-bezier(.2, .7, .2, 1); }
/* Transición suave al cambiar de tema (la activa el JS sólo durante el cambio) */
html.cm-activo.cm-cambiando-tema *,
html.cm-activo.cm-cambiando-tema *::before { transition: background-color .3s ease, color .3s ease, border-color .3s ease, fill .3s ease !important; }

@media (prefers-reduced-motion: no-preference) {
  html.cm-activo .cm-aparecer { animation: cm-subir .45s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--cm-i, 0) * 55ms); }
  @keyframes cm-subir { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  html.cm-activo .cm-bloque { animation: cm-crecer .4s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--cm-i, 0) * 30ms + 120ms); }
  @keyframes cm-crecer { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: none; } }
  html.cm-activo .cm-bloque.cm-activa { transform: scale(1.035); }
  html.cm-activo .cm-lista-clase.cm-activa { transform: translateX(4px); }
  html.cm-activo .cm-interactiva:hover, html.cm-activo .cm-acceso:hover, html.cm-activo .cm-kpi:hover { transform: translateY(-3px); }
  html.cm-activo .cm-acceso:hover .bi { transform: scale(1.18) rotate(-6deg); }
  html.cm-activo .cm-materia:hover .cm-cal { transform: scale(1.06); }
  html.cm-activo .cm-nav-enlace:hover { padding-left: 1rem; }
  html.cm-activo .cm-nav-sub.show { animation: cm-desplegar .22s ease both; }
  @keyframes cm-desplegar { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
  html.cm-activo .cm-svg-grafica.cm-animada .cm-svg-barra rect {
    transform-box: fill-box; transform-origin: bottom;
    animation: cm-barra .8s cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--cm-i, 0) * 120ms + 150ms);
  }
  html.cm-activo .cm-svg-grafica.cm-animada .cm-svg-valor { animation: cm-subir .4s ease both; animation-delay: calc(var(--cm-i, 0) * 120ms + 700ms); }
  @keyframes cm-barra { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  html.cm-activo .cm-ahora::before { animation: cm-latido 2s ease-in-out infinite; }
  @keyframes cm-latido { 0%, 100% { box-shadow: 0 0 0 0 rgba(180, 35, 24, .45); } 50% { box-shadow: 0 0 0 6px rgba(180, 35, 24, 0); } }
  html.cm-activo .modal.fade .modal-dialog { transition: transform .22s cubic-bezier(.2, .7, .2, 1), opacity .22s; }
}

/* --------------------------------------------------------------------------
   Calculadora de parcial
   -------------------------------------------------------------------------- */
html.cm-activo .cm-calc .modal-body { background: var(--cm-fondo); }
html.cm-activo .cm-calc .min-w-0 { min-width: 0; }
html.cm-activo .cm-calc-lista { display: grid; gap: .85rem; }
html.cm-activo .cm-calc-ind {
  background: var(--cm-superficie); border: 1px solid var(--cm-borde);
  border-radius: var(--cm-radio); padding: .9rem 1rem; box-shadow: var(--cm-sombra);
}
html.cm-activo .cm-calc-ind-cabeza { display: flex; align-items: center; gap: .5rem; }
html.cm-activo .cm-calc-nombre-fijo { font-size: 1rem; font-weight: 600; margin: 0; }
html.cm-activo .cm-calc-nombre { font-weight: 600; }
html.cm-activo .cm-calc-peso { width: 6.25rem; flex: 0 0 auto; }
html.cm-activo .cm-calc-nota-docente { font-size: .8rem; color: var(--cm-exito); margin: .5rem 0 0; }
html.cm-activo .cm-calc-cantidad { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin: .75rem 0 .5rem; }
html.cm-activo .cm-calc-actividades { display: grid; grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr)); gap: .5rem; }
html.cm-activo .cm-calc-act { display: flex; flex-direction: column; gap: .2rem; font-size: .75rem; color: var(--cm-texto-suave); margin: 0; }
html.cm-activo .cm-calc-act input { font-size: 1rem; font-variant-numeric: tabular-nums; }
html.cm-activo .cm-calc-ind-resultado {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: .25rem .75rem;
  font-size: .85rem; color: var(--cm-texto-suave); margin-top: .75rem;
}
html.cm-activo .cm-calc-ind-resultado strong { color: var(--cm-texto); }
html.cm-activo .cm-calc-ind .progress { height: 6px; margin-top: .4rem; background: var(--cm-neutro-fondo); }
html.cm-activo .cm-calc-ind .progress-bar { background: var(--cm-primario); transition: width .3s ease; }
html.cm-activo .cm-calc-pie { display: block; background: var(--cm-superficie); border-top: 1px solid var(--cm-borde); }
html.cm-activo .cm-calc-resumen { display: flex; gap: 1rem; align-items: center; width: 100%; }
html.cm-activo .cm-calc-total { display: flex; flex-direction: column; align-items: center; gap: .25rem; min-width: 6.5rem; max-width: 10rem; }
html.cm-activo .cm-calc-grande { font-size: 1.6rem; padding: .35rem .9rem; min-width: 5.5rem; }
html.cm-activo .cm-calc-datos { font-size: .875rem; display: grid; gap: .2rem; flex: 1; min-width: 0; }
html.cm-activo .cm-calc-mensaje { font-weight: 500; }
html.cm-activo .cm-calc-mensaje-ok { color: var(--cm-exito); }
html.cm-activo .cm-calc-mensaje-mal { color: var(--cm-peligro); }
html.cm-activo .cm-calc-supuesto { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; color: var(--cm-texto-suave); }
html.cm-activo .cm-calc-supuesto strong { color: var(--cm-texto); }
@media (max-width: 575.98px) {
  html.cm-activo .cm-calc-pie { padding: .6rem .9rem; }
  html.cm-activo .cm-calc-resumen { flex-direction: column; align-items: stretch; gap: .4rem; }
  html.cm-activo .cm-calc-total { flex-direction: row; justify-content: space-between; max-width: none; }
  html.cm-activo .cm-calc-total > span:first-child { text-align: left !important; }
  html.cm-activo .cm-calc-grande { font-size: 1.35rem; padding: .2rem .8rem; }
  html.cm-activo .cm-calc-datos { font-size: .82rem; }
}

/* --------------------------------------------------------------------------
   8. Impresión y exportación a PDF
   -------------------------------------------------------------------------- */
@media print {
  html.cm-activo, html.cm-activo[data-bs-theme="dark"] {
    --cm-fondo: #fff; --cm-superficie: #fff; --cm-superficie-2: #fff;
    --cm-texto: #000; --cm-texto-suave: #333; --cm-borde: #bbb;
    --cm-encabezado-tabla: #eee; --cm-hover: #fff;
    --cm-exito: #0b5a33; --cm-exito-fondo: #fff;
    --cm-peligro: #9b1c10; --cm-peligro-fondo: #fff;
    --cm-neutro: #444; --cm-neutro-fondo: #fff;
    --cm-aviso: #6b3e00; --cm-aviso-fondo: #fff;
    color-scheme: light;
  }
  html.cm-activo body { background: #fff !important; padding: 0 !important; font-size: 10.5pt; }
  html.cm-activo .cm-no-imprimir,
  html.cm-activo .cm-arriba,
  html.cm-activo .cm-filtros,
  html.cm-activo .cm-acciones,
  html.cm-activo table.cm-encabezado { display: none !important; }
  html.cm-activo .cm-solo-impresion { display: block !important; }
  html.cm-activo .cm-tarjeta, html.cm-activo .cm-tabla-marco { box-shadow: none !important; break-inside: avoid; }
  html.cm-activo .cm-tabla-marco { overflow: visible !important; }
  html.cm-activo .cm-tabla th { position: static !important; }
  html.cm-activo .cm-cal { border: 1px solid currentColor; }
  html.cm-activo .cm-tabla-tarjetas thead { display: table-header-group !important; }
  html.cm-activo .cm-tabla-tarjetas tr { display: table-row !important; }
  html.cm-activo .cm-tabla-tarjetas td { display: table-cell !important; }
  html.cm-activo .cm-tabla-tarjetas td::before { content: none !important; }
  html.cm-activo .cm-horario { min-width: 0; grid-auto-rows: 20px; }
  html.cm-activo .cm-horario-dia { position: static; }
  html.cm-activo .cm-vista-escritorio { display: block !important; }
  html.cm-activo .cm-vista-movil { display: none !important; }
  html.cm-activo .cm-cabecera-impresion {
    border-bottom: 2px solid #000; margin-bottom: 12px; padding-bottom: 6px;
    display: flex !important; justify-content: space-between; font-size: 9pt;
  }
  html.cm-activo .cm-cabecera-impresion strong { font-size: 11pt; }
  html.cm-activo * { animation: none !important; transition: none !important; }
  html.cm-activo .cm-horario-detalle, html.cm-activo .cm-ahora { display: none !important; }
  @page { margin: 14mm 12mm; }
}
`;

/* ==========================================================================
   NÚCLEO: configuración, utilidades, tema, reversión segura y atajos
   ========================================================================== */

const VERSION = '1.3.0';
const PREFIJO_LOG = '[CONECT Mod]';

/* Hojas de estilo por CDN (únicas peticiones a servidores externos) */
const CDN = {
  bootstrapCss: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  iconos: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  fuente: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
};
/* Bootstrap JS viene empaquetado en la extensión (lib/) o por @require en
   Tampermonkey: el mod nunca descarga ni ejecuta JavaScript remoto. Desde
   internet sólo se cargan hojas de estilo y la fuente. */

/* Preferencias guardadas en localStorage. Sólo ajustes de interfaz:
   nunca se guardan credenciales, números de control ni calificaciones. */
const PREF = {
  activo: 'cmod.activo',              // '1' | '0'
  tema: 'cmod.tema',                  // 'auto' | 'light' | 'dark'
  resumenInicio: 'cmod.resumenInicio',// '1' | '0' (lee el kárdex para el panel de inicio)
  teclado: 'cmod.restaurarTeclado',   // '1' | '0' (quita el bloqueo onkeydown del portal)
  menuOriginal: 'cmod.menuOriginal',  // '1' | '0' (muestra también el menú de imágenes)
  minutosSesion: 'cmod.minutosSesion', // número, duración estimada de la sesión
  escala: 'cmod.escala'               // tamaño del texto: 0.875 a 1.5
};

function leerPref(clave, porDefecto) {
  try {
    const v = window.localStorage.getItem(clave);
    return v === null ? porDefecto : v;
  } catch (e) {
    return porDefecto;
  }
}
function guardarPref(clave, valor) {
  try { window.localStorage.setItem(clave, String(valor)); } catch (e) { /* almacenamiento no disponible */ }
}

const log = (...args) => console.info(PREFIJO_LOG, ...args);
const avisar = (...args) => console.warn(PREFIJO_LOG, ...args);

/* --------------------------------------------------------------------------
   Utilidades de DOM
   -------------------------------------------------------------------------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
const textoDe = (nodo) => (nodo && nodo.textContent ? nodo.textContent : '').replace(/\s+/g, ' ').trim();
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const numero = (s) => {
  const m = String(s == null ? '' : s).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const formatoNum = (n, d = 2) => Number.isFinite(n)
  ? n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: d })
  : '-';

/**
 * Crea un elemento. Los datos del portal SIEMPRE se insertan con `text`
 * (textContent); `html` se usa sólo con plantillas estáticas del mod.
 */
function el(etiqueta, props = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'text') nodo.textContent = v;
    else if (k === 'html') nodo.innerHTML = v;
    else if (k === 'dataset') Object.assign(nodo.dataset, v);
    else if (k === 'style' && typeof v === 'object') {
      Object.entries(v).forEach(([prop, valor]) => {
        if (prop.startsWith('--')) nodo.style.setProperty(prop, valor); else nodo.style[prop] = valor;
      });
    }
    else if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2), v);
    else nodo.setAttribute(k, v === true ? '' : v);
  }
  for (const h of [].concat(hijos)) {
    if (h !== null && h !== undefined && h !== false) nodo.append(h);
  }
  return nodo;
}
const ico = (nombre, extra = '') => el('i', { class: `bi bi-${nombre} ${extra}`.trim(), 'aria-hidden': 'true' });

/** Convierte "JUAN CARLOS PEREZ" en "Juan Carlos Perez" (respeta números romanos). */
function enTitulo(s) {
  const menores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'para', 'a', 'el', 'con']);
  const palabra = (p, i) => {
    if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)\.?$/.test(p)) return p.toUpperCase();
    if (i > 0 && menores.has(p)) return p;
    // Abreviaturas con puntos ("ad.rec.fun") llevan mayúscula en cada parte
    return p.split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('.');
  };
  return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map(palabra).join(' ');
}

/* --------------------------------------------------------------------------
   Registro de cambios para poder revertir y dejar la página intacta
   -------------------------------------------------------------------------- */
const deshacer = [];
const registrar = (fn) => deshacer.push(fn);

function agregarClases(nodo, ...clases) {
  if (!nodo) return;
  const nuevas = clases.filter((c) => c && !nodo.classList.contains(c));
  if (!nuevas.length) return;
  nodo.classList.add(...nuevas);
  registrar(() => nodo.classList.remove(...nuevas));
}
function fijarAtributo(nodo, nombre, valor) {
  if (!nodo) return;
  const tenia = nodo.hasAttribute(nombre);
  const previo = nodo.getAttribute(nombre);
  if (valor === null) nodo.removeAttribute(nombre); else nodo.setAttribute(nombre, valor);
  registrar(() => { if (tenia) nodo.setAttribute(nombre, previo); else nodo.removeAttribute(nombre); });
}
function fijarEstilo(nodo, propiedad, valor) {
  if (!nodo) return;
  const previo = nodo.style.getPropertyValue(propiedad);
  const prioridad = nodo.style.getPropertyPriority(propiedad);
  nodo.style.setProperty(propiedad, valor, 'important');
  registrar(() => {
    if (previo) nodo.style.setProperty(propiedad, previo, prioridad);
    else nodo.style.removeProperty(propiedad);
  });
}
/** Inserta un nodo propio (marcado con data-cmod) junto a una referencia. */
function insertar(nodo, referencia, posicion = 'beforebegin') {
  nodo.setAttribute('data-cmod', '');
  referencia.insertAdjacentElement(posicion, nodo);
  registrar(() => nodo.remove());
  return nodo;
}
/** Envuelve un nodo original sin sacarlo de su formulario o contenedor. */
function envolver(nodo, props = {}) {
  const envoltura = el('div', props);
  nodo.parentNode.insertBefore(envoltura, nodo);
  envoltura.append(nodo);
  registrar(() => { if (envoltura.parentNode) envoltura.replaceWith(...envoltura.childNodes); });
  return envoltura;
}
function escuchar(objetivo, evento, fn, opciones) {
  objetivo.addEventListener(evento, fn, opciones);
  registrar(() => objetivo.removeEventListener(evento, fn, opciones));
}
function cadaCierto(fn, ms) {
  const id = setInterval(fn, ms);
  registrar(() => clearInterval(id));
  return id;
}
function ocultar(nodo) { agregarClases(nodo, 'cm-oculto'); }

/** Devuelve la página a su estado original. */
function revertir() {
  while (deshacer.length) {
    try { deshacer.pop()(); } catch (e) { /* seguir revirtiendo */ }
  }
  try {
    $$('[data-cmod]').forEach((n) => n.remove());
    document.documentElement.classList.remove('cm-activo', 'cm-cargando', 'cm-envoltura');
    document.documentElement.removeAttribute('data-bs-theme');
  } catch (e) { /* nada más que hacer */ }
}

/** Ejecuta un bloque y, si falla, revierte el documento completo. */
function seguro(nombre, fn) {
  try {
    return fn();
  } catch (e) {
    avisar(`El módulo "${nombre}" no pudo aplicarse; se restaura la página original.`, e);
    revertir();
    return null;
  }
}

/* --------------------------------------------------------------------------
   Contexto: en qué página y en qué marco estamos
   -------------------------------------------------------------------------- */
const PAGINA = (location.pathname.split('/').pop() || '').toLowerCase();
const ES_TOP = (() => { try { return window.top === window; } catch (e) { return false; } })();

/** Ventana superior del portal (mismo origen), o null. */
function ventanaTop() {
  try { return window.top && window.top.location.host === location.host ? window.top : null; } catch (e) { return null; }
}
/** API expuesta por el shell en la ventana superior. */
function apiShell() {
  const t = ventanaTop();
  try { return t && t.CMOD ? t.CMOD : null; } catch (e) { return null; }
}
/** true si este documento vive dentro de #fracontenido (a cualquier profundidad). */
function dentroDeContenido() {
  try {
    let w = window;
    while (w !== w.parent) {
      if (w.frameElement && w.frameElement.id === 'fracontenido') return true;
      w = w.parent;
    }
  } catch (e) { /* origen distinto */ }
  return false;
}
/** true si este documento es el que está directamente en #fracontenido. */
function esRaizDeContenido() {
  try { return !!(window.frameElement && window.frameElement.id === 'fracontenido'); } catch (e) { return false; }
}

/* --------------------------------------------------------------------------
   Recursos: Bootstrap, iconos, fuente y hoja de estilos del mod
   -------------------------------------------------------------------------- */
function inyectarRecursos() {
  const raiz = document.documentElement;
  const cabeza = document.head || raiz;
  raiz.classList.add('cm-cargando');

  const agregarLink = (href, extra = {}) => {
    const link = el('link', { rel: 'stylesheet', href, ...extra });
    link.setAttribute('data-cmod', '');
    cabeza.appendChild(link);
    return link;
  };
  // El portal no declara viewport: en celulares se dibujaba como una pantalla
  // de computadora (~980 px) reducida. Con esto se usa el ancho real.
  if (!document.querySelector('meta[name="viewport"]')) {
    const vp = el('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
    vp.setAttribute('data-cmod', '');
    cabeza.prepend(vp);
  }
  const preconexion = el('link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' });
  preconexion.setAttribute('data-cmod', '');
  cabeza.appendChild(preconexion);

  const bootstrap = agregarLink(CDN.bootstrapCss);
  agregarLink(CDN.iconos);
  agregarLink(CDN.fuente);

  const estilo = el('style', { text: CSS_MOD });
  estilo.setAttribute('data-cmod', '');
  cabeza.appendChild(estilo);

  // Muestra la página en cuanto Bootstrap cargue (o a los 2.5 s si el CDN falla)
  const mostrar = () => raiz.classList.remove('cm-cargando');
  bootstrap.addEventListener('load', mostrar, { once: true });
  bootstrap.addEventListener('error', () => {
    avisar('No se pudo cargar Bootstrap desde el CDN. Se usan sólo los estilos propios.');
    mostrar();
  }, { once: true });
  setTimeout(mostrar, 2500);
}

/* --------------------------------------------------------------------------
   App de Android (CONECT Mod para Android)
   La app expone window.CMODAndroid (WebMessageListener) sólo en el origen del
   portal. window.print() no funciona dentro de un WebView: se manda el HTML
   de la página a la app, que abre el diálogo de impresión de Android.
   -------------------------------------------------------------------------- */
const EN_APP = (() => { try { return !!(window.CMODAndroid && typeof window.CMODAndroid.postMessage === 'function'); } catch (e) { return false; } })();
function avisarApp(mensaje) {
  if (!EN_APP) return false;
  try { window.CMODAndroid.postMessage(JSON.stringify(mensaje)); return true; } catch (e) { return false; }
}
function instalarImpresionApp() {
  if (!EN_APP) return;
  const original = window.print;
  window.print = function imprimirEnApp() {
    const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
    const titulo = (document.title || textoDe($('h1')) || 'Portal').trim();
    if (!avisarApp({ tipo: 'imprimir', html, url: location.href, titulo })) original.call(window);
  };
  registrar(() => { window.print = original; });
}

/* --------------------------------------------------------------------------
   Tema claro / oscuro (sincronizado entre todos los marcos)
   -------------------------------------------------------------------------- */
function temaEfectivo() {
  const t = leerPref(PREF.tema, 'auto');
  if (t === 'light' || t === 'dark') return t;
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
}
function aplicarTema() {
  document.documentElement.setAttribute('data-bs-theme', temaEfectivo());
  document.dispatchEvent(new CustomEvent('cmod:tema'));
  // En la app de Android, la barra de estado toma el color del tema
  if (ES_TOP) avisarApp({ tipo: 'tema', valor: temaEfectivo() });
}
function suavizarCambioTema() {
  const raiz = document.documentElement;
  raiz.classList.add('cm-cambiando-tema');
  clearTimeout(suavizarCambioTema.t);
  suavizarCambioTema.t = setTimeout(() => raiz.classList.remove('cm-cambiando-tema'), 400);
}
function alternarTema() {
  suavizarCambioTema();
  guardarPref(PREF.tema, temaEfectivo() === 'dark' ? 'light' : 'dark');
  aplicarTema(); // los demás marcos se enteran por el evento "storage"
}
/* Tamaño del texto (sincronizado entre todos los marcos) */
const ESCALAS = [0.875, 1, 1.125, 1.25, 1.375, 1.5];
function escalaActual() {
  const v = parseFloat(leerPref(PREF.escala, '1'));
  return Number.isFinite(v) && v >= 0.75 && v <= 1.75 ? v : 1;
}
function aplicarEscala() {
  document.documentElement.style.setProperty('--cm-escala', String(escalaActual()));
  document.dispatchEvent(new CustomEvent('cmod:escala'));
}
function cambiarEscala(paso) {
  const actual = escalaActual();
  let i = ESCALAS.findIndex((e) => Math.abs(e - actual) < 0.01);
  if (i < 0) i = 1;
  const nueva = paso === 0 ? 1 : ESCALAS[Math.max(0, Math.min(ESCALAS.length - 1, i + paso))];
  guardarPref(PREF.escala, String(nueva));
  aplicarEscala();
  return nueva;
}
function instalarSincronizacionTema() {
  aplicarEscala();
  registrar(() => document.documentElement.style.removeProperty('--cm-escala'));
  escuchar(window, 'storage', (e) => {
    if (e.key === PREF.tema) { suavizarCambioTema(); aplicarTema(); }
    if (e.key === PREF.escala) aplicarEscala();
  });
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => { if (leerPref(PREF.tema, 'auto') === 'auto') aplicarTema(); };
    mq.addEventListener('change', alCambiar);
    registrar(() => mq.removeEventListener('change', alCambiar));
  } catch (e) { /* navegador antiguo */ }
}
/** Lee una variable CSS del tema actual. */
const varCss = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

/* --------------------------------------------------------------------------
   Atajos de teclado
   -------------------------------------------------------------------------- */
const ATAJOS = [
  { teclas: ['Ctrl', 'K'], alt: ['/'], accion: 'buscar', descripcion: 'Buscar una sección del portal' },
  { teclas: ['Alt', 'I'], accion: 'inicio', descripcion: 'Ir al inicio' },
  { teclas: ['Alt', 'M'], accion: 'menu', descripcion: 'Abrir o enfocar el menú' },
  { teclas: ['Alt', 'T'], accion: 'tema', descripcion: 'Cambiar entre modo claro y oscuro' },
  { teclas: ['Alt', 'P'], accion: 'imprimir', descripcion: 'Imprimir o exportar a PDF la página actual' },
  { teclas: ['Alt', 'Flecha arriba'], accion: 'arriba', descripcion: 'Volver al principio de la página' },
  { teclas: ['Alt', '+'], alt: ['Alt + -'], accion: 'mas', descripcion: 'Agrandar o reducir el texto' },
  { teclas: ['Alt', 'C'], accion: 'calculadora', descripcion: 'Abrir la calculadora de parcial' },
  { teclas: ['?'], accion: 'ayuda', descripcion: 'Mostrar esta ayuda' }
];

function accionDeTecla(e) {
  const t = e.target;
  const escribiendo = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const tecla = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && tecla === 'k') return 'buscar';
  if (escribiendo) return null;
  if (!e.ctrlKey && !e.metaKey && !e.altKey && tecla === '/') return 'buscar';
  if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === '?') return 'ayuda';
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    switch (e.code) {
      case 'KeyI': return 'inicio';
      case 'KeyM': return 'menu';
      case 'KeyT': return 'tema';
      case 'KeyP': return 'imprimir';
      case 'ArrowUp': return 'arriba';
      case 'Equal': case 'NumpadAdd': return 'mas';
      case 'Minus': case 'NumpadSubtract': return 'menos';
      case 'KeyC': return 'calculadora';
      default: return null;
    }
  }
  return null;
}

/** En marcos internos: reenvía los atajos al shell (o los resuelve localmente). */
function instalarAtajosLocales() {
  escuchar(window, 'keydown', (e) => {
    const accion = accionDeTecla(e);
    if (!accion) return;
    const api = apiShell();
    if (api) {
      e.preventDefault();
      api.atajo(accion, window);
      return;
    }
    if (accion === 'tema') { e.preventDefault(); alternarTema(); }
    if (accion === 'imprimir') { e.preventDefault(); window.print(); }
    if (accion === 'arriba') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }, true);
}

/**
 * El portal pone onkeydown="return false" en <body>, lo que bloquea Ctrl+F,
 * copiar, imprimir, etc. Si la preferencia lo permite, se quita ese bloqueo
 * (sólo en páginas sin formularios, para no alterar ninguna captura).
 */
function restaurarTeclado() {
  if (leerPref(PREF.teclado, '1') !== '1') return;
  const cuerpo = document.body;
  if (!cuerpo || !cuerpo.hasAttribute('onkeydown')) return;
  if ($$('form, input, select, textarea').length) return;
  fijarAtributo(cuerpo, 'onkeydown', null);
}

/* --------------------------------------------------------------------------
   Botón "volver arriba"
   -------------------------------------------------------------------------- */
function instalarVolverArriba() {
  const boton = el('button', {
    class: 'cm-arriba cm-no-imprimir', type: 'button',
    title: 'Volver arriba (Alt + Flecha arriba)', 'aria-label': 'Volver arriba'
  }, [ico('arrow-up')]);
  insertar(boton, document.body, 'beforeend');
  boton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const revisar = () => boton.classList.toggle('visible', window.scrollY > 400);
  escuchar(window, 'scroll', revisar, { passive: true });
  revisar();
}

/* --------------------------------------------------------------------------
   Tablas: matriz expandida (resuelve rowspan/colspan) y estilos
   -------------------------------------------------------------------------- */
function tablaAMatriz(tabla) {
  const filas = Array.from(tabla.rows);
  const matriz = filas.map(() => []);
  filas.forEach((tr, i) => {
    let c = 0;
    Array.from(tr.cells).forEach((celda) => {
      while (matriz[i][c] !== undefined) c++;
      const rs = Math.max(1, celda.rowSpan || 1);
      const cs = Math.max(1, celda.colSpan || 1);
      for (let r = 0; r < rs && i + r < filas.length; r++) {
        for (let k = 0; k < cs; k++) matriz[i + r][c + k] = celda;
      }
      c += cs;
    });
  });
  return matriz;
}

/** Aplica el diseño del mod a una tabla original sin cambiar su contenido. */
function estilizarTablaOriginal(tabla, { legado = true } = {}) {
  if (!tabla || tabla.closest('.cm-tabla-marco')) return;
  agregarClases(tabla, 'cm-tabla', legado ? 'cm-tabla-legado' : '');
  // Filas formadas sólo por <th>: la última es el encabezado fijo; las de una
  // sola celda con colspan se tratan como título.
  const filas = Array.from(tabla.rows);
  let ultimaEncabezado = null;
  for (const tr of filas) {
    const celdas = Array.from(tr.cells);
    if (!celdas.length || !celdas.every((c) => c.tagName === 'TH')) break;
    if (celdas.length === 1 && celdas[0].colSpan > 1) agregarClases(tr, 'cm-fila-titulo');
    else ultimaEncabezado = tr;
  }
  if (ultimaEncabezado) agregarClases(ultimaEncabezado, 'cm-fila-encabezado');
  envolver(tabla, { class: 'cm-tabla-marco' });
}

/** Clase semántica para una calificación numérica. */
function claseCalificacion(valor, { sinCaptura = false } = {}) {
  if (sinCaptura || !Number.isFinite(valor)) return 'cm-cal-pend';
  return valor >= 70 ? 'cm-cal-ok' : 'cm-cal-mal';
}
function insigniaCalificacion(valor, { sinCaptura = false, sufijo = '', titulo = '' } = {}) {
  const clase = claseCalificacion(valor, { sinCaptura });
  const texto = sinCaptura || !Number.isFinite(valor) ? 'Sin captura' : formatoNum(valor);
  const nodo = el('span', { class: `cm-cal ${clase}`, title: titulo || null }, [texto]);
  if (sufijo && !sinCaptura) nodo.append(el('sup', { text: sufijo }));
  return nodo;
}

/* --------------------------------------------------------------------------
   Encabezado de página del mod (título + acciones)
   -------------------------------------------------------------------------- */
function cabeceraPagina({ titulo, subtitulo, acciones = [] }) {
  return el('header', { class: 'cm-cabecera' }, [
    el('div', {}, [
      el('h1', { text: titulo }),
      subtitulo ? el('p', { class: 'cm-sub', text: subtitulo }) : null
    ]),
    acciones.length ? el('div', { class: 'cm-acciones cm-no-imprimir' }, acciones) : null
  ]);
}
function botonImprimir(etiqueta = 'Imprimir o guardar PDF') {
  return el('button', {
    class: 'btn btn-primary btn-sm', type: 'button',
    'data-cm-accion': 'imprimir', title: 'Alt + P',
    onclick: () => window.print()
  }, [ico('printer', 'me-1'), etiqueta]);
}
/** Botón que alterna entre la vista del mod y el formato original del portal. */
function botonVistaOriginal(original, vistaMod) {
  const boton = el('button', { class: 'btn btn-outline-secondary btn-sm', type: 'button', 'aria-pressed': 'false' });
  const pintar = (mostrandoOriginal) => {
    boton.replaceChildren(ico(mostrandoOriginal ? 'grid-1x2' : 'file-earmark-code', 'me-1'),
      mostrandoOriginal ? 'Ver diseño nuevo' : 'Ver formato original');
    boton.setAttribute('aria-pressed', String(mostrandoOriginal));
  };
  pintar(false);
  boton.addEventListener('click', () => {
    const mostrar = original.classList.contains('cm-oculto');
    original.classList.toggle('cm-oculto', !mostrar);
    vistaMod.classList.toggle('cm-oculto', mostrar);
    pintar(mostrar);
  });
  return boton;
}
/** Cabecera que sólo aparece al imprimir. */
function cabeceraImpresion(titulo) {
  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  return el('div', { class: 'cm-solo-impresion cm-cabecera-impresion' }, [
    el('div', {}, [el('strong', { text: titulo }), el('div', { text: 'Instituto Tecnológico Superior de Purísima del Rincón' })]),
    el('div', { text: `Generado el ${fecha}` })
  ]);
}

/* --------------------------------------------------------------------------
   Animaciones (todas respetan "reducir movimiento" del sistema)
   -------------------------------------------------------------------------- */
const sinMovimiento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/** Entrada escalonada: los elementos aparecen subiendo, uno tras otro. */
function animarEntrada(nodos) {
  Array.from(nodos).slice(0, 24).forEach((n, i) => {
    n.style.setProperty('--cm-i', String(i));
    n.classList.add('cm-aparecer');
  });
}

/** Número que cuenta desde 0 hasta su valor. */
function cifra(valor, decimales = 0) {
  return el('span', { class: 'cm-contador cm-num', dataset: { valor: String(valor), dec: String(decimales) }, text: formatoNum(valor, decimales) });
}
function animarContadores(raiz = document) {
  $$('.cm-contador:not([data-animado])', raiz).forEach((n) => {
    n.dataset.animado = '1';
    const fin = parseFloat(n.dataset.valor);
    const dec = parseInt(n.dataset.dec || '0', 10);
    if (!Number.isFinite(fin) || sinMovimiento()) return;
    const inicio = performance.now();
    const duracion = 900;
    const paso = (t) => {
      const p = Math.min(1, (t - inicio) / duracion);
      const suave = 1 - (1 - p) ** 3;
      n.textContent = formatoNum(fin * suave, dec);
      if (p < 1) requestAnimationFrame(paso); else n.textContent = formatoNum(fin, dec);
    };
    requestAnimationFrame(paso);
  });
  // Las barras de progreso crecen desde cero
  $$('.progress-bar[data-ancho]:not([data-animado])', raiz).forEach((b) => {
    b.dataset.animado = '1';
    requestAnimationFrame(() => requestAnimationFrame(() => { b.style.width = b.dataset.ancho; }));
  });
}

/* --------------------------------------------------------------------------
   Gráfica por semestre: SVG propio (sin librerías externas), con barras que
   crecen, valor sobre cada barra y colores tomados del tema.
   -------------------------------------------------------------------------- */
function graficaSemestres(contenedor, semestres) {
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, texto) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (texto !== undefined) n.textContent = texto;
    return n;
  };
  const minimo = Math.max(0, Math.floor(Math.min(...semestres.map((s) => s.promedio)) / 10) * 10 - 10);
  const maximo = 100;
  let primera = true;

  const dibujar = () => {
    const ancho = Math.max(280, Math.floor(contenedor.clientWidth || 600));
    const alto = Math.max(200, Math.floor(contenedor.clientHeight || 260));
    const f = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16;
    const m = { t: 26 * f, r: 8, b: 46 * f, l: 34 * f };
    const w = ancho - m.l - m.r;
    const h = alto - m.t - m.b;
    const y = (v) => m.t + h - ((v - minimo) / (maximo - minimo)) * h;
    const svg = svgEl('svg', {
      class: `cm-svg-grafica${primera && !sinMovimiento() ? ' cm-animada' : ''}`,
      width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, role: 'img',
      'aria-label': `Promedio por semestre: ${semestres.map((s) => `${s.etiqueta} ${formatoNum(s.promedio)}`).join(', ')}`
    });
    for (let v = minimo; v <= maximo; v += 10) {
      svg.append(svgEl('line', { class: 'cm-svg-rejilla', x1: m.l, x2: ancho - m.r, y1: y(v), y2: y(v) }));
      svg.append(svgEl('text', { class: 'cm-svg-eje', x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, String(v)));
    }
    const banda = w / semestres.length;
    const anchoBarra = Math.min(64, banda * 0.5);
    semestres.forEach((s, i) => {
      const cx = m.l + banda * i + banda / 2;
      const yTope = y(s.promedio);
      const grupo = svgEl('g', { class: 'cm-svg-barra', tabindex: '0', style: `--cm-i:${i}` });
      grupo.append(svgEl('title', {}, `${s.etiqueta} (${s.periodo}): promedio ${formatoNum(s.promedio)}, ${s.materias} materias`));
      grupo.append(svgEl('rect', { x: cx - anchoBarra / 2, y: yTope, width: anchoBarra, height: Math.max(0, m.t + h - yTope), rx: 6 }));
      grupo.append(svgEl('text', { class: 'cm-svg-valor', x: cx, y: yTope - 8, 'text-anchor': 'middle' }, formatoNum(s.promedio)));
      grupo.append(svgEl('text', { class: 'cm-svg-etiqueta', x: cx, y: alto - 26 * f, 'text-anchor': 'middle' }, s.etiqueta));
      grupo.append(svgEl('text', { class: 'cm-svg-eje', x: cx, y: alto - 10 * f, 'text-anchor': 'middle' }, s.periodo));
      svg.append(grupo);
    });
    contenedor.replaceChildren(svg);
    primera = false;
  };
  dibujar();
  if (window.ResizeObserver) {
    let ultimoAncho = contenedor.clientWidth;
    const ro = new ResizeObserver(() => {
      if (Math.abs(contenedor.clientWidth - ultimoAncho) < 4) return;
      ultimoAncho = contenedor.clientWidth;
      dibujar();
    });
    ro.observe(contenedor);
    registrar(() => ro.disconnect());
  }
  escuchar(document, 'cmod:escala', () => setTimeout(dibujar, 30));
}

/* ==========================================================================
   SHELL: página raíz (la que contiene iframe#fraizq e iframe#fracontenido)
   - Barra superior, menú lateral (escritorio) / offcanvas (móvil)
   - Menú unificado construido a partir del menú original de imágenes
   - Buscador rápido, atajos, tema, aviso de sesión y barra de carga
   Los iframes originales NO se mueven ni se recrean (eso los recargaría):
   sólo se reacomodan con CSS.
   ========================================================================== */

/* Nombres e íconos de las secciones del menú (parámetro np de mnualumno.asp) */
const SECCIONES = {
  1: ['Semestre actual', 'calendar3'],
  2: ['Servicio social', 'people'],
  3: ['Desarrollo humano', 'person-heart'],
  4: ['Generales', 'folder2-open'],
  5: ['Reinscripción', 'arrow-repeat'],
  6: ['Curso de verano', 'sun'],
  7: ['Pagos', 'credit-card']
};
/* Submenús conocidos, identificados por el nombre de su imagen (mnu_al_<clave>01.gif) */
const SUBMENUS = {
  miscalif: ['Calificaciones parciales', 'clipboard-data'],
  fcaliffinales: ['Calificaciones finales', 'award'],
  mihorario: ['Mi horario de clases', 'calendar-week'],
  detmaterias: ['Detalle de mis materias', 'journal-text'],
  evdocente: ['Evaluación docente', 'star-half'],
  avisos: ['Avisos', 'megaphone'],
  mensajeria: ['Mensajería', 'chat-left-text'],
  kardex: ['Mi kárdex', 'file-earmark-text'],
  cambiopwd: ['Cambio de contraseña', 'key'],
  desc_docs: ['Descarga de documentos', 'download'],
  datospersonales: ['Datos personales', 'person-vcard'],
  reticula: ['Retícula', 'diagram-3'],
  micarrera: ['Mi carrera', 'mortarboard'],
  buzon: ['Buzón', 'envelope']
};
/* Atajos de navegación que usan otras pantallas (por ejemplo, el inicio) */
const DESTINOS = {
  kardex: ['kardex'],
  horario: ['mihorario', 'horario'],
  parciales: ['miscalif', 'parciales'],
  finales: ['fcaliffinales', 'finales']
};

/** "images/mnu_al_mihorario01.gif" -> "mihorario" */
function claveImagen(img) {
  if (!img) return '';
  const src = (img.getAttribute('src') || '').split('/').pop().replace(/\.[a-z]+$/i, '');
  return src.toLowerCase().replace(/^mnu_(al_)?/, '').replace(/_?\d+$/, '');
}

/**
 * Analiza un documento de menú (vivo o descargado) y devuelve sus opciones.
 * Se usa igual para construir el menú y para "delegar" clics en el original.
 */
function analizarMenu(doc, base) {
  const resultado = { secciones: [], opciones: [], salir: null };
  const npVistos = new Set();
  const nodos = $$('a, [onclick]', doc).filter((n) => n.tagName === 'A' || !n.closest('a'));
  nodos.forEach((nodo, indice) => {
    const href = nodo.tagName === 'A' ? (nodo.getAttribute('href') || '').trim() : '';
    let url = null;
    if (href && href !== '#' && !/^javascript:/i.test(href)) {
      try { url = new URL(href, base); } catch (e) { url = null; }
    }
    const img = nodo.querySelector('img');
    const alt = img ? (img.getAttribute('alt') || '').trim() : '';
    const esLigaMenu = !!(url && /mnualumno\.asp$/i.test(url.pathname));
    if (esLigaMenu) {
      const soloSeccion = Array.from(url.searchParams.keys()).every((k) => k === 'tipo' || k === 'np');
      // Ligas que sólo abren o cierran una sección del menú (con o sin np):
      // no son opciones reales. Antes aparecían duplicadas ("Semestre Actual"
      // dentro de "Semestre actual") y al pulsarlas sólo regresaban al inicio.
      if (soloSeccion) {
        const np = url.searchParams.get('np');
        if (np && !npVistos.has(np)) {
          npVistos.add(np);
          const conocido = SECCIONES[np];
          resultado.secciones.push({
            np, url: url.href,
            etiqueta: conocido ? conocido[0] : (textoDe(nodo) || alt || `Sección ${np}`),
            icono: conocido ? conocido[1] : 'folder',
            descripcion: alt, items: []
          });
        }
        return;
      }
    }
    if (url && /sesion-terminada|cerrar_sesion/i.test(url.pathname)) {
      resultado.salir = { url: url.href, target: nodo.getAttribute('target') || '_top' };
      return;
    }
    const onclick = (nodo.getAttribute('onclick') || '').trim();
    if (!url && !onclick) return;
    if (nodo === doc.body) return;
    const clave = claveImagen(img);
    const conocido = SUBMENUS[clave];
    const etiqueta = conocido ? conocido[0] : (textoDe(nodo) || alt || (nodo.getAttribute('title') || '').trim());
    if (!etiqueta) return;
    resultado.opciones.push({
      nodo, indice, etiqueta, clave,
      icono: conocido ? conocido[1] : 'chevron-right',
      descripcion: alt && alt !== etiqueta ? alt : '',
      url: url ? url.href : null,
      target: (nodo.getAttribute('target') || '').trim(),
      onclick,
      // Una liga a otro nivel del menú se reproduce en el menú original
      conScript: !url || !!onclick || esLigaMenu,
      esMenu: esLigaMenu
    });
  });
  return resultado;
}

async function traerHtml(url) {
  const respuesta = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const html = await respuesta.text();
  if (/id=["']?frmLogin/i.test(html)) throw new Error('La sesión parece haber expirado.');
  return html;
}

function moduloShell() {
  const fraIzq = $('#fraizq');
  const fraCont = $('#fracontenido');
  if (!fraIzq || !fraCont) throw new Error('No se encontraron los marcos del portal.');
  const cuerpo = document.body;
  agregarClases(cuerpo, 'cm-shell');
  registrar(() => cuerpo.removeAttribute('data-cm-estado'));

  const estado = {
    actual: null,
    menu: null,
    cosecha: null,
    planos: [],
    ultimoItem: null,
    ultimaUrlMenu: null,      // última página de menú que cargó #fraizq
    menuTemporal: false,      // menú original mostrado sólo para una opción
    temporizadorCarga: null,
    sesion: { ultimo: Date.now(), expirada: false, toast: null }
  };
  let resolverMenu;
  const menuListo = new Promise((r) => { resolverMenu = r; });

  /* ---------------- Construcción de la interfaz ---------------- */
  const navbar = el('header', { class: 'cm-navbar navbar', html: `
    <div class="container-fluid gap-2">
      <button class="btn-icono cm-solo-sesion d-lg-none" type="button" id="cmBotonMenu" aria-controls="cmMenu" aria-label="Abrir menú (Alt + M)">
        <i class="bi bi-list" aria-hidden="true"></i>
      </button>
      <a class="cm-marca" href="#" id="cmMarca" aria-label="CONECT, ir al inicio">
        <span class="cm-logo" aria-hidden="true"><i class="bi bi-mortarboard-fill"></i></span>
        <span class="d-none d-sm-inline"><strong>CONECT</strong> <span class="text-body-secondary fw-normal">ITSPR</span></span>
      </a>
      <div class="cm-titulo-actual text-truncate d-none d-md-block cm-solo-sesion" id="cmTituloActual" aria-live="polite"></div>
      <div class="ms-auto d-flex align-items-center gap-1">
        <button class="cm-btn-buscar cm-solo-sesion" type="button" id="cmAbrirBuscador" aria-label="Buscar sección (Ctrl + K)">
          <i class="bi bi-search" aria-hidden="true"></i>
          <span class="d-none d-md-inline">Buscar sección</span>
          <kbd class="d-none d-md-inline">Ctrl K</kbd>
        </button>
        <button class="btn-icono" type="button" id="cmTema" title="Cambiar tema (Alt + T)"></button>
        <div class="dropdown">
          <button class="btn-icono" type="button" id="cmBotonOpciones" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Opciones del mod" title="Opciones">
            <i class="bi bi-sliders" aria-hidden="true"></i>
          </button>
          <div class="dropdown-menu dropdown-menu-end p-2" style="min-width: 300px">
            <h6 class="dropdown-header px-2">Opciones de CONECT Mod</h6>
            <div class="form-check form-switch mx-2 my-2">
              <input class="form-check-input" type="checkbox" role="switch" id="cmOpResumen">
              <label class="form-check-label small" for="cmOpResumen">Resumen académico en el inicio</label>
            </div>
            <div class="form-check form-switch mx-2 my-2">
              <input class="form-check-input" type="checkbox" role="switch" id="cmOpTeclado">
              <label class="form-check-label small" for="cmOpTeclado">Desbloquear el teclado en el portal</label>
            </div>
            <div class="form-check form-switch mx-2 my-2">
              <input class="form-check-input" type="checkbox" role="switch" id="cmOpMenuOriginal">
              <label class="form-check-label small" for="cmOpMenuOriginal">Mostrar también el menú original</label>
            </div>
            <div class="mx-2 my-2">
              <div class="form-label small mb-1" id="cmEscalaEtiqueta">Tamaño del texto</div>
              <div class="btn-group w-100" role="group" aria-labelledby="cmEscalaEtiqueta">
                <button type="button" class="btn btn-outline-secondary btn-sm" id="cmEscalaMenos" aria-label="Texto más pequeño (Alt + -)" title="Alt + -"><span style="font-size:.8em">A</span></button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="cmEscalaValor" aria-label="Restablecer tamaño" title="Restablecer">100 %</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="cmEscalaMas" aria-label="Texto más grande (Alt + +)" title="Alt + +"><span style="font-size:1.2em">A</span></button>
              </div>
            </div>
            <div class="mx-2 my-2">
              <label class="form-label small mb-1" for="cmOpMinutos">Aviso de inactividad de la sesión</label>
              <select class="form-select form-select-sm" id="cmOpMinutos">
                <option value="10">A los 10 minutos</option>
                <option value="15">A los 15 minutos</option>
                <option value="20">A los 20 minutos (recomendado)</option>
                <option value="30">A los 30 minutos</option>
                <option value="0">Desactivado</option>
              </select>
            </div>
            <hr class="dropdown-divider">
            <button class="dropdown-item rounded small" type="button" id="cmDiagnostico"><i class="bi bi-clipboard-pulse me-2" aria-hidden="true"></i>Diagnóstico del menú</button>
            <button class="dropdown-item rounded small" type="button" id="cmVerAtajos"><i class="bi bi-keyboard me-2" aria-hidden="true"></i>Atajos de teclado</button>
            <button class="dropdown-item rounded small cm-nav-salir" type="button" id="cmDesactivar"><i class="bi bi-power me-2" aria-hidden="true"></i>Desactivar el mod</button>
            <div class="small text-body-secondary px-2 pt-2">Versión ${VERSION}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="cm-progreso" id="cmProgreso" hidden><div></div></div>` });

  const lateral = el('aside', {
    class: 'offcanvas-lg offcanvas-start cm-sidebar cm-solo-sesion',
    tabindex: '-1', id: 'cmMenu', 'aria-labelledby': 'cmMenuTitulo',
    html: `
    <div class="offcanvas-header border-bottom">
      <h2 class="offcanvas-title h6 mb-0" id="cmMenuTitulo">Menú del portal</h2>
      <button type="button" class="btn-close" id="cmCerrarMenu" aria-label="Cerrar menú"></button>
    </div>
    <div class="offcanvas-body p-0">
      <nav class="cm-nav flex-grow-1" id="cmNav" aria-label="Secciones del portal"></nav>
      <div class="px-3 py-2 border-top small text-body-secondary">
        <i class="bi bi-shield-lock me-1" aria-hidden="true"></i>Todo se procesa en tu navegador.
      </div>
    </div>` });

  const modalBuscador = el('div', {
    class: 'modal fade', id: 'cmBuscador', tabindex: '-1', 'aria-labelledby': 'cmBuscadorTitulo', 'aria-hidden': 'true',
    html: `
    <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down" style="margin-top: 10vh">
      <div class="modal-content">
        <div class="modal-header gap-2">
          <h2 class="visually-hidden" id="cmBuscadorTitulo">Buscar sección</h2>
          <div class="input-group">
            <span class="input-group-text bg-transparent"><i class="bi bi-search" aria-hidden="true"></i></span>
            <input id="cmBuscadorInput" class="form-control" type="search" autocomplete="off"
              placeholder="¿Qué sección buscas? Ej.: horario, kárdex, pagos"
              role="combobox" aria-expanded="true" aria-controls="cmBuscadorLista" aria-autocomplete="list">
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body p-2">
          <ul class="list-group list-group-flush" id="cmBuscadorLista" role="listbox" aria-label="Resultados"></ul>
          <p class="text-body-secondary small m-3" id="cmBuscadorVacio" hidden>No se encontraron secciones con ese nombre.</p>
        </div>
        <div class="modal-footer justify-content-start small text-body-secondary gap-3">
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd><i class="bi bi-arrow-up"></i></kbd> <kbd><i class="bi bi-arrow-down"></i></kbd> moverse</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>` });

  const modalAyuda = el('div', {
    class: 'modal fade', id: 'cmAyuda', tabindex: '-1', 'aria-labelledby': 'cmAyudaTitulo', 'aria-hidden': 'true',
    html: `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h5" id="cmAyudaTitulo"><i class="bi bi-keyboard me-2" aria-hidden="true"></i>Atajos de teclado</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body"><table class="cm-tabla"><tbody id="cmAyudaLista"></tbody></table></div>
      </div>
    </div>` });

  const modalDiagnostico = el('div', {
    class: 'modal fade', id: 'cmDiagnosticoModal', tabindex: '-1', 'aria-labelledby': 'cmDiagTitulo', 'aria-hidden': 'true',
    html: `
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h5" id="cmDiagTitulo">Diagnóstico del menú</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body">
          <p class="small text-body-secondary">Contiene sólo las ligas del menú del portal (nombres, direcciones y destinos), sin calificaciones ni contraseñas. Cópialo y compártelo para corregir opciones que no abran.</p>
          <textarea class="form-control font-monospace small" id="cmDiagTexto" rows="14" readonly></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="cmDiagCopiar"><i class="bi bi-clipboard me-1" aria-hidden="true"></i>Copiar</button>
        </div>
      </div>
    </div>` });
  const contenedorToasts = el('div', { class: 'toast-container position-fixed bottom-0 end-0 p-3', style: { zIndex: 1090 } });

  insertar(navbar, cuerpo, 'afterbegin');
  insertar(lateral, navbar, 'afterend');
  insertar(modalBuscador, cuerpo, 'beforeend');
  insertar(modalAyuda, cuerpo, 'beforeend');
  insertar(modalDiagnostico, cuerpo, 'beforeend');
  insertar(contenedorToasts, cuerpo, 'beforeend');

  const ayudaLista = $('#cmAyudaLista');
  ATAJOS.forEach((a) => {
    const teclas = el('td', { class: 'text-nowrap' });
    a.teclas.forEach((t, i) => { if (i) teclas.append(' + '); teclas.append(el('kbd', { text: t })); });
    (a.alt || []).forEach((t) => { teclas.append(' o '); teclas.append(el('kbd', { text: t })); });
    ayudaLista.append(el('tr', {}, [teclas, el('td', { text: a.descripcion })]));
  });

  /* ---------------- Componentes de Bootstrap (con respaldo) ---------------- */
  const bs = () => window.bootstrap || null;
  function mostrarModal(modal) {
    if (bs()) { bs().Modal.getOrCreateInstance(modal).show(); return; }
    modal.style.display = 'block'; modal.classList.add('show'); modal.removeAttribute('aria-hidden');
    modal.querySelectorAll('[data-bs-dismiss="modal"]').forEach((b) => { b.onclick = () => ocultarModal(modal); });
    modal.dispatchEvent(new Event('shown.bs.modal'));
  }
  function ocultarModal(modal) {
    if (bs()) { bs().Modal.getOrCreateInstance(modal).hide(); return; }
    modal.style.display = 'none'; modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true');
  }
  function abrirMenu() {
    if (estado.actual !== 'sesion') return;
    if (window.matchMedia('(min-width: 992px)').matches) {
      const activo = $('#cmNav .cm-nav-enlace.active') || $('#cmNav .cm-nav-enlace, #cmNav .cm-nav-seccion');
      if (activo) activo.focus();
      return;
    }
    if (bs()) bs().Offcanvas.getOrCreateInstance(lateral).show();
    else lateral.classList.add('show');
  }
  function cerrarMenuMovil() {
    if (!lateral.classList.contains('show')) return;
    if (bs()) bs().Offcanvas.getOrCreateInstance(lateral).hide();
    else lateral.classList.remove('show');
  }
  $('#cmBotonMenu').addEventListener('click', abrirMenu);
  $('#cmCerrarMenu').addEventListener('click', cerrarMenuMovil);

  function crearToast({ id, tipo = 'info', titulo, mensaje, acciones = [], autoocultar = true, demora = 6000 }) {
    if (id) { const previo = document.getElementById(id); if (previo) previo.remove(); }
    const iconos = { info: ['info-circle', '--cm-enlace'], exito: ['check-circle', '--cm-exito'], aviso: ['exclamation-triangle', '--cm-aviso'], error: ['x-octagon', '--cm-peligro'] };
    const [icono, color] = iconos[tipo] || iconos.info;
    const urgente = tipo === 'error' || tipo === 'aviso';
    const cerrar = el('button', { type: 'button', class: 'btn-close', 'aria-label': 'Cerrar' });
    const toast = el('div', { class: 'toast', id: id || null, role: urgente ? 'alert' : 'status', 'aria-live': urgente ? 'assertive' : 'polite', 'aria-atomic': 'true' }, [
      el('div', { class: 'toast-header' }, [
        el('i', { class: `bi bi-${icono} me-2`, 'aria-hidden': 'true', style: { color: `var(${color})` } }),
        el('strong', { class: 'me-auto', text: titulo }), cerrar
      ]),
      el('div', { class: 'toast-body' }, [
        el('div', { class: 'cm-toast-mensaje', text: mensaje }),
        acciones.length ? el('div', { class: 'mt-2 d-flex gap-2 flex-wrap' }, acciones.map((a) => el('button', {
          type: 'button', class: `btn btn-sm ${a.clase || 'btn-outline-secondary'}`,
          onclick: () => { cerrarToast(toast); a.fn(); }
        }, [a.texto]))) : null
      ])
    ]);
    contenedorToasts.append(toast);
    cerrar.addEventListener('click', () => cerrarToast(toast));
    if (bs()) {
      toast.addEventListener('hidden.bs.toast', () => toast.remove());
      bs().Toast.getOrCreateInstance(toast, { autohide: autoocultar, delay: demora }).show();
    } else {
      toast.classList.add('show');
      if (autoocultar) setTimeout(() => toast.remove(), demora);
    }
    return toast;
  }
  function cerrarToast(toast) {
    if (!toast || !toast.isConnected) return;
    if (bs()) bs().Toast.getOrCreateInstance(toast).hide(); else toast.remove();
  }

  /* ---------------- Calculadora de parcial ---------------- */
  const calculadora = crearCalculadora({ mostrarModal, ocultarModal, crearToast });
  function abrirCalculadora(opciones) {
    if (estado.actual !== 'sesion') return;
    cerrarMenuMovil();
    calculadora.abrir(opciones || {});
  }

  /* ---------------- Tema ---------------- */
  const botonTema = $('#cmTema');
  function pintarBotonTema() {
    const oscuro = temaEfectivo() === 'dark';
    botonTema.replaceChildren(ico(oscuro ? 'sun' : 'moon-stars'));
    botonTema.setAttribute('aria-label', oscuro ? 'Activar modo claro (Alt + T)' : 'Activar modo oscuro (Alt + T)');
  }
  botonTema.addEventListener('click', () => { alternarTema(); pintarBotonTema(); });
  escuchar(document, 'cmod:tema', pintarBotonTema);
  pintarBotonTema();

  /* ---------------- Opciones ---------------- */
  const opResumen = $('#cmOpResumen');
  const opTeclado = $('#cmOpTeclado');
  const opMenuOriginal = $('#cmOpMenuOriginal');
  const opMinutos = $('#cmOpMinutos');
  opResumen.checked = leerPref(PREF.resumenInicio, '1') === '1';
  opTeclado.checked = leerPref(PREF.teclado, '1') === '1';
  opMenuOriginal.checked = leerPref(PREF.menuOriginal, '0') === '1';
  opMinutos.value = leerPref(PREF.minutosSesion, '20');
  if (opMenuOriginal.checked) cuerpo.classList.add('cm-menu-original');
  registrar(() => cuerpo.classList.remove('cm-menu-original'));

  opResumen.addEventListener('change', () => {
    guardarPref(PREF.resumenInicio, opResumen.checked ? '1' : '0');
    crearToast({ titulo: 'Preferencia guardada', mensaje: 'El cambio se verá la próxima vez que abras el inicio.' });
  });
  opTeclado.addEventListener('change', () => {
    guardarPref(PREF.teclado, opTeclado.checked ? '1' : '0');
    crearToast({ titulo: 'Preferencia guardada', mensaje: 'Se aplicará en la siguiente página que abras.' });
  });
  opMenuOriginal.addEventListener('change', () => {
    guardarPref(PREF.menuOriginal, opMenuOriginal.checked ? '1' : '0');
    cuerpo.classList.toggle('cm-menu-original', opMenuOriginal.checked);
  });
  opMinutos.addEventListener('change', () => {
    guardarPref(PREF.minutosSesion, opMinutos.value);
    registrarActividad();
  });
  const valorEscala = $('#cmEscalaValor');
  const pintarEscala = () => { valorEscala.textContent = `${Math.round(escalaActual() * 100)} %`; };
  $('#cmEscalaMenos').addEventListener('click', () => { cambiarEscala(-1); pintarEscala(); });
  $('#cmEscalaMas').addEventListener('click', () => { cambiarEscala(1); pintarEscala(); });
  valorEscala.addEventListener('click', () => { cambiarEscala(0); pintarEscala(); });
  escuchar(document, 'cmod:escala', pintarEscala);
  pintarEscala();
  $('#cmVerAtajos').addEventListener('click', () => mostrarModal(modalAyuda));
  $('#cmDesactivar').addEventListener('click', desactivarMod);
  $('#cmDiagnostico').addEventListener('click', () => {
    const ruta = (u) => { try { const x = new URL(u); return x.pathname.split('/').pop() + x.search; } catch (e) { return u; } };
    const datos = {
      version: VERSION,
      marcoMenu: ruta((rutaDe(fraIzq) || {}).href || ''),
      marcoContenido: ruta((rutaDe(fraCont) || {}).href || ''),
      secciones: (estado.menu ? estado.menu.secciones : []).map((s) => ({
        np: s.np, seccion: s.etiqueta,
        opciones: s.items.map((i) => ({ etiqueta: i.etiqueta, imagen: i.clave, url: i.url ? ruta(i.url) : null, target: i.target, onclick: (i.onclick || '').slice(0, 200) })),
        ligasOriginales: s.ligasCrudas || []
      }))
    };
    $('#cmDiagTexto').value = JSON.stringify(datos, null, 2);
    mostrarModal(modalDiagnostico);
  });
  $('#cmDiagCopiar').addEventListener('click', async () => {
    const area = $('#cmDiagTexto');
    try { await navigator.clipboard.writeText(area.value); }
    catch (e) { area.select(); document.execCommand('copy'); }
    crearToast({ tipo: 'exito', titulo: 'Copiado', mensaje: 'El diagnóstico está en tu portapapeles.' });
  });

  /* ---------------- Barra de carga y errores ---------------- */
  const progreso = $('#cmProgreso');
  function mostrarCarga() {
    progreso.hidden = false;
    clearTimeout(estado.temporizadorCarga);
    estado.temporizadorCarga = setTimeout(() => {
      progreso.hidden = true;
      crearToast({
        id: 'cmToastLento', tipo: 'aviso', titulo: 'La página está tardando',
        mensaje: 'El portal no ha respondido en 25 segundos. Puede que el servidor esté lento o que tu sesión haya expirado.',
        autoocultar: false,
        acciones: [
          { texto: 'Reintentar', clase: 'btn-primary', fn: () => { mostrarCarga(); try { fraCont.contentWindow.location.reload(); } catch (e) { irInicio(); } } },
          { texto: 'Ir al inicio', fn: irInicio }
        ]
      });
    }, 25000);
  }
  function ocultarCarga() {
    progreso.hidden = true;
    clearTimeout(estado.temporizadorCarga);
    const lento = document.getElementById('cmToastLento');
    if (lento) cerrarToast(lento);
  }
  registrar(() => clearTimeout(estado.temporizadorCarga));

  /* ---------------- Sesión ---------------- */
  function registrarActividad() {
    estado.sesion.ultimo = Date.now();
    estado.sesion.expirada = false;
    if (estado.sesion.toast) { cerrarToast(estado.sesion.toast); estado.sesion.toast = null; }
  }
  function minutosSesion() {
    const v = parseInt(leerPref(PREF.minutosSesion, '20'), 10);
    return Number.isFinite(v) ? v : 20;
  }
  async function mantenerSesion() {
    try {
      await traerHtml(new URL('alu_home.asp?tipo=alu', location.href).href);
      registrarActividad();
      crearToast({ tipo: 'exito', titulo: 'Sesión renovada', mensaje: 'Puedes seguir usando el portal.' });
    } catch (e) {
      crearToast({
        tipo: 'error', titulo: 'No se pudo renovar la sesión', autoocultar: false,
        mensaje: 'Es posible que la sesión ya haya expirado. Vuelve a iniciar sesión para continuar.',
        acciones: [{ texto: 'Iniciar sesión de nuevo', clase: 'btn-primary', fn: () => location.reload() }]
      });
    }
  }
  function revisarSesion() {
    const minutos = minutosSesion();
    if (estado.actual !== 'sesion' || minutos <= 0) return;
    const restante = minutos * 60000 - (Date.now() - estado.sesion.ultimo);
    if (restante <= 0) {
      if (estado.sesion.expirada) return;
      estado.sesion.expirada = true;
      if (estado.sesion.toast) cerrarToast(estado.sesion.toast);
      estado.sesion.toast = crearToast({
        id: 'cmToastSesion', tipo: 'error', titulo: 'Tu sesión pudo haber expirado', autoocultar: false,
        mensaje: `Han pasado ${minutos} minutos sin actividad. Si alguna sección no carga, vuelve a iniciar sesión.`,
        acciones: [
          { texto: 'Iniciar sesión de nuevo', clase: 'btn-primary', fn: () => location.reload() },
          { texto: 'Seguir aquí', fn: () => { estado.sesion.toast = null; } }
        ]
      });
    } else if (restante <= 120000) {
      const seg = Math.ceil(restante / 1000);
      const texto = `Por inactividad, tu sesión podría cerrarse en ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} minutos.`;
      if (estado.sesion.toast && estado.sesion.toast.isConnected) {
        const msg = estado.sesion.toast.querySelector('.cm-toast-mensaje');
        if (msg) msg.textContent = texto;
      } else {
        estado.sesion.toast = crearToast({
          id: 'cmToastSesion', tipo: 'aviso', titulo: 'Tu sesión está por expirar', autoocultar: false, mensaje: texto,
          acciones: [
            { texto: 'Seguir conectado', clase: 'btn-primary', fn: mantenerSesion },
            { texto: 'Cerrar sesión', fn: salir }
          ]
        });
      }
    }
  }
  cadaCierto(revisarSesion, 1000);

  /* ---------------- Navegación ---------------- */
  const urlInicio = () => new URL('alu_home.asp?tipo=alu', location.href).href;
  /* Algunas opciones del portal (p. ej. de Servicio social o Desarrollo
     humano) se abren en el marco del MENÚ y no en el de contenido. En ese
     caso el marco del menú se muestra en el área principal. */
  const modoIzquierdo = () => cuerpo.classList.contains('cm-izq-contenido');
  function salirModoIzquierdo() { cuerpo.classList.remove('cm-izq-contenido'); }
  registrar(salirModoIzquierdo);
  async function restaurarMenu() {
    if (!modoIzquierdo() || !estado.ultimaUrlMenu) return;
    salirModoIzquierdo();
    await navegarYEsperar(fraIzq, estado.ultimaUrlMenu);
  }
  function quitarMenuTemporal() {
    if (!estado.menuTemporal) return;
    estado.menuTemporal = false;
    if (leerPref(PREF.menuOriginal, '0') !== '1') cuerpo.classList.remove('cm-menu-original');
  }
  function irInicio() {
    if (estado.actual !== 'sesion') return;
    estado.ultimoItem = estado.planos.find((i) => i.id === 'inicio') || null;
    marcarActivo(estado.ultimoItem);
    mostrarCarga();
    cerrarMenuMovil();
    quitarMenuTemporal();
    if (modoIzquierdo() && estado.ultimaUrlMenu) {
      // Al recargar el menú, el propio portal abre el inicio en el contenido
      salirModoIzquierdo();
      fraIzq.contentWindow.location.href = estado.ultimaUrlMenu;
      return;
    }
    fraCont.contentWindow.location.href = urlInicio();
  }
  function salir() {
    const destino = (estado.menu && estado.menu.salir) ? estado.menu.salir.url : new URL('sesion-terminada.asp', location.href).href;
    window.location.href = destino;
  }
  function buscarMarco(w, nombre) {
    try {
      for (let i = 0; i < w.frames.length; i++) {
        const f = w.frames[i];
        if (f.name === nombre) return f;
        const r = buscarMarco(f, nombre);
        if (r) return r;
      }
    } catch (e) { /* marco de otro origen */ }
    return null;
  }
  /** Dónde abrir un enlace del menú. El marco del menú está oculto en el shell,
      así que lo que iba dirigido a él se muestra en el área de contenido. */
  function resolverVentana(target) {
    const t = (target || '').toLowerCase();
    if (!t || t === '_self' || t === 'fraizq') return fraCont.contentWindow;
    if (t === '_top' || t === '_parent') return window;
    if (t === '_blank') return null;
    return buscarMarco(window, target) || fraCont.contentWindow;
  }
  function rutaDe(iframe) {
    try {
      const href = iframe.contentWindow.location.href;
      const url = new URL(href);
      return { href, pagina: (url.pathname.split('/').pop() || '').toLowerCase(), np: url.searchParams.get('np') };
    } catch (e) { return null; }
  }
  function navegarYEsperar(iframe, url, ms = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('El menú original no respondió a tiempo.')), ms);
      iframe.addEventListener('load', () => { clearTimeout(t); resolve(); }, { once: true });
      iframe.contentWindow.location.href = url;
    });
  }
  /** Reproduce el clic en el menú original (para opciones que usan JavaScript). */
  async function delegarClic(item) {
    const ruta = rutaDe(fraIzq);
    if (!ruta || ruta.pagina !== 'mnualumno.asp' || ruta.np !== item.np) {
      await navegarYEsperar(fraIzq, item.urlSeccion);
    }
    const doc = fraIzq.contentDocument;
    const { opciones } = analizarMenu(doc, fraIzq.contentWindow.location.href);
    const objetivo = opciones.find((o) => o.etiqueta === item.etiqueta) || opciones.find((o) => o.indice === item.indice);
    if (!objetivo) throw new Error('No se encontró la opción en el menú original.');
    objetivo.nodo.click();
    setTimeout(() => { if (!progreso.hidden) ocultarCarga(); }, 4000);
  }
  async function ejecutarItem(item) {
    if (!item) return;
    cerrarMenuMovil();
    if (item.accion) { item.accion(); return; }
    estado.ultimoItem = item;
    marcarActivo(item);
    mostrarCarga();
    quitarMenuTemporal();
    try {
      await restaurarMenu();
      if (!item.conScript && item.url) {
        const destino = resolverVentana(item.target);
        if (!destino) { window.open(item.url, '_blank', 'noopener'); ocultarCarga(); return; }
        destino.location.href = item.url;
        return;
      }
      await delegarClic(item);
      if (item.esMenu) {
        // Abre otro nivel del menú original: se muestra junto al contenido
        estado.menuTemporal = true;
        cuerpo.classList.add('cm-menu-original');
      }
    } catch (e) {
      ocultarCarga();
      avisar('No se pudo abrir la opción del menú.', e);
      crearToast({
        tipo: 'error', titulo: 'No se pudo abrir la sección', autoocultar: false,
        mensaje: `"${item.etiqueta}" no respondió. Puedes intentarlo desde el menú original del portal.`,
        acciones: [{ texto: 'Mostrar menú original', clase: 'btn-primary', fn: () => cuerpo.classList.add('cm-menu-original') }]
      });
    }
  }
  function abrirSeccionOriginal(seccion) {
    cuerpo.classList.add('cm-menu-original');
    fraIzq.contentWindow.location.href = seccion.url;
    crearToast({ titulo: seccion.etiqueta, mensaje: 'Esta sección se muestra con el menú original del portal, a la izquierda del contenido.' });
  }

  /* ---------------- Menú lateral ---------------- */
  const nav = $('#cmNav');
  function marcarActivo(item) {
    $$('.cm-nav-enlace.active', nav).forEach((a) => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
    if (!item || !item.enlace) return;
    item.enlace.classList.add('active');
    item.enlace.setAttribute('aria-current', 'page');
    const sub = item.enlace.closest('.cm-nav-sub');
    if (sub && !sub.classList.contains('show')) {
      const boton = nav.querySelector(`[aria-controls="${sub.id}"]`);
      if (boton) boton.click();
    }
  }
  function enlaceNav(item, extraClase = '') {
    const enlace = el('button', {
      type: 'button', class: `cm-nav-enlace ${extraClase}`.trim(),
      title: item.descripcion || null
    }, [ico(item.icono), el('span', { text: item.etiqueta })]);
    enlace.addEventListener('click', () => ejecutarItem(item));
    item.enlace = enlace;
    return el('li', {}, enlace);
  }
  function pintarCargandoMenu() {
    nav.replaceChildren(el('div', { class: 'p-3 small text-body-secondary d-flex align-items-center gap-2' }, [
      el('span', { class: 'spinner-border spinner-border-sm', role: 'status', 'aria-hidden': 'true' }),
      'Cargando el menú del portal...'
    ]));
  }
  function pintarMenu(datos) {
    const planos = [];
    const lista = el('ul');
    const inicio = { id: 'inicio', etiqueta: 'Inicio', icono: 'house-door', seccion: '', accion: irInicio, descripcion: 'Panel de inicio con tu resumen' };
    planos.push(inicio);
    lista.append(enlaceNav(inicio));
    lista.append(el('li', { class: 'cm-nav-titulo', text: 'Secciones' }));

    datos.secciones.forEach((s, i) => {
      const idSub = `cmSub${i}`;
      const items = s.items.length ? s.items : [{
        etiqueta: 'Abrir sección', icono: 'box-arrow-up-right', seccion: s.etiqueta,
        descripcion: s.descripcion, accion: () => abrirSeccionOriginal(s)
      }];
      const boton = el('button', {
        type: 'button', class: 'cm-nav-seccion', 'aria-expanded': 'false', 'aria-controls': idSub, title: s.descripcion || null
      }, [ico(s.icono), el('span', { text: s.etiqueta }), ico('chevron-down', 'cm-chevron')]);
      const sub = el('ul', { class: 'cm-nav-sub', id: idSub });
      items.forEach((it) => {
        it.seccion = s.etiqueta;
        it.iconoSeccion = s.icono;
        sub.append(enlaceNav(it));
        planos.push(it);
      });
      boton.addEventListener('click', () => {
        const abierto = sub.classList.toggle('show');
        boton.setAttribute('aria-expanded', String(abierto));
      });
      lista.append(el('li', {}, [boton, sub]));
    });

    lista.append(el('li', { class: 'cm-nav-titulo', text: 'Herramientas' }));
    const itemCalc = { id: 'calculadora', etiqueta: 'Calculadora de parcial', icono: 'calculator', seccion: 'Herramientas', accion: () => abrirCalculadora(), descripcion: 'Estima tu calificación con los indicadores y sus porcentajes' };
    planos.push(itemCalc);
    lista.append(enlaceNav(itemCalc));

    lista.append(el('li', { class: 'cm-nav-titulo', text: 'Cuenta' }));
    const itemSalir = { id: 'salir', etiqueta: 'Salir del portal', icono: 'box-arrow-right', seccion: 'Cuenta', accion: salir, descripcion: 'Cerrar la sesión' };
    planos.push(itemSalir);
    lista.append(enlaceNav(itemSalir, 'cm-nav-salir'));

    if (datos.errores) {
      nav.replaceChildren(el('div', { class: 'cm-alerta cm-alerta-aviso m-2 small' }, [
        ico('exclamation-triangle'),
        el('div', { text: 'Algunas secciones no se pudieron leer. Ábrelas con el menú original (Opciones).' })
      ]), lista);
    } else {
      nav.replaceChildren(lista);
    }
    estado.planos = planos;
    if (estado.ultimoItem) {
      const igual = planos.find((p) => p.etiqueta === estado.ultimoItem.etiqueta && p.seccion === estado.ultimoItem.seccion);
      if (igual) marcarActivo(igual);
    } else {
      marcarActivo(inicio);
    }
  }
  async function cosecharMenu() {
    if (estado.cosecha) return estado.cosecha;
    pintarCargandoMenu();
    estado.cosecha = (async () => {
      const base = fraIzq.contentWindow.location.href;
      const principal = analizarMenu(fraIzq.contentDocument, base);
      if (!principal.secciones.length) throw new Error('No se encontraron secciones en el menú del portal.');
      let errores = 0;
      await Promise.all(principal.secciones.map(async (s) => {
        try {
          const html = await traerHtml(s.url);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const { opciones } = analizarMenu(doc, s.url);
          // Para el diagnóstico: sólo las ligas del menú (sin datos personales)
          s.ligasCrudas = $$('a, [onclick]', doc).filter((n) => n !== doc.body)
            .map((n) => n.outerHTML.replace(/\s+/g, ' ').replace(/onMouse\w+="[^"]*"/gi, '').slice(0, 400));
          const vistos = new Set();
          s.items = opciones.filter((o) => {
            const k = `${o.etiqueta}|${o.url || ''}`;
            if (vistos.has(k)) return false;
            vistos.add(k);
            return true;
          }).map((o) => ({ ...o, nodo: null, np: s.np, urlSeccion: s.url }));
        } catch (e) {
          errores++;
          avisar(`No se pudo leer la sección ${s.etiqueta}.`, e);
        }
      }));
      return { secciones: principal.secciones, salir: principal.salir, errores };
    })();
    try {
      estado.menu = await estado.cosecha;
      pintarMenu(estado.menu);
      resolverMenu(true);
    } catch (e) {
      avisar('No se pudo construir el menú unificado; se muestra el menú original.', e);
      cuerpo.classList.add('cm-menu-original');
      nav.replaceChildren(el('div', { class: 'cm-alerta cm-alerta-error m-2 small' }, [
        ico('x-octagon'), el('div', { text: 'No se pudo leer el menú del portal. Usa el menú original que aparece junto al contenido.' })
      ]));
      resolverMenu(false);
    } finally {
      estado.cosecha = null;
    }
    return estado.menu;
  }
  function buscarDestino(clave) {
    const claves = DESTINOS[clave] || [clave];
    return estado.planos.find((p) => claves.includes(p.clave))
      || estado.planos.find((p) => claves.some((k) => normalizar(p.etiqueta).includes(k)));
  }

  /* ---------------- Buscador rápido ---------------- */
  const entrada = $('#cmBuscadorInput');
  const listaRes = $('#cmBuscadorLista');
  const vacio = $('#cmBuscadorVacio');
  let resultados = [];
  let activoIdx = 0;
  function accionesExtra() {
    return [
      { etiqueta: 'Cambiar entre modo claro y oscuro', icono: 'circle-half', seccion: 'Mod', accion: () => { alternarTema(); } },
      { etiqueta: 'Imprimir o exportar la página actual', icono: 'printer', seccion: 'Mod', accion: imprimirActual },
      { etiqueta: 'Agrandar el texto', icono: 'zoom-in', seccion: 'Mod', accion: () => cambiarEscala(1) },
      { etiqueta: 'Reducir el texto', icono: 'zoom-out', seccion: 'Mod', accion: () => cambiarEscala(-1) },
      { etiqueta: 'Atajos de teclado', icono: 'keyboard', seccion: 'Mod', accion: () => mostrarModal(modalAyuda) }
    ];
  }
  function filtrar() {
    const q = normalizar(entrada.value);
    const todos = estado.planos.concat(accionesExtra());
    resultados = todos.map((it) => {
      const nombre = normalizar(it.etiqueta);
      const contexto = normalizar(`${it.seccion || ''} ${it.descripcion || ''}`);
      let puntos = 0;
      if (!q) puntos = 1;
      else if (nombre.startsWith(q)) puntos = 4;
      else if (nombre.split(/\s+/).some((p) => p.startsWith(q))) puntos = 3;
      else if (nombre.includes(q)) puntos = 2;
      else if (contexto.includes(q)) puntos = 1;
      return { it, puntos };
    }).filter((r) => r.puntos > 0).sort((a, b) => b.puntos - a.puntos).slice(0, 30).map((r) => r.it);
    activoIdx = 0;
    pintarResultados();
  }
  function pintarResultados() {
    listaRes.replaceChildren(...resultados.map((it, i) => {
      const li = el('li', {
        class: `list-group-item list-group-item-action${i === activoIdx ? ' active' : ''}`,
        role: 'option', id: `cmOpc${i}`, 'aria-selected': String(i === activoIdx)
      }, [ico(it.icono || 'chevron-right'), el('div', {}, [
        el('div', { text: it.etiqueta }),
        it.seccion ? el('small', { text: it.seccion }) : null
      ])]);
      li.addEventListener('click', () => elegir(i));
      li.addEventListener('mousemove', () => { if (activoIdx !== i) { activoIdx = i; pintarResultados(); } });
      return li;
    }));
    vacio.hidden = resultados.length > 0;
    entrada.setAttribute('aria-activedescendant', resultados.length ? `cmOpc${activoIdx}` : '');
    const activo = document.getElementById(`cmOpc${activoIdx}`);
    if (activo) activo.scrollIntoView({ block: 'nearest' });
  }
  function elegir(i) {
    const it = resultados[i];
    if (!it) return;
    ocultarModal(modalBuscador);
    ejecutarItem(it);
  }
  entrada.addEventListener('input', filtrar);
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activoIdx = Math.min(resultados.length - 1, activoIdx + 1); pintarResultados(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activoIdx = Math.max(0, activoIdx - 1); pintarResultados(); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(activoIdx); }
  });
  modalBuscador.addEventListener('shown.bs.modal', () => entrada.focus());
  function abrirBuscador() {
    if (estado.actual !== 'sesion') return;
    entrada.value = '';
    filtrar();
    mostrarModal(modalBuscador);
    setTimeout(() => entrada.focus(), 50);
  }
  $('#cmAbrirBuscador').addEventListener('click', abrirBuscador);
  $('#cmMarca').addEventListener('click', (e) => { e.preventDefault(); irInicio(); });

  /* ---------------- Impresión y desplazamiento ---------------- */
  function ventanasContenido() {
    const lista = [];
    const recorrer = (w) => {
      try {
        void w.document; // lanza si es de otro origen
        lista.push(w);
        for (let i = 0; i < w.frames.length; i++) recorrer(w.frames[i]);
      } catch (e) { /* ignorar */ }
    };
    recorrer(fraCont.contentWindow);
    return lista;
  }
  function imprimirActual() {
    const ventanas = ventanasContenido();
    const conBoton = ventanas.slice().reverse().find((w) => w.document.querySelector('[data-cm-accion="imprimir"]'));
    (conBoton || fraCont.contentWindow).print();
  }
  function irArriba() {
    ventanasContenido().forEach((w) => { try { w.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* nada */ } });
  }

  /* ---------------- Atajos ---------------- */
  function ejecutarAtajo(accion) {
    switch (accion) {
      case 'buscar': abrirBuscador(); break;
      case 'inicio': irInicio(); break;
      case 'menu': abrirMenu(); break;
      case 'tema': alternarTema(); break;
      case 'imprimir': imprimirActual(); break;
      case 'arriba': irArriba(); break;
      case 'ayuda': mostrarModal(modalAyuda); break;
      case 'mas': cambiarEscala(1); break;
      case 'menos': cambiarEscala(-1); break;
      case 'calculadora': abrirCalculadora(); break;
      default: break;
    }
  }
  escuchar(window, 'keydown', (e) => {
    const accion = accionDeTecla(e);
    if (!accion) return;
    if (accion === 'buscar' && modalBuscador.classList.contains('show')) return;
    e.preventDefault();
    ejecutarAtajo(accion);
  }, true);

  /* ---------------- Desactivar ---------------- */
  function desactivarMod() {
    guardarPref(PREF.activo, '0');
    // Revierte cada marco sin recargar (recargar cerraría la sesión del portal)
    const revertirEn = (w) => {
      try {
        for (let i = 0; i < w.frames.length; i++) revertirEn(w.frames[i]);
        if (w !== window && typeof w.__cmodRevertir === 'function') w.__cmodRevertir();
      } catch (e) { /* ignorar */ }
    };
    revertirEn(window);
    revertir();
    botonReactivar();
  }

  /* ---------------- Estados según lo que carga cada marco ---------------- */
  function fijarEstado(nuevo) {
    if (estado.actual === nuevo) return;
    estado.actual = nuevo;
    cuerpo.setAttribute('data-cm-estado', nuevo);
    if (nuevo === 'sesion') registrarActividad();
    if (nuevo === 'login') { estado.menu = null; estado.planos = []; }
  }
  function alCargarIzquierdo() {
    const ruta = rutaDe(fraIzq);
    if (!ruta || ruta.href === 'about:blank') return;
    let doc = null;
    try { doc = fraIzq.contentDocument; } catch (e) { doc = null; }
    // Se decide por el contenido y no sólo por la URL: tras el login el menú
    // podría llegar desde valida.asp sin redirección.
    const esLogin = ruta.pagina === 'login.htm' || !!(doc && doc.getElementById('frmLogin'));
    const esMenu = !!(doc && doc.querySelector('a[href*="mnualumno.asp"][href*="np="]'));
    if (esLogin) {
      salirModoIzquierdo();
      fijarEstado('login');
    } else if (esMenu) {
      estado.ultimaUrlMenu = ruta.href;
      salirModoIzquierdo();
      fijarEstado('sesion');
    } else if (estado.actual === 'sesion') {
      // Una opción del portal se abrió en el marco del menú: se muestra grande
      cuerpo.classList.add('cm-izq-contenido');
      ocultarCarga();
      registrarActividad();
      try { fraIzq.contentWindow.addEventListener('pagehide', () => mostrarCarga()); } catch (e) { /* nada */ }
      actualizarTitulo();
    } else {
      fijarEstado('otro'); // p. ej. un mensaje de error del login: queda visible
    }
    if (estado.actual === 'sesion' && !estado.menu) cosecharMenu();
  }
  function actualizarTitulo() {
    const salida = $('#cmTituloActual');
    let titulo = '';
    try {
      const marco = modoIzquierdo() ? fraIzq : fraCont;
      const doc = marco.contentDocument;
      const ruta = rutaDe(marco);
      if (ruta && ruta.pagina === 'alu_home.asp') titulo = 'Inicio';
      else {
        const accion = doc.getElementById('cmdimprimir') || doc.getElementById('cmdhome');
        const tabla = accion ? accion.closest('table') : null;
        if (tabla && tabla.rows[0] && tabla.rows[0].cells[0]) titulo = textoDe(tabla.rows[0].cells[0]);
        if (!titulo) titulo = (doc.title || '').trim();
      }
    } catch (e) { /* nada */ }
    if (!titulo && estado.ultimoItem) titulo = estado.ultimoItem.etiqueta;
    salida.textContent = titulo;
    document.title = titulo ? `${titulo} - CONECT` : 'CONECT - Portal Escolar';
  }
  function alCargarContenido() {
    ocultarCarga();
    registrarActividad();
    const ruta = rutaDe(fraCont);
    if (!ruta) return;
    try {
      fraCont.contentWindow.addEventListener('pagehide', () => { if (estado.actual === 'sesion') mostrarCarga(); });
    } catch (e) { /* nada */ }
    if (estado.actual === 'sesion') {
      const coincide = estado.planos.find((p) => p.url && p.url === ruta.href);
      if (coincide) { estado.ultimoItem = coincide; marcarActivo(coincide); }
      else if (ruta.pagina === 'alu_home.asp') marcarActivo(estado.planos.find((p) => p.id === 'inicio'));
    }
    actualizarTitulo();
  }
  escuchar(fraIzq, 'load', alCargarIzquierdo);
  escuchar(fraCont, 'load', alCargarContenido);
  // Los marcos pudieron cargar antes que este script
  alCargarIzquierdo();
  if (!estado.actual) fijarEstado('login');
  alCargarContenido();

  /* ---------------- API para los demás marcos ---------------- */
  window.CMOD = {
    version: VERSION,
    atajo: (accion) => ejecutarAtajo(accion),
    irA: (clave) => { const d = buscarDestino(clave); if (d) ejecutarItem(d); return !!d; },
    existe: (clave) => !!buscarDestino(clave),
    menuListo: () => (estado.menu ? Promise.resolve(true) : menuListo),
    actividad: () => registrarActividad(),
    toast: (opciones) => crearToast(opciones),
    calculadora: (opciones) => abrirCalculadora(opciones)
  };
  registrar(() => { try { delete window.CMOD; } catch (e) { window.CMOD = undefined; } });
  log(`Shell activo (versión ${VERSION}).`);
}

/** Botón mínimo (sin Bootstrap) para volver a activar el mod. */
function botonReactivar() {
  if ($('.cm-reactivar')) return;
  const estilo = el('style', { text: '.cm-reactivar{position:fixed;right:12px;bottom:12px;z-index:99999;font:600 13px/1 system-ui,sans-serif;padding:9px 12px;border-radius:8px;background:#1b396a;color:#fff;border:0;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}' });
  estilo.className = 'cm-reactivar-estilo';
  const boton = el('button', {
    class: 'cm-reactivar', type: 'button',
    title: 'Recarga el portal con el mod activo. Tendrás que iniciar sesión de nuevo.'
  }, ['Activar CONECT Mod']);
  boton.addEventListener('click', () => { guardarPref(PREF.activo, '1'); location.reload(); });
  document.head.appendChild(estilo);
  document.body.appendChild(boton);
}

/* ==========================================================================
   PANTALLA: login.htm (dentro de #fraizq)
   Sólo cambia la presentación. El mod NUNCA lee el valor de #usuario ni de
   #pwd: el aviso de Bloq Mayús usa getModifierState() y el botón "mostrar"
   sólo cambia el tipo del campo.
   ========================================================================== */
/* ==========================================================================
   ARREGLO DE ACCESO (login.htm)
   El portal valida cada tecla con validarAlfanumerico(): rechaza símbolos,
   la ñ y acentos, muestra un alert hasta con Enter y, en muchos teclados de
   celular (que reportan el código 229), rechaza TODAS las teclas. Además
   limita la contraseña a 10 caracteres. Eso impide entrar a algunos alumnos.
   Aquí se quita sólo esa validación del navegador; el formulario se envía
   igual que siempre a valida.asp, que es quien realmente verifica.
   El mod no lee ni modifica lo que escribes.
   ========================================================================== */
function arregloLogin() {
  const usuario = document.getElementById('usuario');
  const clave = document.getElementById('pwd');
  if (!usuario || !clave) return false;
  [usuario, clave].forEach((campo) => {
    campo.removeAttribute('onkeypress');
    campo.onkeypress = null;
  });
  clave.removeAttribute('maxlength');
  log('Validación de teclas del login desactivada.');
  return true;
}

function moduloLogin() {
  const form = $('#frmLogin');
  const usuario = $('#usuario');
  const clave = $('#pwd');
  const tipo = $('select[name="tipo"]');
  const enviar = $('#btnEnviar');
  if (!form || !usuario || !clave || !enviar) throw new Error('El formulario de acceso cambió de estructura.');

  agregarClases(document.body, 'cm-login');
  instalarAtajosLocales();

  // Clases de Bootstrap y etiquetas accesibles
  agregarClases(usuario, 'form-control');
  agregarClases(clave, 'form-control');
  if (tipo) {
    agregarClases(tipo, 'form-select');
    if (!tipo.id) fijarAtributo(tipo, 'id', 'cmTipoUsuario');
  }
  const etiquetas = $$('label', form);
  const destinos = [usuario, clave, tipo];
  etiquetas.forEach((l, i) => { if (destinos[i] && destinos[i].id && !l.htmlFor) fijarAtributo(l, 'for', destinos[i].id); });
  fijarAtributo(usuario, 'autocomplete', 'username');
  fijarAtributo(clave, 'autocomplete', 'current-password');
  fijarAtributo(usuario, 'autocapitalize', 'characters');
  fijarAtributo(usuario, 'spellcheck', 'false');

  // Título y subtítulo dentro de la tarjeta
  const titulo = $('big');
  if (titulo) {
    insertar(el('p', { class: 'text-body-secondary small mb-0 mt-1', text: 'Ingresa con tu número de control y contraseña del portal.' }), titulo, 'afterend');
  }

  // Botón para mostrar u ocultar la contraseña
  const campo = envolver(clave, { class: 'cm-campo-clave' });
  const ver = el('button', { type: 'button', class: 'cm-ver-clave', 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false', title: 'Mostrar contraseña' }, [ico('eye')]);
  insertar(ver, clave, 'afterend');
  ver.addEventListener('click', () => {
    const mostrar = clave.type === 'password';
    clave.type = mostrar ? 'text' : 'password';
    ver.replaceChildren(ico(mostrar ? 'eye-slash' : 'eye'));
    ver.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
    ver.setAttribute('aria-pressed', String(mostrar));
    clave.focus();
  });
  registrar(() => { clave.type = 'password'; });

  // Aviso de Bloq Mayús (no lee lo que se escribe)
  const mayus = el('div', { class: 'cm-mayus', role: 'status', hidden: true }, [ico('capslock', 'me-1'), 'Bloq Mayús está activado.']);
  insertar(mayus, campo, 'afterend');
  const revisarMayus = (e) => {
    if (typeof e.getModifierState === 'function') mayus.hidden = !e.getModifierState('CapsLock');
  };
  escuchar(clave, 'keydown', revisarMayus);
  escuchar(clave, 'keyup', revisarMayus);
  escuchar(clave, 'blur', () => { mayus.hidden = true; });

  // La validación tecla por tecla del portal se quita en arregloLogin()
  // (se aplica aunque el diseño del mod esté desactivado).
  insertar(el('p', { class: 'small text-body-secondary mb-3', style: { marginTop: '-.6rem' } }, [
    ico('check2-circle', 'me-1'), 'Se aceptan todos los caracteres en la contraseña.'
  ]), mayus, 'afterend');

  // Estado de carga al enviar (sin cancelar el envío original)
  escuchar(form, 'submit', () => {
    setTimeout(() => {
      enviar.disabled = true;
      enviar.value = 'Verificando...';
    }, 0);
    setTimeout(() => { enviar.disabled = false; enviar.value = 'Entrar al Portal'; }, 15000);
  });

  insertar(el('p', { class: 'cm-login-pie' }, [
    ico('shield-lock', 'me-1'),
    'CONECT Mod sólo cambia el diseño: no lee ni guarda tu contraseña.'
  ]), form, 'beforeend');

  // Respaldo: si por alguna razón el foco inicial no llegó al usuario
  if (document.activeElement === document.body) usuario.focus();
}

/* ==========================================================================
   PANTALLA: bienvenido.asp (página pública dentro de portal_contenido.asp)
   ========================================================================== */
function moduloBienvenida() {
  agregarClases(document.body, 'cm-bienvenida');
  instalarAtajosLocales();
  const nota = $('.alert.alert-warning');
  if (nota) {
    const icono = ico('info-circle', 'me-2');
    insertar(icono, nota, 'afterbegin');
    agregarClases(nota, 'd-flex', 'align-items-start');
  }
}

/* ==========================================================================
   CONTENIDO: base común para todas las páginas de #fracontenido
   ========================================================================== */
function encabezadoPortal() {
  const accion = $('#cmdimprimir') || $('#cmdhome');
  const tabla = accion ? accion.closest('table') : null;
  if (!tabla) return null;
  agregarClases(tabla, 'cm-encabezado', 'cm-no-imprimir');
  [$('#cmdimprimir'), $('#cmdhome')].forEach((etq) => {
    if (!etq) return;
    fijarAtributo(etq, 'role', 'button');
    fijarAtributo(etq, 'tabindex', '0');
    escuchar(etq, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); etq.click(); }
    });
  });
  return tabla;
}

/**
 * Página contenedora (p. ej. alu_contenido.asp): título del portal + un iframe.
 * El iframe se ajusta al alto disponible para que haya UN solo desplazamiento
 * (el de la página interna) y no queden áreas cortadas ni scrolls anidados.
 */
function prepararEnvoltura() {
  if (!esRaizDeContenido() || PAGINA === 'portal_contenido.asp') return false;
  const marcos = $$('iframe');
  if (marcos.length !== 1) return false;
  const marco = marcos[0];
  const raiz = document.documentElement;
  raiz.classList.add('cm-envoltura');
  registrar(() => raiz.classList.remove('cm-envoltura'));
  fijarEstilo(marco, 'display', 'block');
  fijarEstilo(marco, 'width', '100%');
  fijarEstilo(marco, 'border', '0');
  fijarEstilo(marco, 'height', `${window.innerHeight}px`);
  if (marco.getAttribute('scrolling') === 'no') fijarAtributo(marco, 'scrolling', 'auto');

  const ajustar = () => {
    const arriba = marco.getBoundingClientRect().top + window.scrollY;
    const alto = Math.max(240, Math.floor(window.innerHeight - arriba - 4));
    marco.style.setProperty('height', `${alto}px`, 'important');
  };
  const revisar = () => {
    let mejorada = false;
    try { mejorada = marco.contentDocument.documentElement.dataset.cmMejorada === '1'; } catch (e) { mejorada = false; }
    const encabezado = $('table.cm-encabezado');
    if (encabezado) encabezado.classList.toggle('cm-oculto', mejorada);
    ajustar();
  };
  ajustar();
  // Si hay contenido después del iframe, este modo lo ocultaría: se cancela.
  if (raiz.scrollHeight - window.innerHeight > 24) {
    raiz.classList.remove('cm-envoltura');
    marco.style.removeProperty('height');
    return false;
  }
  escuchar(window, 'resize', ajustar);
  escuchar(marco, 'load', () => setTimeout(revisar, 30));
  window.__cmodEnvoltura = { revisar };
  registrar(() => { delete window.__cmodEnvoltura; });
  revisar();
  return true;
}

/** Avisa a la página contenedora que esta página ya tiene el diseño del mod. */
function marcarMejorada() {
  document.documentElement.dataset.cmMejorada = '1';
  registrar(() => { delete document.documentElement.dataset.cmMejorada; });
  try {
    if (window.parent !== window && window.parent.__cmodEnvoltura) window.parent.__cmodEnvoltura.revisar();
  } catch (e) { /* nada */ }
}

/* --------------------------------------------------------------------------
   Contraste automático: en páginas del portal que el mod no conoce, algunos
   bloques traen su propio fondo (blanco, gris claro) y heredan el texto claro
   del modo oscuro, o al revés. Se revisa cada elemento con texto y, si el
   contraste con su fondo real es menor a 4.5:1, se fuerza un color legible.
   -------------------------------------------------------------------------- */
function colorRgba(texto) {
  const m = String(texto).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function luminancia({ r, g, b }) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function fondoEfectivo(nodo) {
  for (let n = nodo; n && n.nodeType === 1; n = n.parentElement) {
    const c = colorRgba(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0.5) return c;
  }
  return colorRgba(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
}
function ajustarContraste() {
  $$('.cm-texto-oscuro, .cm-texto-claro').forEach((n) => n.classList.remove('cm-texto-oscuro', 'cm-texto-claro'));
  const candidatos = $$('body *').filter((n) => !n.closest('[data-cmod], script, style')
    && Array.from(n.childNodes).some((t) => t.nodeType === 3 && t.textContent.trim()));
  candidatos.forEach((n) => {
    const estilo = getComputedStyle(n);
    if (estilo.visibility === 'hidden' || estilo.display === 'none') return;
    const texto = colorRgba(estilo.color);
    if (!texto) return;
    const fondo = fondoEfectivo(n);
    if (contraste(texto, fondo) >= 4.5) return;
    n.classList.add(luminancia(fondo) > 0.35 ? 'cm-texto-oscuro' : 'cm-texto-claro');
  });
}
function instalarContraste() {
  const correr = () => { try { ajustarContraste(); } catch (e) { avisar('No se pudo revisar el contraste.', e); } };
  registrar(() => $$('.cm-texto-oscuro, .cm-texto-claro').forEach((n) => n.classList.remove('cm-texto-oscuro', 'cm-texto-claro')));
  // Se repite cuando terminan de cargar los estilos y cuando cambia el tema
  [300, 1200, 3000].forEach((ms) => setTimeout(correr, ms));
  escuchar(window, 'load', correr);
  escuchar(document, 'cmod:tema', () => setTimeout(correr, 50));
}

function prepararContenido() {
  agregarClases(document.body, 'cm-contenido');
  restaurarTeclado();
  encabezadoPortal();
  instalarAtajosLocales();
  const esEnvoltura = prepararEnvoltura();
  if (!esEnvoltura) instalarVolverArriba();
  instalarContraste();
  // Cada carga dentro del contenido cuenta como actividad de la sesión
  const api = apiShell();
  if (api) api.actividad();
  return esEnvoltura;
}

/** ¿Es una tabla de datos (no de maquetación)? */
function esTablaDeDatos(tabla) {
  if (tabla.closest('[data-cmod], .cm-encabezado')) return false;
  if (tabla.classList.contains('cm-encabezado')) return false;
  if (tabla.querySelector('table')) return false;
  const conBorde = parseInt(tabla.getAttribute('border') || '0', 10) > 0;
  return conBorde || !!tabla.querySelector('th');
}

/* ==========================================================================
   PANTALLA GENÉRICA: cualquier página del portal sin módulo específico
   ========================================================================== */
function moduloGenerico() {
  prepararContenido();
  $$('table').filter(esTablaDeDatos).forEach((t) => estilizarTablaOriginal(t));
  $$('pre').forEach((p) => agregarClases(p, 'cm-original'));
}

/* ==========================================================================
   PANTALLA: alu_home.asp (inicio después de iniciar sesión)
   - Tarjeta de perfil con los datos que ya muestra la página
   - Panel con promedio, créditos, materias y gráfica por semestre.
     Los datos se calculan leyendo alu_kardex.asp del MISMO portal, en
     memoria; no se guardan ni se envían a ningún otro lado.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Lectura del kárdex (texto preformateado de ancho fijo)
   -------------------------------------------------------------------------- */
const ACREDITACION = {
  0: 'Revalidación, equivalencia o convalidación',
  1: '1er curso, 1a oportunidad',
  2: '1er curso, 2a oportunidad',
  4: '2do curso, 1a oportunidad',
  5: '2do curso, 2a oportunidad',
  6: '3er curso, 1a oportunidad'
};
const PERIODOS = { 1: 'ENE-JUN', 2: 'AGO-DIC', 3: 'VERANO' };

function parsearKardex(texto) {
  const lineas = String(texto).split(/\r?\n/);
  const materias = [];
  // Cola de cada renglón: Cred Cal Acr Sem Per Año [Sem Per Año]{0,2}
  const reCola = /\s(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d{4})((?:\s+\d+\s+\d+\s+\d{4}){0,2})\s*$/;
  for (const linea of lineas) {
    if (!/^\S/.test(linea)) continue;
    const m = linea.match(reCola);
    if (!m) continue;
    const cabeza = linea.slice(0, m.index);
    // Columnas fijas: clave (0-4), clave oficial (5-13), materia (14+)
    let clave = cabeza.slice(0, 5).trim();
    let oficial = cabeza.slice(5, 14).trim();
    let nombre = cabeza.slice(14).trim().replace(/\s+/g, ' ');
    if (/\s/.test(clave) || /\s/.test(oficial) || !nombre) {
      const partes = cabeza.trim().split(/\s{2,}/);
      clave = partes.shift() || '';
      oficial = partes.length > 1 ? partes.shift() : '';
      nombre = partes.join(' ').replace(/\s+/g, ' ');
    }
    const intentos = [{ sem: +m[4], per: +m[5], anio: +m[6] }];
    const extra = (m[7] || '').trim().split(/\s+/).filter(Boolean).map(Number);
    for (let i = 0; i + 2 < extra.length; i += 3) intentos.push({ sem: extra[i], per: extra[i + 1], anio: extra[i + 2] });
    materias.push({
      clave, oficial, nombre,
      creditos: +m[1], calificacion: +m[2], acreditacion: +m[3],
      intentos, ultimo: intentos[intentos.length - 1]
    });
  }
  const buscar = (re) => { const r = String(texto).match(re); return r ? r : null; };
  const prom = buscar(/Promedio\s+General\s*:\s*([\d.]+)/i);
  const cred = buscar(/Cr[eé]ditos\s+Aprobados\s*:\s*(\d+)\s*\(\s*([\d.]+)\s*%\s*\)\s*de\s*(\d+)/i);
  const cursadas = buscar(/Materias\s+Cursadas\s*:\s*(\d+)/i);
  const aprobadas = buscar(/Materias\s+Aprobadas\s*:\s*(\d+)/i);
  const semestre = buscar(/^\s*Semestre\s*:\s*(\d+)/im);
  const especialidad = buscar(/Especialidad\s*:\s*(.+)$/im);

  // Las materias con créditos son las que cuentan para el promedio
  const conCreditos = materias.filter((x) => x.creditos > 0);
  const promedioCalculado = conCreditos.length
    ? conCreditos.reduce((s, x) => s + x.calificacion, 0) / conCreditos.length : NaN;
  const resumen = {
    promedio: prom ? parseFloat(prom[1]) : promedioCalculado,
    creditosAprobados: cred ? +cred[1] : conCreditos.filter((x) => x.calificacion >= 70).reduce((s, x) => s + x.creditos, 0),
    porcentaje: cred ? parseFloat(cred[2]) : NaN,
    creditosTotales: cred ? +cred[3] : NaN,
    materiasCursadas: cursadas ? +cursadas[1] : conCreditos.length,
    materiasAprobadas: aprobadas ? +aprobadas[1] : conCreditos.filter((x) => x.calificacion >= 70).length,
    semestre: semestre ? +semestre[1] : NaN,
    especialidad: especialidad ? especialidad[1].trim() : ''
  };

  // Promedio por semestre (según el último curso de cada materia con créditos)
  const grupos = new Map();
  conCreditos.forEach((x) => {
    const k = x.ultimo.sem;
    if (!grupos.has(k)) grupos.set(k, { sem: k, per: x.ultimo.per, anio: x.ultimo.anio, suma: 0, materias: 0, creditos: 0 });
    const g = grupos.get(k);
    g.suma += x.calificacion; g.materias += 1; g.creditos += x.creditos;
  });
  const semestres = Array.from(grupos.values()).sort((a, b) => a.sem - b.sem).map((g) => ({
    sem: g.sem,
    etiqueta: `Semestre ${g.sem}`,
    periodo: `${PERIODOS[g.per] || `Periodo ${g.per}`} ${g.anio}`,
    promedio: g.suma / g.materias,
    materias: g.materias,
    creditos: g.creditos
  }));
  return { materias, resumen, semestres };
}

/* --------------------------------------------------------------------------
   Indicadores reutilizables (inicio y kárdex)
   -------------------------------------------------------------------------- */
function tarjetaKpi({ icono, etiqueta, valor, detalle, progreso }) {
  const cuerpo = el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo cm-kpi' }, [
    el('div', { class: 'cm-kpi-etiqueta' }, [ico(icono), etiqueta]),
    el('div', { class: 'cm-kpi-valor' }, valor),
    detalle ? el('div', { class: 'small text-body-secondary', text: detalle }) : null
  ]);
  if (Number.isFinite(progreso)) {
    const pct = Math.max(0, Math.min(100, progreso));
    cuerpo.append(el('div', {
      class: 'progress', role: 'progressbar', 'aria-valuenow': String(redondear(pct)),
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `${etiqueta}: ${formatoNum(pct)} %`
    }, el('div', { class: 'progress-bar', style: { width: sinMovimiento() ? `${pct}%` : '0%' }, dataset: { ancho: `${pct}%` } })));
  }
  return el('div', { class: 'col-6 col-lg-3' }, cuerpo);
}
function filaKpis(resumen) {
  const r = resumen;
  const valorPromedio = el('span', { class: Number.isFinite(r.promedio) && r.promedio < 70 ? 'text-danger' : '' }, cifra(r.promedio, 2));
  return el('div', { class: 'row g-3' }, [
    tarjetaKpi({ icono: 'graph-up', etiqueta: 'Promedio general', valor: valorPromedio, detalle: 'Materias con créditos' }),
    tarjetaKpi({
      icono: 'stack', etiqueta: 'Créditos aprobados',
      valor: [cifra(r.creditosAprobados), Number.isFinite(r.creditosTotales) ? el('small', { text: ` / ${r.creditosTotales}` }) : null],
      progreso: r.porcentaje
    }),
    tarjetaKpi({
      icono: 'flag', etiqueta: 'Avance de la carrera',
      valor: [cifra(r.porcentaje, 2), el('small', { text: ' %' })],
      detalle: Number.isFinite(r.creditosTotales) ? `Faltan ${Math.max(0, r.creditosTotales - r.creditosAprobados)} créditos` : null
    }),
    tarjetaKpi({
      icono: 'journal-check', etiqueta: 'Materias aprobadas',
      valor: [cifra(r.materiasAprobadas), el('small', { text: ` de ${r.materiasCursadas}` })],
      detalle: r.materiasCursadas === r.materiasAprobadas ? 'Sin materias reprobadas' : `${r.materiasCursadas - r.materiasAprobadas} por regularizar`
    })
  ]);
}

/* --------------------------------------------------------------------------
   Módulo de inicio
   -------------------------------------------------------------------------- */
function moduloInicio() {
  prepararContenido();
  const foto = $('img[src*="alu_cargafoto"]');
  const tablaDatos = foto ? foto.closest('table') : $$('table').find((t) => /Mis Datos Generales/i.test(textoDe(t)));
  if (!tablaDatos) throw new Error('No se encontró la tabla de datos generales.');

  // Datos tal como los muestra el portal (sólo en memoria)
  const datos = {};
  $$('td', tablaDatos).forEach((td) => {
    const etiqueta = td.querySelector('label');
    if (!etiqueta) return;
    const texto = textoDe(td);
    const i = texto.indexOf(':');
    if (i < 0) return;
    datos[normalizar(texto.slice(0, i))] = { titulo: texto.slice(0, i).trim(), valor: textoDe(etiqueta) };
  });
  const dato = (k) => (datos[k] ? datos[k].valor : '');
  const nombre = enTitulo(dato('nombre'));
  const carrera = enTitulo(dato('carrera'));
  const semestre = dato('semestre');
  const estatus = dato('estatus').replace(/\s+/g, ' ');
  const esSi = (v) => /^s[ií]/i.test(v);

  // Construcción de la vista
  const pagina = el('section', { class: 'cm-pagina' });
  const imagen = foto ? foto.cloneNode(false) : null;
  if (imagen) { imagen.removeAttribute('width'); imagen.removeAttribute('height'); imagen.alt = 'Fotografía de perfil'; }
  const etiquetas = el('div', { class: 'd-flex flex-wrap gap-2 mt-2' }, [
    estatus ? el('span', { class: `cm-etiqueta ${/vigente/i.test(estatus) ? 'cm-etiqueta-ok' : 'cm-etiqueta-aviso'}` }, [ico('patch-check'), estatus]) : null,
    dato('inscrito en el semestre actual') ? el('span', { class: `cm-etiqueta ${esSi(dato('inscrito en el semestre actual')) ? 'cm-etiqueta-ok' : 'cm-etiqueta-aviso'}` },
      [ico('person-check'), esSi(dato('inscrito en el semestre actual')) ? 'Con inscripción este semestre' : 'Sin inscripción este semestre']) : null,
    dato('ano de ingreso') ? el('span', { class: 'cm-etiqueta' }, [ico('calendar-event'), `Ingreso ${dato('ano de ingreso')}`]) : null
  ]);
  pagina.append(el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo mb-3' }, el('div', { class: 'cm-perfil' }, [
    imagen,
    el('div', { class: 'flex-grow-1' }, [
      el('p', { class: 'text-body-secondary mb-1 small', text: 'Te damos la bienvenida' }),
      el('h1', { text: nombre || 'Inicio' }),
      el('p', { class: 'mb-0 text-body-secondary', text: [carrera, semestre ? `Semestre ${semestre}` : ''].filter(Boolean).join(' · ') }),
      etiquetas
    ])
  ])));

  // Recordatorios de evaluación
  const evDocente = dato('evaluacion docente realizada');
  const evServicios = dato('evaluacion de servicios no docentes realizada');
  if (evDocente && !esSi(evDocente)) {
    pagina.append(el('div', { class: 'cm-alerta cm-alerta-aviso', role: 'status' }, [
      ico('exclamation-triangle'),
      el('div', {}, [el('strong', { text: 'Evaluación docente pendiente. ' }), 'Recuerda realizarla desde la sección Semestre actual.'])
    ]));
  }
  if (evServicios && !esSi(evServicios)) {
    pagina.append(el('div', { class: 'cm-alerta cm-alerta-aviso', role: 'status' }, [
      ico('exclamation-triangle'),
      el('div', {}, [el('strong', { text: 'Evaluación de servicios pendiente. ' }), 'Aún no registras la evaluación de servicios no docentes.'])
    ]));
  }

  // Resumen académico
  const zonaResumen = el('div');
  const zonaGrafica = el('div', { class: 'cm-grafica' });
  const accesos = el('div', { class: 'cm-accesos' });
  pagina.append(
    el('h2', { class: 'cm-seccion', text: 'Resumen académico' }),
    zonaResumen,
    el('div', { class: 'row g-3 mt-0' }, [
      el('div', { class: 'col-lg-8' }, el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo h-100' }, [
        el('h3', { class: 'cm-tarjeta-titulo' }, [ico('bar-chart'), 'Rendimiento por semestre']), zonaGrafica
      ])),
      el('div', { class: 'col-lg-4' }, el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo h-100' }, [
        el('h3', { class: 'cm-tarjeta-titulo' }, [ico('lightning-charge'), 'Accesos rápidos']), accesos
      ]))
    ])
  );

  // Datos generales completos
  const lista = el('dl', { class: 'cm-datos' });
  Object.values(datos).forEach((d) => {
    lista.append(el('dt', { text: d.titulo }), el('dd', { text: d.valor }));
  });
  pagina.append(
    el('h2', { class: 'cm-seccion', text: 'Mis datos generales' }),
    el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo' }, lista)
  );

  // Inserción y ocultamiento del diseño original
  insertar(pagina, document.body, 'afterbegin');
  ocultar(tablaDatos);
  const encabezado = $('table.cm-encabezado');
  if (encabezado) ocultar(encabezado);
  const logo = $('img[src*="tecpuri"]');
  if (logo) ocultar(logo.closest('center') || logo);
  $$('body > br').forEach(ocultar);
  marcarMejorada();
  animarEntrada(pagina.children);

  pintarAccesos(accesos);
  cargarResumen(zonaResumen, zonaGrafica);
}

function pintarAccesos(contenedor) {
  const opciones = [
    { clave: 'parciales', icono: 'clipboard-data', texto: 'Calificaciones parciales' },
    { clave: 'finales', icono: 'award', texto: 'Calificaciones finales' },
    { clave: 'horario', icono: 'calendar-week', texto: 'Mi horario' },
    { clave: 'kardex', icono: 'file-earmark-text', texto: 'Mi kárdex' }
  ];
  const api = apiShell();
  if (!api) {
    contenedor.replaceWith(el('p', { class: 'small text-body-secondary', text: 'Abre el portal desde su página principal para usar los accesos rápidos.' }));
    return;
  }
  contenedor.append(el('span', { class: 'cm-esqueleto' }));
  api.menuListo().then(() => {
    const botones = opciones.filter((o) => api.existe(o.clave)).map((o) => el('button', {
      type: 'button', class: 'btn btn-outline-secondary cm-acceso',
      onclick: () => api.irA(o.clave)
    }, [ico(o.icono), el('span', { class: 'small', text: o.texto })]));
    contenedor.replaceChildren(...botones);
    animarEntrada(botones);
    if (!botones.length) contenedor.replaceWith(el('p', { class: 'small text-body-secondary', text: 'Usa el menú lateral para navegar por el portal.' }));
  });
}

async function cargarResumen(zonaResumen, zonaGrafica) {
  if (leerPref(PREF.resumenInicio, '1') !== '1') {
    zonaResumen.replaceChildren(el('div', { class: 'cm-alerta cm-alerta-info' }, [ico('info-circle'),
      el('div', { text: 'El resumen académico está desactivado en las opciones del mod.' })]));
    zonaGrafica.replaceChildren(el('p', { class: 'small text-body-secondary', text: 'Sin datos que mostrar.' }));
    return;
  }
  zonaResumen.replaceChildren(el('div', { class: 'row g-3' }, Array.from({ length: 4 }, () =>
    el('div', { class: 'col-6 col-lg-3' }, el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo cm-kpi', 'aria-hidden': 'true' }, [
      el('span', { class: 'cm-esqueleto', style: { width: '50%', height: '.9rem' } }),
      el('span', { class: 'cm-esqueleto' })
    ])))));
  zonaResumen.setAttribute('aria-busy', 'true');
  try {
    const html = await traerHtml(new URL('alu_kardex.asp', location.href).href);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const pre = $$('pre', doc).find((p) => /Kardex/i.test(p.textContent));
    if (!pre) throw new Error('El kárdex no tiene el formato esperado.');
    const { resumen, semestres } = parsearKardex(pre.textContent);
    if (!Number.isFinite(resumen.promedio)) throw new Error('No se encontró el promedio en el kárdex.');
    zonaResumen.replaceChildren(filaKpis(resumen));
    animarEntrada($$('.cm-kpi', zonaResumen));
    animarContadores(zonaResumen);
    if (semestres.length) graficaSemestres(zonaGrafica, semestres);
    else zonaGrafica.replaceChildren(el('p', { class: 'small text-body-secondary', text: 'Aún no hay semestres concluidos en tu kárdex.' }));
  } catch (e) {
    avisar('No se pudo calcular el resumen académico.', e);
    const api = apiShell();
    zonaResumen.replaceChildren(el('div', { class: 'cm-alerta cm-alerta-error', role: 'alert' }, [
      ico('x-octagon'),
      el('div', {}, [
        el('strong', { text: 'No se pudo calcular tu resumen. ' }),
        'El kárdex no respondió o cambió de formato. Puedes consultarlo directamente.',
        api ? el('div', { class: 'mt-2' }, el('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => api.irA('kardex') }, 'Abrir mi kárdex')) : null
      ])
    ]));
    zonaGrafica.replaceChildren(el('p', { class: 'small text-body-secondary', text: 'Sin datos que mostrar.' }));
  } finally {
    zonaResumen.removeAttribute('aria-busy');
  }
}

/* ==========================================================================
   PANTALLA: alu_kardex.asp
   El portal entrega el kárdex como texto <pre> de ancho fijo. Se interpreta
   (parsearKardex, en el módulo de inicio) y se muestra como tabla filtrable,
   indicadores y gráfica. El <pre> original queda disponible con un botón.
   ========================================================================== */
function moduloKardex() {
  prepararContenido();
  const pre = $$('pre').find((p) => /Kardex/i.test(p.textContent));
  if (!pre) throw new Error('No se encontró el kárdex en la página.');
  const { materias, resumen, semestres } = parsearKardex(pre.textContent);
  if (!materias.length) throw new Error('No se pudieron leer las materias del kárdex.');

  const original = pre.closest('table') || pre;
  const vista = el('section', { class: 'cm-pagina' });
  const imprimir = botonImprimir('Imprimir o guardar PDF');
  const alternar = botonVistaOriginal(original, vista);

  // La cabecera vive fuera de "vista" para que el botón de alternar siga visible
  const cabecera = cabeceraPagina({
    titulo: 'Mi kárdex',
    subtitulo: [resumen.especialidad ? enTitulo(resumen.especialidad.replace(/^\d+\s*/, '')) : '', Number.isFinite(resumen.semestre) ? `Semestre ${resumen.semestre}` : ''].filter(Boolean).join(' · '),
    acciones: [imprimir, alternar]
  });

  vista.append(cabeceraImpresion('Kárdex del alumno'), filaKpis(resumen));

  // Gráfica
  if (semestres.length) {
    const zona = el('div', { class: 'cm-grafica' });
    vista.append(el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo mt-3' }, [
      el('h2', { class: 'cm-tarjeta-titulo' }, [ico('bar-chart'), 'Promedio por semestre']), zona
    ]));
    // Se dibuja después de insertar en el documento (necesita medidas)
    setTimeout(() => graficaSemestres(zona, semestres), 0);
  }

  // Filtros
  const buscador = el('input', { type: 'search', class: 'form-control form-control-sm', placeholder: 'Buscar materia o clave', 'aria-label': 'Buscar materia o clave' });
  const selectorSem = el('select', { class: 'form-select form-select-sm', 'aria-label': 'Filtrar por semestre' }, [
    el('option', { value: '', text: 'Todos los semestres' }),
    ...semestres.map((s) => el('option', { value: String(s.sem), text: `${s.etiqueta} (${s.periodo})` }))
  ]);
  const idSinCred = 'cmSinCreditos';
  const sinCreditos = el('input', { class: 'form-check-input', type: 'checkbox', id: idSinCred, checked: true });
  const contador = el('span', { class: 'small text-body-secondary ms-auto', 'aria-live': 'polite' });
  vista.append(
    el('h2', { class: 'cm-seccion', text: 'Materias cursadas' }),
    el('div', { class: 'cm-filtros' }, [
      buscador, selectorSem,
      el('div', { class: 'form-check form-switch mb-0' }, [sinCreditos, el('label', { class: 'form-check-label small', for: idSinCred, text: 'Incluir actividades sin créditos' })]),
      contador
    ])
  );

  // Tabla (en móvil se convierte en tarjetas)
  const columnas = ['Clave', 'Materia', 'Créditos', 'Calificación', 'Acreditación', 'Semestre', 'Periodo'];
  const cuerpo = el('tbody');
  const filas = materias.map((x) => {
    const periodo = `${PERIODOS[x.ultimo.per] || x.ultimo.per} ${x.ultimo.anio}`;
    const tr = el('tr', {}, [
      el('td', { 'data-label': 'Clave' }, [el('span', { class: 'cm-num', text: x.clave }), x.oficial ? el('div', { class: 'small text-body-secondary', text: x.oficial }) : null]),
      el('td', { class: 'cm-td-titulo', 'data-label': 'Materia', text: enTitulo(x.nombre) }),
      el('td', { 'data-label': 'Créditos', class: 'cm-num', text: String(x.creditos) }),
      el('td', { 'data-label': 'Calificación' }, insigniaCalificacion(x.calificacion)),
      el('td', { 'data-label': 'Acreditación', class: 'small', text: ACREDITACION[x.acreditacion] || String(x.acreditacion) }),
      el('td', { 'data-label': 'Semestre', class: 'cm-num', text: String(x.ultimo.sem) }),
      el('td', { 'data-label': 'Periodo', class: 'text-nowrap', text: periodo })
    ]);
    tr.dataset.busqueda = normalizar(`${x.clave} ${x.oficial} ${x.nombre}`);
    tr.dataset.sem = String(x.ultimo.sem);
    tr.dataset.creditos = String(x.creditos);
    cuerpo.append(tr);
    return tr;
  });
  const tabla = el('table', { class: 'cm-tabla cm-tabla-tarjetas' }, [
    el('caption', { class: 'visually-hidden', text: 'Materias del kárdex' }),
    el('thead', {}, el('tr', {}, columnas.map((c) => el('th', { scope: 'col', text: c })))),
    cuerpo
  ]);
  const vacio = el('p', { class: 'p-3 mb-0 text-body-secondary', hidden: true, text: 'Ninguna materia coincide con el filtro.' });
  vista.append(el('div', { class: 'cm-tabla-marco' }, [tabla, vacio]));

  const aplicarFiltro = () => {
    const q = normalizar(buscador.value);
    const sem = selectorSem.value;
    let visibles = 0;
    filas.forEach((tr) => {
      const ok = (!q || tr.dataset.busqueda.includes(q))
        && (!sem || tr.dataset.sem === sem)
        && (sinCreditos.checked || tr.dataset.creditos !== '0');
      tr.hidden = !ok;
      if (ok) visibles++;
    });
    vacio.hidden = visibles > 0;
    contador.textContent = `${visibles} de ${filas.length} materias`;
  };
  buscador.addEventListener('input', aplicarFiltro);
  selectorSem.addEventListener('change', aplicarFiltro);
  sinCreditos.addEventListener('change', aplicarFiltro);
  aplicarFiltro();

  vista.append(el('p', { class: 'small text-body-secondary' }, [
    ico('info-circle', 'me-1'),
    'El promedio general considera sólo las materias con créditos. Calificación aprobatoria: 70 o más.'
  ]));

  insertar(cabecera, document.body, 'afterbegin');
  insertar(vista, cabecera, 'afterend');
  agregarClases(cabecera, 'cm-pagina');
  ocultar(original);
  agregarClases(pre, 'cm-original');
  marcarMejorada();
  animarEntrada([cabecera, ...vista.children]);
  animarContadores(vista);
}

/* ==========================================================================
   PANTALLA: alu_horariosemestre.asp (carga académica)
   El horario viene como <pre> de ancho fijo con dos renglones por materia:
     1) grupo, materia, créditos y horas por día
     2) docente y salón por día
   El día de cada hora se deduce por la columna en la que aparece, tomando
   como referencia la posición de "Lunes", "Martes", etc. en el encabezado.
   ========================================================================== */
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Quita acentos sin cambiar la longitud del texto (para conservar columnas). */
function sinAcentosMismoLargo(s) {
  const mapa = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', ñ: 'n', Ñ: 'N' };
  return s.replace(/[áéíóúÁÉÍÓÚñÑ]/g, (c) => mapa[c]);
}
const aMinutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function parsearHorario(texto) {
  const lineas = String(texto).split(/\r?\n/);
  const iEncabezado = lineas.findIndex((l) => /Lunes/i.test(l) && /Martes/i.test(l));
  if (iEncabezado < 0) throw new Error('No se encontró el encabezado de días.');
  const encabezado = sinAcentosMismoLargo(lineas[iEncabezado]).toLowerCase();
  const centros = DIAS.map((d) => {
    const nombre = sinAcentosMismoLargo(d).toLowerCase();
    const i = encabezado.indexOf(nombre);
    return i >= 0 ? i + nombre.length / 2 : null;
  });
  const columnaCr = encabezado.indexOf(' cr ') >= 0 ? encabezado.indexOf(' cr ') + 1 : -1;
  const diaMasCercano = (centro) => {
    let mejor = -1;
    let distancia = Infinity;
    centros.forEach((c, i) => {
      if (c === null) return;
      const d = Math.abs(c - centro);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    return mejor;
  };

  const materias = [];
  for (let i = iEncabezado + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!/^[A-Z0-9]{3,6}\s/.test(linea)) continue;
    const grupo = linea.slice(0, linea.indexOf(' ')).trim();
    // Materia y créditos: por columna (si existe "Cr"), si no, por patrón
    let nombre = '';
    let creditos = NaN;
    const primeraHora = linea.search(/\d{1,2}:\d{2}/);
    if (columnaCr > 0) {
      nombre = linea.slice(grupo.length, columnaCr - 1).trim();
      creditos = parseInt(linea.slice(columnaCr - 2, columnaCr + 3), 10);
    }
    if (!nombre || !Number.isFinite(creditos)) {
      const m = linea.slice(0, primeraHora > 0 ? primeraHora : undefined).match(/^\S+\s+(.+?)\s+(\d{1,2})\s*$/);
      if (m) { nombre = m[1].trim(); creditos = parseInt(m[2], 10); }
    }
    const clases = [];
    const reHora = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g;
    let h;
    while ((h = reHora.exec(linea)) !== null) {
      const dia = diaMasCercano(h.index + h[0].length / 2);
      if (dia >= 0) clases.push({ dia, inicio: aMinutos(h[1]), fin: aMinutos(h[2]), salon: '' });
    }
    // Renglón siguiente: docente y salones
    const siguiente = lineas[i + 1] || '';
    let docente = '';
    if (siguiente && !/^\S/.test(siguiente)) {
      docente = siguiente.trim().split(/\s{2,}/)[0] || '';
      if (/^Sal[oó]n/i.test(docente)) docente = '';
      const reSalon = /Sal[oó]n\s+\S+/gi;
      let s;
      while ((s = reSalon.exec(siguiente)) !== null) {
        const dia = diaMasCercano(s.index + s[0].length / 2);
        const clase = clases.find((c) => c.dia === dia && !c.salon);
        if (clase) clase.salon = s[0].replace(/\s+/g, ' ');
      }
      i++;
    }
    materias.push({ grupo, nombre, creditos, docente, clases });
  }
  const buscar = (re) => { const r = String(texto).match(re); return r ? r[1].trim() : ''; };
  return {
    materias,
    periodo: buscar(/Periodo\s*:\s*(\S+)/i),
    creditos: buscar(/Cr[eé]ditos\s*:\s*(\d+)/i),
    semestre: buscar(/Semestre\s*:\s*(\d+)/i)
  };
}

function moduloHorario() {
  prepararContenido();
  const pre = $$('pre').find((p) => /Lunes/i.test(p.textContent));
  if (!pre) throw new Error('No se encontró el horario en la página.');
  const datos = parsearHorario(pre.textContent);
  const conClases = datos.materias.filter((m) => m.clases.length);
  if (!conClases.length) throw new Error('No se pudieron leer las clases del horario.');

  // Días visibles (el sábado sólo si hay clases) y rango de horas
  const diasUsados = new Set(conClases.flatMap((m) => m.clases.map((c) => c.dia)));
  const dias = [0, 1, 2, 3, 4].concat(diasUsados.has(5) ? [5] : []);
  const inicio = Math.floor(Math.min(...conClases.flatMap((m) => m.clases.map((c) => c.inicio))) / 60) * 60;
  const fin = Math.ceil(Math.max(...conClases.flatMap((m) => m.clases.map((c) => c.fin))) / 60) * 60;
  const PASO = 30; // minutos por renglón de la cuadrícula
  const hoy = (new Date().getDay() + 6) % 7; // 0 = lunes

  datos.materias.forEach((m, i) => { m.color = (i % 8) + 1; });

  const original = pre;
  const vista = el('section', { class: 'cm-pagina' });
  const cabecera = cabeceraPagina({
    titulo: 'Horario semanal',
    subtitulo: [datos.periodo ? `Periodo ${datos.periodo}` : '', datos.semestre ? `Semestre ${datos.semestre}` : '', datos.creditos ? `${datos.creditos} créditos` : ''].filter(Boolean).join(' · '),
    acciones: [botonImprimir(), botonVistaOriginal(original, vista)]
  });
  agregarClases(cabecera, 'cm-pagina');
  vista.append(cabeceraImpresion(`Horario semanal ${datos.periodo}`.trim()));

  /* --- Cuadrícula (tabletas y escritorio) --- */
  const cuadricula = el('div', {
    class: 'cm-horario', role: 'table', 'aria-label': 'Horario semanal',
    style: { '--cm-dias': String(dias.length) }
  });
  cuadricula.style.setProperty('--cm-dias', String(dias.length));
  const filasTotales = (fin - inicio) / PASO;
  cuadricula.append(el('div', { style: { gridRow: '1', gridColumn: '1' } }));
  dias.forEach((d, i) => {
    cuadricula.append(el('div', {
      class: `cm-horario-dia${d === hoy ? ' cm-hoy' : ''}`, role: 'columnheader',
      style: { gridColumn: String(i + 2) }
    }, [DIAS[d], d === hoy ? el('span', { class: 'visually-hidden', text: ' (hoy)' }) : null]));
  });
  for (let r = 0; r < filasTotales; r++) {
    const minuto = inicio + r * PASO;
    cuadricula.append(el('div', {
      class: `cm-horario-linea${minuto % 60 ? ' cm-media' : ''}`,
      style: { gridRow: String(r + 2) }, 'aria-hidden': 'true'
    }));
    if (minuto % 60 === 0) {
      cuadricula.append(el('div', { class: 'cm-horario-hora', style: { gridRow: String(r + 2) }, text: aHora(minuto), 'aria-hidden': 'true' }));
    }
  }
  datos.materias.forEach((m) => {
    m.clases.forEach((c) => {
      const col = dias.indexOf(c.dia);
      if (col < 0) return;
      const filaIni = (c.inicio - inicio) / PASO + 2;
      const span = Math.max(1, (c.fin - c.inicio) / PASO);
      cuadricula.append(el('div', {
        class: `cm-bloque cm-color-${m.color}`, role: 'cell', tabindex: '0',
        dataset: { materia: m.grupo },
        style: { gridColumn: String(col + 2), gridRow: `${filaIni} / span ${span}`, '--cm-i': String(col * 2 + Math.round((c.inicio - inicio) / 60)) },
        title: `${m.nombre} (${m.grupo})\n${aHora(c.inicio)} a ${aHora(c.fin)}${c.salon ? `\n${c.salon}` : ''}${m.docente ? `\n${enTitulo(m.docente)}` : ''}`
      }, [
        el('strong', { text: enTitulo(m.nombre) }),
        el('span', { class: 'cm-num', text: `${aHora(c.inicio)} - ${aHora(c.fin)}` }),
        c.salon ? el('span', { text: c.salon }) : null
      ]));
    });
  });
  // Línea de "ahora" sobre la columna de hoy (se actualiza cada minuto)
  const lineaAhora = el('div', { class: 'cm-ahora', 'aria-hidden': 'true', hidden: true });
  cuadricula.append(lineaAhora);
  const moverAhora = () => {
    const d = new Date();
    const min = d.getHours() * 60 + d.getMinutes();
    const col = dias.indexOf((d.getDay() + 6) % 7);
    if (col < 0 || min < inicio || min >= fin) { lineaAhora.hidden = true; return; }
    const fila = Math.floor((min - inicio) / PASO);
    lineaAhora.hidden = false;
    lineaAhora.style.gridColumn = String(col + 2);
    lineaAhora.style.gridRow = String(fila + 2);
    const altoFila = parseFloat(getComputedStyle(cuadricula).gridAutoRows) || 28;
    lineaAhora.style.marginTop = `${((min - inicio) % PASO) / PASO * altoFila}px`;
  };
  moverAhora();
  cadaCierto(moverAhora, 60000);

  // Panel que describe la materia resaltada
  const detalle = el('div', { class: 'cm-horario-detalle', 'aria-live': 'polite' });
  const textoDetalleInicial = () => detalle.replaceChildren(ico('cursor', 'me-2'),
    'Pasa el cursor (o el foco del teclado) sobre una materia para resaltarla en toda la semana.');
  textoDetalleInicial();
  vista.append(el('div', { class: 'cm-tarjeta cm-vista-escritorio d-none d-md-block mb-3', style: { overflowX: 'auto' } },
    [detalle, el('div', { class: 'p-2' }, cuadricula)]));

  /* --- Lista por día (celulares) --- */
  const listaMovil = el('div', { class: 'cm-vista-movil d-md-none mb-3' });
  const ordenDias = dias.slice().sort((a, b) => ((a - hoy + 7) % 7) - ((b - hoy + 7) % 7));
  ordenDias.forEach((d) => {
    const clasesDia = datos.materias.flatMap((m) => m.clases.filter((c) => c.dia === d).map((c) => ({ ...c, m })))
      .sort((a, b) => a.inicio - b.inicio);
    const bloque = el('div', { class: 'cm-tarjeta cm-tarjeta-cuerpo cm-lista-dia' }, [
      el('h3', {}, [ico(d === hoy ? 'calendar-check' : 'calendar3'), DIAS[d], d === hoy ? el('span', { class: 'cm-etiqueta cm-etiqueta-primaria', text: 'Hoy' }) : null])
    ]);
    if (!clasesDia.length) bloque.append(el('p', { class: 'small text-body-secondary mb-0', text: 'Sin clases.' }));
    const ahora = new Date();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const siguiente = d === hoy ? clasesDia.find((c) => c.inicio > minAhora) : null;
    clasesDia.forEach((c) => {
      const enCurso = d === hoy && minAhora >= c.inicio && minAhora < c.fin;
      bloque.append(el('div', { class: `cm-lista-clase cm-color-${c.m.color}${enCurso ? ' cm-en-curso' : ''}`, dataset: { materia: c.m.grupo } }, [
        el('div', { class: 'cm-lista-hora' }, [
          `${aHora(c.inicio)} - ${aHora(c.fin)}`,
          enCurso ? el('span', { class: 'cm-etiqueta cm-etiqueta-ok d-block mt-1', text: 'En curso' }) : null,
          c === siguiente ? el('span', { class: 'cm-etiqueta cm-etiqueta-primaria d-block mt-1', text: 'Siguiente' }) : null
        ]),
        el('div', {}, [
          el('strong', { text: enTitulo(c.m.nombre) }),
          el('small', { text: [c.salon, c.m.docente ? enTitulo(c.m.docente) : ''].filter(Boolean).join(' · ') })
        ])
      ]));
    });
    listaMovil.append(bloque);
  });
  vista.append(listaMovil);

  /* --- Carga académica (tabla / tarjetas) --- */
  vista.append(el('h2', { class: 'cm-seccion', text: 'Carga académica' }));
  const cuerpo = el('tbody');
  datos.materias.forEach((m) => {
    const horas = m.clases.reduce((s, c) => s + (c.fin - c.inicio), 0) / 60;
    cuerpo.append(el('tr', { dataset: { materia: m.grupo }, tabindex: '0' }, [
      el('td', { class: 'cm-td-titulo', 'data-label': 'Materia' }, [
        el('span', { class: `cm-punto cm-color-${m.color} me-2`, 'aria-hidden': 'true', style: { background: 'currentColor' } }),
        enTitulo(m.nombre)
      ]),
      el('td', { 'data-label': 'Grupo', class: 'cm-num', text: m.grupo }),
      el('td', { 'data-label': 'Docente', text: m.docente ? enTitulo(m.docente) : '-' }),
      el('td', { 'data-label': 'Créditos', class: 'cm-num', text: Number.isFinite(m.creditos) ? String(m.creditos) : '-' }),
      el('td', { 'data-label': 'Horas por semana', class: 'cm-num', text: formatoNum(horas, 1) }),
      el('td', { 'data-label': 'Salón', text: Array.from(new Set(m.clases.map((c) => c.salon).filter(Boolean))).join(', ') || '-' })
    ]));
  });
  vista.append(el('div', { class: 'cm-tabla-marco' }, el('table', { class: 'cm-tabla cm-tabla-tarjetas' }, [
    el('caption', { class: 'visually-hidden', text: 'Carga académica del semestre' }),
    el('thead', {}, el('tr', {}, ['Materia', 'Grupo', 'Docente', 'Créditos', 'Horas por semana', 'Salón'].map((c) => el('th', { scope: 'col', text: c })))),
    cuerpo
  ])));
  vista.append(el('p', { class: 'small text-body-secondary' }, [
    ico('info-circle', 'me-1'),
    'Los nombres de las materias y docentes vienen recortados desde el portal. Para descargar el temario de una materia usa "Ver formato original".'
  ]));

  insertar(cabecera, document.body, 'afterbegin');
  insertar(vista, cabecera, 'afterend');
  ocultar(original);
  agregarClases(original, 'cm-original');
  // El portal deja texto suelto después del <pre> (nota sobre temarios)
  $$('body > br').forEach(ocultar);
  marcarMejorada();

  /* --- Resaltado: al pasar sobre una materia (en la cuadrícula, la lista o
     la tabla) se iluminan todas sus clases de la semana y se atenúa el resto --- */
  const porGrupo = new Map(datos.materias.map((m) => [m.grupo, m]));
  let actual = null;
  const resaltar = (grupo) => {
    if (grupo === actual) return;
    actual = grupo;
    vista.classList.toggle('cm-resaltando', !!grupo);
    $$('[data-materia]', vista).forEach((n) => n.classList.toggle('cm-activa', n.dataset.materia === grupo));
    const m = grupo ? porGrupo.get(grupo) : null;
    if (!m) { textoDetalleInicial(); return; }
    const horas = m.clases.reduce((s, c) => s + (c.fin - c.inicio), 0) / 60;
    const diasM = Array.from(new Set(m.clases.map((c) => c.dia))).sort().map((d) => DIAS[d]).join(', ');
    detalle.replaceChildren(
      el('span', { class: `cm-punto cm-color-${m.color} me-2`, style: { background: 'currentColor' }, 'aria-hidden': 'true' }),
      el('strong', { text: enTitulo(m.nombre) }),
      el('span', { class: 'text-body-secondary', text: `  ·  ${m.grupo}  ·  ${diasM}  ·  ${formatoNum(horas, 1)} h por semana${m.docente ? `  ·  ${enTitulo(m.docente)}` : ''}` })
    );
  };
  const materiaDe = (e) => { const n = e.target.closest && e.target.closest('[data-materia]'); return n ? n.dataset.materia : null; };
  vista.addEventListener('pointerover', (e) => resaltar(materiaDe(e)));
  vista.addEventListener('pointerleave', () => resaltar(null));
  vista.addEventListener('focusin', (e) => resaltar(materiaDe(e)));
  vista.addEventListener('focusout', () => resaltar(null));
  animarEntrada([cabecera, ...vista.children]);
}

/* ==========================================================================
   PANTALLAS: calificaciones parciales y finales
   Ambas son tablas con rowspan. Se expanden a una matriz para leerlas y se
   muestran como tarjetas por materia; la tabla original se conserva con el
   nuevo estilo (encabezado fijo, hover y colores semánticos).
   ========================================================================== */

/** Busca una tabla cuyo encabezado contenga un texto. */
function tablaConEncabezado(texto) {
  const buscado = normalizar(texto);
  return $$('table').find((t) => $$('th', t).some((th) => normalizar(textoDe(th)).includes(buscado))) || null;
}
/** Índice de la última fila de encabezado (sólo <th>). */
function filasDeDatos(tabla) {
  const filas = Array.from(tabla.rows);
  let i = 0;
  while (i < filas.length && Array.from(filas[i].cells).every((c) => c.tagName === 'TH')) i++;
  return i;
}
function tarjetaMateria({ nombre, grupo, parciales, pie, calcular }) {
  return el('div', { class: 'col-sm-6 col-xl-4' }, el('article', { class: 'cm-tarjeta cm-tarjeta-cuerpo cm-materia cm-interactiva' }, [
    el('h3', { class: 'cm-materia-nombre', text: enTitulo(nombre) }),
    el('div', { class: 'cm-materia-grupo', text: `Grupo ${grupo}` }),
    el('div', { class: 'cm-parciales' }, parciales.map((p) => el('div', { class: 'cm-parcial' }, [
      insigniaCalificacion(p.valor, { sinCaptura: p.sinCaptura, sufijo: p.estatus || '', titulo: p.titulo || '' }),
      el('span', { text: `Parcial ${p.numero}` })
    ]))),
    pie ? el('div', { class: 'cm-materia-pie' }, pie) : null,
    calcular && apiShell() ? el('button', {
      type: 'button', class: 'btn btn-sm btn-outline-primary mt-2 cm-no-imprimir', onclick: calcular
    }, [ico('calculator', 'me-1'), 'Estimar parcial']) : null
  ]));
}
function leyendaSemantica() {
  return el('div', { class: 'd-flex flex-wrap gap-2 align-items-center small text-body-secondary mb-3' }, [
    el('span', { text: 'Colores:' }),
    el('span', { class: 'cm-cal cm-cal-ok', text: '70 o más' }),
    el('span', { class: 'cm-cal cm-cal-mal', text: 'Menos de 70' }),
    el('span', { class: 'cm-cal cm-cal-pend', text: 'Sin captura' })
  ]);
}

/* --------------------------------------------------------------------------
   alu_califparcialesxind.asp
   Columnas: Clave del grupo | Materia | Evaluación | Calificación |
             Ind/Comp % | Calificación ponderada | Calificación Ind/Comp
   Una calificación de indicador igual a -1 significa "sin captura".
   -------------------------------------------------------------------------- */
function moduloParciales() {
  prepararContenido();
  const tabla = tablaConEncabezado('Clave del Grupo');
  if (!tabla) throw new Error('No se encontró la tabla de calificaciones parciales.');
  const matriz = tablaAMatriz(tabla);
  const inicioDatos = filasDeDatos(tabla);

  const materias = new Map();
  for (let r = inicioDatos; r < matriz.length; r++) {
    const fila = matriz[r];
    if (!fila || fila.length < 4) continue;
    const grupo = textoDe(fila[0]);
    if (!grupo) continue;
    if (!materias.has(grupo)) materias.set(grupo, { grupo, nombre: textoDe(fila[1]), parciales: new Map() });
    const m = materias.get(grupo);
    const num = textoDe(fila[2]);
    if (!m.parciales.has(num)) m.parciales.set(num, { numero: num, celda: fila[3], indicadores: [] });
    m.parciales.get(num).indicadores.push({ ponderada: textoDe(fila[5]), calInd: textoDe(fila[6]) });
  }
  if (!materias.size) throw new Error('No se pudieron leer las materias de la tabla.');

  // Normaliza cada parcial: calificación y si ya fue capturado
  materias.forEach((m) => {
    m.lista = Array.from(m.parciales.values()).map((p) => {
      const valor = numero(textoDe(p.celda));
      const sinCaptura = p.indicadores.every((i) => numero(i.calInd) === -1) || (valor === 0 && p.indicadores.every((i) => numero(i.ponderada) === 0));
      return { numero: p.numero, valor, sinCaptura };
    });
    const capturados = m.lista.filter((p) => !p.sinCaptura && Number.isFinite(p.valor));
    m.promedio = capturados.length ? capturados.reduce((s, p) => s + p.valor, 0) / capturados.length : NaN;
    m.capturados = capturados.length;
  });

  // Colores semánticos en la tabla original
  for (let r = inicioDatos; r < matriz.length; r++) {
    const fila = matriz[r];
    if (!fila) continue;
    [fila[3], fila[6]].forEach((celda) => {
      if (!celda || celda.dataset.cmRevisada) return;
      celda.dataset.cmRevisada = '1';
      registrar(() => { delete celda.dataset.cmRevisada; });
      const v = numero(textoDe(celda));
      if (v === -1) { agregarClases(celda, 'cm-celda-pend'); fijarAtributo(celda, 'title', 'Sin captura'); }
      else if (v === 0 && celda === fila[3]) agregarClases(celda, 'cm-celda-pend');
      else if (Number.isFinite(v)) agregarClases(celda, v >= 70 ? 'cm-celda-ok' : 'cm-celda-mal');
    });
  }

  // Vista de tarjetas
  const vista = el('section', { class: 'cm-pagina' });
  const lista = Array.from(materias.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  vista.append(
    cabeceraPagina({
      titulo: 'Calificaciones parciales',
      subtitulo: `${lista.length} materias en el semestre actual`,
      acciones: [
        apiShell() ? el('button', { type: 'button', class: 'btn btn-outline-primary btn-sm', onclick: () => apiShell().calculadora({}) }, [ico('calculator', 'me-1'), 'Calculadora']) : null,
        botonImprimir()
      ].filter(Boolean)
    }),
    cabeceraImpresion('Calificaciones parciales'),
    leyendaSemantica(),
    el('div', { class: 'row g-3 mb-2' }, lista.map((m) => tarjetaMateria({
      nombre: m.nombre, grupo: m.grupo, parciales: m.lista,
      calcular: m.lista.length ? () => {
        const api = apiShell();
        const pendiente = m.lista.find((p) => p.sinCaptura) || m.lista[m.lista.length - 1];
        if (api && api.calculadora) api.calculadora({ grupo: m.grupo, parcial: pendiente.numero });
      } : null,
      pie: [
        el('span', { class: 'text-body-secondary', text: m.capturados ? `Promedio de ${m.capturados} parcial${m.capturados === 1 ? '' : 'es'} capturado${m.capturados === 1 ? '' : 's'}` : 'Aún sin parciales capturados' }),
        m.capturados ? insigniaCalificacion(m.promedio) : null
      ]
    }))),
    el('p', { class: 'small text-body-secondary mt-2' }, [ico('info-circle', 'me-1'),
      'El promedio de esta vista es sólo una referencia con los parciales ya capturados; la calificación oficial es la que registra tu docente.']),
    el('h2', { class: 'cm-seccion', text: 'Detalle por indicador' })
  );
  insertar(vista, document.body, 'afterbegin');

  // Tablas originales con el nuevo estilo
  const tablaIndicadores = tablaConEncabezado('Indicadores');
  if (tablaIndicadores && tablaIndicadores !== tabla) {
    estilizarTablaOriginal(tablaIndicadores);
    const detalles = el('details', { class: 'mb-3' }, [el('summary', { class: 'mb-2 fw-semibold', text: 'Claves de indicadores y competencias' })]);
    insertar(detalles, tablaIndicadores.closest('.cm-tabla-marco') || tablaIndicadores, 'beforebegin');
    detalles.append(tablaIndicadores.closest('.cm-tabla-marco') || tablaIndicadores);
    registrar(() => { const marco = detalles.querySelector('.cm-tabla-marco, table'); if (marco) detalles.before(marco); });
  }
  estilizarTablaOriginal(tabla);
  $$('body > center > br, body > br').forEach(ocultar);
  marcarMejorada();
  animarEntrada($$('.cm-materia', vista));
}

/* --------------------------------------------------------------------------
   Alu_CalFinales_ModTrad.asp
   Columnas: Grupo | Materia | Parcial | Cal.Par (con estatus en <sup>) |
             Cal. Final | Acred. Final
   -------------------------------------------------------------------------- */
function moduloFinales() {
  prepararContenido();
  const tabla = tablaConEncabezado('Cal. Final');
  if (!tabla) throw new Error('No se encontró la tabla de calificaciones finales.');
  const matriz = tablaAMatriz(tabla);
  const inicioDatos = filasDeDatos(tabla);

  const materias = new Map();
  for (let r = inicioDatos; r < matriz.length; r++) {
    const fila = matriz[r];
    if (!fila || fila.length < 4) continue;
    const grupo = textoDe(fila[0]);
    if (!grupo) continue;
    if (!materias.has(grupo)) {
      materias.set(grupo, {
        grupo, nombre: textoDe(fila[1]),
        final: textoDe(fila[4]), acreditacion: textoDe(fila[5]), parciales: []
      });
    }
    const celda = fila[3];
    const sup = celda ? celda.querySelector('sup') : null;
    const estatus = sup ? textoDe(sup) : '';
    const valor = numero(celda ? textoDe(celda).replace(estatus, '') : '');
    materias.get(grupo).parciales.push({
      numero: textoDe(fila[2]), valor, estatus,
      // 0 en un parcial suele significar que aún no se captura
      sinCaptura: !Number.isFinite(valor) || valor === 0 || /NC$/i.test(estatus),
      titulo: valor === 0 ? 'Calificación 0 o aún sin captura' : ''
    });
    if (celda && !celda.dataset.cmRevisada) {
      celda.dataset.cmRevisada = '1';
      registrar(() => { delete celda.dataset.cmRevisada; });
      if (valor === 0) agregarClases(celda, 'cm-celda-pend');
      else if (Number.isFinite(valor)) agregarClases(celda, valor >= 70 ? 'cm-celda-ok' : 'cm-celda-mal');
    }
  }
  if (!materias.size) throw new Error('No se pudieron leer las materias de la tabla.');

  // Leyenda original del estatus (NC, 1OP, 2NC, 2OP)
  const tablaEstatus = tablaConEncabezado('Estatus de las Evaluaciones') || $$('table').find((t) => /Estatus de las Evaluaciones/i.test(textoDe(t)));
  const leyendaEstatus = el('div', { class: 'cm-alerta cm-alerta-info' }, [ico('info-circle'), el('div', {}, [
    el('strong', { text: 'Estatus de las evaluaciones: ' }),
    'NC = no capturada; 1OP = capturada en 1a oportunidad; 2NC = en espera de captura en 2a oportunidad; 2OP = capturada en 2a oportunidad. ',
    'El promedio final sólo aparece cuando todos los parciales tienen estatus 1OP o 2OP.'
  ])]);

  const lista = Array.from(materias.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const vista = el('section', { class: 'cm-pagina' });
  vista.append(
    cabeceraPagina({
      titulo: 'Calificaciones finales',
      subtitulo: `${lista.length} materias en el semestre actual`,
      acciones: [botonImprimir()]
    }),
    cabeceraImpresion('Calificaciones finales'),
    leyendaEstatus,
    leyendaSemantica(),
    el('div', { class: 'row g-3 mb-2' }, lista.map((m) => {
      const valorFinal = numero(m.final);
      const finalCapturado = Number.isFinite(valorFinal);
      return tarjetaMateria({
        nombre: m.nombre, grupo: m.grupo, parciales: m.parciales,
        pie: [
          el('div', {}, [el('div', { class: 'text-body-secondary small', text: 'Calificación final' }),
            finalCapturado ? insigniaCalificacion(valorFinal)
              : el('span', { class: 'cm-cal cm-cal-aviso' }, [ico('hourglass-split'), enTitulo(m.final || 'Pendiente')])]),
          el('div', { class: 'text-end' }, [el('div', { class: 'text-body-secondary small', text: 'Acreditación' }),
            el('div', { class: 'small fw-semibold', text: enTitulo(m.acreditacion) })])
        ]
      });
    })),
    el('h2', { class: 'cm-seccion', text: 'Relación de calificaciones finales' })
  );
  insertar(vista, document.body, 'afterbegin');
  if (tablaEstatus) ocultar(tablaEstatus);
  estilizarTablaOriginal(tabla);
  $$('center > br, body > br').forEach(ocultar);
  marcarMejorada();
  animarEntrada($$('.cm-materia', vista));
}

/* ==========================================================================
   CALCULADORA DE PARCIAL
   Estima la calificación de un parcial antes de que el docente la capture.
   - Toma los indicadores y sus porcentajes de la página de calificaciones
     parciales (p. ej. "Examen escrito 40 %"), o se arman a mano.
   - Cada indicador puede tener varias actividades (tareas, trabajos,
     prácticas...). Cada actividad recibe su calificación de 0 a 100; el
     indicador vale el promedio de sus actividades.
   - Las actividades sin calificación cuentan como pendientes: se calcula lo
     ya asegurado, lo máximo posible y lo que hace falta para llegar a 70.
   Los datos viven en memoria. Sólo se guardan en el dispositivo si el
   usuario marca "Recordar en este dispositivo".
   ========================================================================== */
const CALIF_APROBATORIA = 70;
const MAX_ACTIVIDADES = 40;

/** Lee materias, parciales e indicadores de alu_califparcialesxind.asp. */
function parsearParcialesDoc(doc) {
  const buscarTabla = (texto) => $$('table', doc).find((t) =>
    $$('th', t).some((th) => normalizar(textoDe(th)).includes(normalizar(texto)))) || null;

  // Claves de indicadores: filas con pares (clave, nombre)
  const leyenda = new Map();
  const tablaLeyenda = buscarTabla('Relación de Indicadores');
  if (tablaLeyenda) {
    Array.from(tablaLeyenda.rows).forEach((tr) => {
      const celdas = Array.from(tr.cells).filter((c) => c.tagName === 'TD');
      for (let i = 0; i + 1 < celdas.length; i += 2) {
        const clave = textoDe(celdas[i]);
        const nombre = textoDe(celdas[i + 1]);
        if (clave && nombre) leyenda.set(clave, nombre);
      }
    });
  }

  const tabla = buscarTabla('Clave del Grupo');
  if (!tabla) return null;
  const matriz = tablaAMatriz(tabla);
  let inicio = 0;
  while (inicio < tabla.rows.length && Array.from(tabla.rows[inicio].cells).every((c) => c.tagName === 'TH')) inicio++;

  const materias = new Map();
  for (let r = inicio; r < matriz.length; r++) {
    const fila = matriz[r];
    if (!fila || fila.length < 6) continue;
    const grupo = textoDe(fila[0]);
    if (!grupo) continue;
    if (!materias.has(grupo)) materias.set(grupo, { grupo, nombre: textoDe(fila[1]), parciales: new Map() });
    const materia = materias.get(grupo);
    const num = textoDe(fila[2]);
    if (!num) continue;
    if (!materia.parciales.has(num)) materia.parciales.set(num, { numero: num, indicadores: [] });
    // Ind/Comp %: "3 / (30 %)"
    const m = textoDe(fila[4]).match(/^\s*([\w.-]+)\s*\/\s*\(?\s*([\d.]+)\s*%/);
    if (!m) continue;
    const calInd = numero(textoDe(fila[6]));
    materia.parciales.get(num).indicadores.push({
      clave: m[1],
      nombre: leyenda.get(m[1]) || `Indicador ${m[1]}`,
      peso: parseFloat(m[2]),
      docente: Number.isFinite(calInd) && calInd >= 0 ? calInd : null
    });
  }
  return Array.from(materias.values()).map((x) => ({
    grupo: x.grupo,
    nombre: x.nombre,
    parciales: Array.from(x.parciales.values()).filter((p) => p.indicadores.length)
  })).filter((x) => x.parciales.length);
}

/** Cálculo puro: recibe indicadores y devuelve el resumen. */
function calcularParcial(indicadores, supuestoPendiente) {
  let asegurados = 0;
  let pendiente = 0;
  let totalPesos = 0;
  const detalle = indicadores.map((ind) => {
    const peso = Math.max(0, Number(ind.peso) || 0);
    const n = Math.max(1, ind.notas.length);
    const valores = ind.notas.map((v) => {
      if (v === '' || v === null || v === undefined) return null;
      const x = parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : null;
    });
    const llenas = valores.filter((v) => v !== null);
    const suma = llenas.reduce((s, v) => s + v, 0);
    const aporte = (suma / n) * (peso / 100);
    const pesoPendiente = ((n - llenas.length) / n) * peso;
    asegurados += aporte;
    pendiente += pesoPendiente;
    totalPesos += peso;
    return {
      peso, n, aporte, pesoPendiente,
      capturadas: llenas.length,
      promedio: llenas.length ? suma / llenas.length : null
    };
  });
  const maximo = asegurados + pendiente;
  const necesario = pendiente > 0 ? ((CALIF_APROBATORIA - asegurados) / pendiente) * 100 : null;
  const proyeccion = asegurados + pendiente * (Math.max(0, Math.min(100, supuestoPendiente)) / 100);
  return { detalle, asegurados, pendiente, totalPesos, maximo, necesario, proyeccion };
}

/**
 * Crea la calculadora en el documento del shell.
 * herramientas: { mostrarModal, ocultarModal, crearToast }
 */
function crearCalculadora(herramientas) {
  const modal = el('div', {
    class: 'modal fade cm-calc', id: 'cmCalculadora', tabindex: '-1', 'aria-labelledby': 'cmCalcTitulo', 'aria-hidden': 'true',
    html: `
    <div class="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-md-down">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h5" id="cmCalcTitulo"><i class="bi bi-calculator me-2" aria-hidden="true"></i>Calculadora de parcial</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body" id="cmCalcCuerpo"></div>
        <div class="modal-footer cm-calc-pie" id="cmCalcPie"></div>
      </div>
    </div>` });
  insertar(modal, document.body, 'beforeend');
  const cuerpo = $('#cmCalcCuerpo', modal);
  const pie = $('#cmCalcPie', modal);

  const memoria = new Map(); // estados por materia/parcial mientras la página esté abierta
  const estado = {
    datos: null,          // materias leídas del portal (o [] si no se pudo)
    cargando: null,
    grupo: '',            // '' = personalizada
    parcial: '1',
    indicadores: [],
    supuesto: 80,
    recordar: false
  };
  let contador = 0;
  const nuevoId = () => `cmInd${++contador}`;
  const clave = () => `cmod.calc.${estado.grupo || 'personalizada'}.${estado.parcial}`;

  /* ---------- Datos ---------- */
  async function cargarDatos() {
    if (estado.datos) return estado.datos;
    if (!estado.cargando) {
      estado.cargando = (async () => {
        try {
          const html = await traerHtml(new URL('alu_califparcialesxind.asp', location.href).href);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          estado.datos = parsearParcialesDoc(doc) || [];
        } catch (e) {
          avisar('La calculadora no pudo leer los indicadores del portal.', e);
          estado.datos = [];
        }
        return estado.datos;
      })();
    }
    return estado.cargando;
  }
  const materiaActual = () => (estado.datos || []).find((m) => m.grupo === estado.grupo) || null;

  function indicadoresBase() {
    const materia = materiaActual();
    const parcial = materia ? materia.parciales.find((p) => p.numero === estado.parcial) : null;
    if (parcial) {
      return parcial.indicadores.map((i) => ({
        id: nuevoId(), nombre: enTitulo(i.nombre), peso: i.peso, propio: false,
        docente: i.docente, notas: [i.docente !== null ? String(i.docente) : '']
      }));
    }
    // Plantilla para modo personalizado
    return [
      { id: nuevoId(), nombre: 'Examen', peso: 40, propio: true, docente: null, notas: [''] },
      { id: nuevoId(), nombre: 'Trabajos y tareas', peso: 30, propio: true, docente: null, notas: ['', '', ''] },
      { id: nuevoId(), nombre: 'Proyecto', peso: 30, propio: true, docente: null, notas: [''] }
    ];
  }
  function guardarEstado() {
    memoria.set(clave(), { indicadores: estado.indicadores, supuesto: estado.supuesto });
    try {
      if (estado.recordar) {
        localStorage.setItem(clave(), JSON.stringify({ indicadores: estado.indicadores, supuesto: estado.supuesto }));
      }
    } catch (e) { /* almacenamiento no disponible */ }
  }
  function cargarEstado() {
    let guardado = memoria.get(clave()) || null;
    estado.recordar = false;
    try {
      const enDisco = localStorage.getItem(clave());
      if (enDisco) { estado.recordar = true; if (!guardado) guardado = JSON.parse(enDisco); }
    } catch (e) { /* nada */ }
    if (guardado && Array.isArray(guardado.indicadores) && guardado.indicadores.length) {
      estado.indicadores = guardado.indicadores.map((i) => ({ ...i, id: nuevoId(), notas: Array.isArray(i.notas) && i.notas.length ? i.notas.slice(0, MAX_ACTIVIDADES) : [''] }));
      estado.supuesto = Number.isFinite(guardado.supuesto) ? guardado.supuesto : 80;
    } else {
      estado.indicadores = indicadoresBase();
    }
  }

  /* ---------- Vista ---------- */
  function selectorMateria() {
    const materias = estado.datos || [];
    const select = el('select', { class: 'form-select', id: 'cmCalcMateria' }, [
      ...materias.map((m) => el('option', { value: m.grupo, text: `${enTitulo(m.nombre)} (${m.grupo})` })),
      el('option', { value: '', text: 'Materia personalizada' })
    ]);
    select.value = estado.grupo;
    select.addEventListener('change', () => {
      guardarEstado();
      estado.grupo = select.value;
      const materia = materiaActual();
      const numeros = materia ? materia.parciales.map((p) => p.numero) : ['1', '2', '3'];
      if (!numeros.includes(estado.parcial)) estado.parcial = numeros[0];
      cargarEstado();
      pintar();
    });
    return select;
  }
  function selectorParcial() {
    const materia = materiaActual();
    const numeros = materia ? materia.parciales.map((p) => p.numero) : ['1', '2', '3', '4', '5'];
    const select = el('select', { class: 'form-select', id: 'cmCalcParcial' },
      numeros.map((n) => el('option', { value: n, text: `Parcial ${n}` })));
    select.value = estado.parcial;
    select.addEventListener('change', () => {
      guardarEstado();
      estado.parcial = select.value;
      cargarEstado();
      pintar();
    });
    return select;
  }

  function tarjetaIndicador(ind, indice) {
    const tarjeta = el('section', { class: 'cm-calc-ind', 'aria-labelledby': `${ind.id}-t` });

    // Encabezado: nombre y porcentaje
    const nombre = ind.propio
      ? el('input', { class: 'form-control form-control-sm cm-calc-nombre', id: `${ind.id}-t`, value: ind.nombre, 'aria-label': 'Nombre del indicador', maxlength: '60' })
      : el('h3', { class: 'cm-calc-nombre-fijo', id: `${ind.id}-t`, text: ind.nombre });
    if (ind.propio) nombre.addEventListener('input', () => { ind.nombre = nombre.value; guardarEstado(); });
    const peso = el('input', {
      class: 'form-control form-control-sm text-end', type: 'number', min: '0', max: '100', step: 'any',
      inputmode: 'decimal', value: String(ind.peso), 'aria-label': `Porcentaje de ${ind.nombre}`
    });
    peso.addEventListener('input', () => { ind.peso = parseFloat(peso.value) || 0; recalcular(); });
    const quitar = el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', 'aria-label': `Quitar ${ind.nombre}`, title: 'Quitar indicador' }, [ico('trash')]);
    quitar.addEventListener('click', () => {
      estado.indicadores.splice(indice, 1);
      pintar();
    });
    tarjeta.append(el('div', { class: 'cm-calc-ind-cabeza' }, [
      el('div', { class: 'flex-grow-1 min-w-0' }, nombre),
      el('div', { class: 'input-group input-group-sm cm-calc-peso' }, [peso, el('span', { class: 'input-group-text', text: '%' })]),
      quitar
    ]));
    if (ind.docente !== null && ind.docente !== undefined) {
      tarjeta.append(el('p', { class: 'cm-calc-nota-docente' }, [ico('patch-check', 'me-1'),
        `Tu docente ya registró ${formatoNum(ind.docente)} en este indicador (se cargó como actividad 1).`]));
    }

    // Número de actividades
    const cantidad = el('input', {
      class: 'form-control form-control-sm text-center', type: 'number', min: '1', max: String(MAX_ACTIVIDADES),
      inputmode: 'numeric', value: String(ind.notas.length), 'aria-label': `Número de actividades de ${ind.nombre}`
    });
    const fijarCantidad = (n) => {
      const total = Math.max(1, Math.min(MAX_ACTIVIDADES, Math.round(n) || 1));
      while (ind.notas.length < total) ind.notas.push('');
      ind.notas.length = total;
      pintarActividades();
      cantidad.value = String(total);
      recalcular();
    };
    const menos = el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', 'aria-label': 'Una actividad menos' }, [ico('dash')]);
    const mas = el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', 'aria-label': 'Una actividad más' }, [ico('plus')]);
    menos.addEventListener('click', () => fijarCantidad(ind.notas.length - 1));
    mas.addEventListener('click', () => fijarCantidad(ind.notas.length + 1));
    cantidad.addEventListener('change', () => fijarCantidad(parseInt(cantidad.value, 10)));
    tarjeta.append(el('div', { class: 'cm-calc-cantidad' }, [
      el('label', { class: 'small text-body-secondary', for: `${ind.id}-n`, text: 'Actividades a evaluar' }),
      el('div', { class: 'input-group input-group-sm', style: { width: '8.5rem' } }, [menos, Object.assign(cantidad, { id: `${ind.id}-n` }), mas])
    ]));

    // Calificación de cada actividad
    const rejilla = el('div', { class: 'cm-calc-actividades' });
    const pintarActividades = () => {
      rejilla.replaceChildren(...ind.notas.map((v, i) => {
        const entrada = el('input', {
          class: 'form-control form-control-sm', type: 'number', min: '0', max: '100', step: 'any',
          inputmode: 'decimal', placeholder: '0 a 100', value: v,
          'aria-label': `Calificación de la actividad ${i + 1} de ${ind.nombre}`
        });
        entrada.addEventListener('input', () => {
          ind.notas[i] = entrada.value;
          const x = parseFloat(entrada.value);
          entrada.classList.toggle('is-invalid', entrada.value !== '' && (!Number.isFinite(x) || x < 0 || x > 100));
          recalcular();
        });
        return el('label', { class: 'cm-calc-act' }, [el('span', { text: ind.notas.length > 1 ? `Actividad ${i + 1}` : 'Calificación' }), entrada]);
      }));
    };
    pintarActividades();
    tarjeta.append(rejilla);

    // Resultado del indicador
    const resultado = el('div', { class: 'cm-calc-ind-resultado', 'aria-live': 'polite' });
    const barra = el('div', { class: 'progress', role: 'presentation' }, el('div', { class: 'progress-bar' }));
    tarjeta.append(resultado, barra);
    ind.pintarResultado = (d) => {
      const textoProm = d.promedio === null ? 'Sin calificaciones todavía' : `Promedio ${formatoNum(d.promedio, 1)}`;
      const pend = d.n - d.capturadas;
      resultado.replaceChildren(
        el('span', { text: textoProm + (pend && d.capturadas ? ` (${pend} pendiente${pend === 1 ? '' : 's'})` : '') }),
        el('strong', { text: `Aporta ${formatoNum(d.aporte, 2)} de ${formatoNum(d.peso, 2)} pts` })
      );
      barra.firstChild.style.width = d.peso ? `${Math.min(100, (d.aporte / d.peso) * 100)}%` : '0%';
    };
    return tarjeta;
  }

  let zonaIndicadores = null;
  let avisoPesos = null;
  function pintar() {
    const materias = estado.datos || [];
    zonaIndicadores = el('div', { class: 'cm-calc-lista' });
    avisoPesos = el('div', { class: 'cm-alerta cm-alerta-aviso', role: 'status', hidden: true });
    estado.indicadores.forEach((ind, i) => zonaIndicadores.append(tarjetaIndicador(ind, i)));
    const agregar = el('button', { type: 'button', class: 'btn btn-outline-primary btn-sm' }, [ico('plus-lg', 'me-1'), 'Agregar indicador']);
    agregar.addEventListener('click', () => {
      estado.indicadores.push({ id: nuevoId(), nombre: 'Nuevo indicador', peso: 0, propio: true, docente: null, notas: [''] });
      pintar();
      const ultimo = $$('.cm-calc-nombre', cuerpo).pop();
      if (ultimo) { ultimo.focus(); ultimo.select(); }
    });
    const restaurar = el('button', { type: 'button', class: 'btn btn-outline-secondary btn-sm' }, [ico('arrow-counterclockwise', 'me-1'), 'Empezar de nuevo']);
    restaurar.addEventListener('click', () => {
      memoria.delete(clave());
      estado.indicadores = indicadoresBase();
      pintar();
    });

    const recordar = el('input', { class: 'form-check-input', type: 'checkbox', id: 'cmCalcRecordar', checked: estado.recordar });
    recordar.addEventListener('change', () => {
      estado.recordar = recordar.checked;
      try { if (!recordar.checked) localStorage.removeItem(clave()); } catch (e) { /* nada */ }
      guardarEstado();
    });

    cuerpo.replaceChildren(...[
      el('div', { class: 'row g-2 mb-3' }, [
        el('div', { class: 'col-sm-8' }, [el('label', { class: 'form-label small mb-1', for: 'cmCalcMateria', text: 'Materia' }), selectorMateria()]),
        el('div', { class: 'col-sm-4' }, [el('label', { class: 'form-label small mb-1', for: 'cmCalcParcial', text: 'Parcial' }), selectorParcial()])
      ]),
      materias.length ? null : el('div', { class: 'cm-alerta cm-alerta-info' }, [ico('info-circle'),
        el('div', { text: 'No se pudieron leer tus indicadores del portal. Escribe los indicadores y sus porcentajes como los indicó tu docente.' })]),
      el('p', { class: 'small text-body-secondary' }, [
        estado.grupo ? 'Indicadores y porcentajes tomados del portal. ' : 'Escribe los indicadores y porcentajes que indicó tu docente. ',
        'Indica cuántas actividades tiene cada indicador (tareas, trabajos, prácticas) y califica cada una de 0 a 100. Deja en blanco lo que aún no te califican.'
      ]),
      avisoPesos,
      zonaIndicadores,
      el('div', { class: 'd-flex flex-wrap gap-2 mt-3' }, [agregar, restaurar]),
      el('div', { class: 'form-check mt-3' }, [recordar, el('label', { class: 'form-check-label small', for: 'cmCalcRecordar', text: 'Recordar estos datos en este dispositivo (sólo en tu navegador)' })]),
      el('p', { class: 'small text-body-secondary mt-2 mb-0' }, [ico('info-circle', 'me-1'),
        `Es una estimación. Aprobatoria: ${CALIF_APROBATORIA}. La calificación oficial la registra tu docente y puede aplicar redondeos o reglas propias.`])
    ].filter(Boolean));
    pintarPie();
    recalcular();
  }

  let piezasPie = null;
  function pintarPie() {
    const supuesto = el('input', {
      class: 'form-control form-control-sm text-end', type: 'number', min: '0', max: '100', step: 'any',
      inputmode: 'decimal', value: String(estado.supuesto), id: 'cmCalcSupuesto', style: { width: '5rem' }
    });
    supuesto.addEventListener('input', () => { estado.supuesto = parseFloat(supuesto.value) || 0; recalcular(); });
    piezasPie = {
      etiqueta: el('span', { class: 'small text-body-secondary text-center' }),
      estimada: el('span', { class: 'cm-cal cm-calc-grande' }),
      asegurados: el('strong'),
      maximo: el('strong'),
      mensaje: el('div', { class: 'cm-calc-mensaje', 'aria-live': 'polite' }),
      proyeccion: el('strong'),
      filaSupuesto: null
    };
    piezasPie.filaSupuesto = el('div', { class: 'cm-calc-supuesto' }, [
      el('label', { for: 'cmCalcSupuesto', text: 'Supón que en lo pendiente sacas' }), supuesto
    ]);
    pie.replaceChildren(el('div', { class: 'cm-calc-resumen' }, [
      el('div', { class: 'cm-calc-total' }, [piezasPie.etiqueta, piezasPie.estimada]),
      el('div', { class: 'cm-calc-datos' }, [
        el('div', {}, ['Asegurados: ', piezasPie.asegurados, el('span', { class: 'text-body-secondary', text: ' · ' }), 'Máximo: ', piezasPie.maximo]),
        piezasPie.mensaje,
        piezasPie.filaSupuesto
      ])
    ]));
  }

  function recalcular() {
    const r = calcularParcial(estado.indicadores, estado.supuesto);
    r.detalle.forEach((d, i) => { const ind = estado.indicadores[i]; if (ind && ind.pintarResultado) ind.pintarResultado(d); });
    if (avisoPesos) {
      const desviacion = Math.abs(r.totalPesos - 100) > 0.01;
      avisoPesos.hidden = !desviacion;
      if (desviacion) avisoPesos.replaceChildren(ico('exclamation-triangle'),
        el('div', { text: `Los porcentajes suman ${formatoNum(r.totalPesos, 2)} %. Deberían sumar 100 % para que la estimación sea correcta.` }));
    }
    if (!piezasPie) return;
    const hayPendiente = r.pendiente > 0.0001;
    const estimada = hayPendiente ? r.proyeccion : r.asegurados;
    piezasPie.etiqueta.textContent = hayPendiente
      ? `Si sacas ${formatoNum(Math.max(0, Math.min(100, estado.supuesto)), 1)} en lo pendiente`
      : 'Calificación del parcial';
    piezasPie.estimada.textContent = formatoNum(estimada, 1);
    piezasPie.estimada.className = `cm-cal cm-calc-grande ${estimada >= CALIF_APROBATORIA ? 'cm-cal-ok' : 'cm-cal-mal'}`;
    piezasPie.asegurados.textContent = `${formatoNum(r.asegurados, 2)} de ${formatoNum(r.totalPesos, 2)}`;
    piezasPie.maximo.textContent = formatoNum(r.maximo, 2);
    piezasPie.proyeccion.textContent = formatoNum(r.proyeccion, 1);
    piezasPie.filaSupuesto.hidden = !hayPendiente;

    let tipo = 'info';
    let texto;
    if (!hayPendiente) {
      texto = r.asegurados >= CALIF_APROBATORIA
        ? `Con todo calificado, tu parcial queda en ${formatoNum(r.asegurados, 1)}: aprobado.`
        : `Con todo calificado, tu parcial queda en ${formatoNum(r.asegurados, 1)}: no alcanza ${CALIF_APROBATORIA}.`;
      tipo = r.asegurados >= CALIF_APROBATORIA ? 'ok' : 'mal';
    } else if (r.necesario <= 0) {
      texto = `Ya aseguraste ${CALIF_APROBATORIA}: aunque saques 0 en lo pendiente, apruebas el parcial.`;
      tipo = 'ok';
    } else if (r.necesario > 100) {
      texto = `Aunque saques 100 en lo pendiente, llegarías a ${formatoNum(r.maximo, 1)}. Habla con tu docente sobre opciones para recuperar puntos.`;
      tipo = 'mal';
    } else {
      texto = `Para llegar a ${CALIF_APROBATORIA} necesitas un promedio de ${formatoNum(r.necesario, 1)} en lo pendiente (${formatoNum(r.pendiente, 2)} pts en juego).`;
    }
    piezasPie.mensaje.className = `cm-calc-mensaje cm-calc-mensaje-${tipo}`;
    piezasPie.mensaje.textContent = texto;
    guardarEstado();
  }

  /* ---------- API ---------- */
  async function abrir(opciones = {}) {
    cuerpo.replaceChildren(el('div', { class: 'd-flex align-items-center gap-2 text-body-secondary py-4 justify-content-center' }, [
      el('span', { class: 'spinner-border spinner-border-sm', 'aria-hidden': 'true' }), 'Leyendo tus indicadores del portal...'
    ]));
    pie.replaceChildren();
    herramientas.mostrarModal(modal);
    const datos = await cargarDatos();
    if (opciones.grupo !== undefined && (opciones.grupo === '' || datos.some((m) => m.grupo === opciones.grupo))) {
      estado.grupo = opciones.grupo;
    } else if (!estado.grupo && datos.length && !estado.indicadores.length) {
      estado.grupo = datos[0].grupo;
    } else if (estado.grupo && !datos.some((m) => m.grupo === estado.grupo)) {
      estado.grupo = datos.length ? datos[0].grupo : '';
    }
    const materia = materiaActual();
    if (opciones.parcial) estado.parcial = String(opciones.parcial);
    if (materia && !materia.parciales.some((p) => p.numero === estado.parcial)) estado.parcial = materia.parciales[0].numero;
    cargarEstado();
    pintar();
  }
  return { abrir };
}

/* ==========================================================================
   ARRANQUE: decide qué módulo aplicar en este documento
   ========================================================================== */
function elegirModulo() {
  if ($('#fraizq') && $('#fracontenido')) return { nombre: 'shell', fn: moduloShell };
  switch (PAGINA) {
    case 'login.htm': return { nombre: 'login', fn: moduloLogin };
    case 'mnualumno.asp': return null;          // menú de imágenes: se deja intacto (queda oculto por el shell)
    case 'portal_contenido.asp': return { nombre: 'marco', fn: () => agregarClases(document.body, 'cm-marco') };
    case 'bienvenido.asp': return { nombre: 'bienvenida', fn: moduloBienvenida };
    case 'alu_home.asp': return { nombre: 'inicio', fn: moduloInicio };
    case 'alu_kardex.asp': return { nombre: 'kardex', fn: moduloKardex };
    case 'alu_horariosemestre.asp': return { nombre: 'horario', fn: moduloHorario };
    case 'alu_califparcialesxind.asp': return { nombre: 'parciales', fn: moduloParciales };
    case 'alu_calfinales_modtrad.asp': return { nombre: 'finales', fn: moduloFinales };
    default:
      // Cualquier otra página del portal recibe el estilo genérico
      return document.body ? { nombre: 'generico', fn: moduloGenerico } : null;
  }
}

function iniciar() {
  if (window.__cmodCargado) return;
  window.__cmodCargado = true;
  // El arreglo del login se aplica siempre (incluso con ?sinmod o el diseño apagado)
  if (PAGINA === 'login.htm') {
    try { arregloLogin(); } catch (e) { avisar('No se pudo ajustar el formulario de acceso.', e); }
  }
  if (/[?&]sinmod\b/i.test(location.search)) return;

  if (leerPref(PREF.activo, '1') === '0') {
    if ($('#fraizq') && $('#fracontenido')) botonReactivar();
    return;
  }
  const modulo = elegirModulo();
  if (!modulo || !document.body) return;

  seguro(modulo.nombre, () => {
    inyectarRecursos();
    document.documentElement.classList.add('cm-activo');
    aplicarTema();
    instalarSincronizacionTema();
    instalarImpresionApp();
    window.__cmodRevertir = revertir;
    registrar(() => { delete window.__cmodRevertir; });
    modulo.fn();
  });
}

iniciar();

})();
