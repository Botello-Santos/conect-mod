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
     Estilos de los .xlsx
     SheetJS Community no escribe estilos. El libro se genera normal y luego se
     abre el propio .xlsx (es un ZIP) con XLSX.CFB para agregar una hoja de
     estilos propia (styles.xml) y el atributo s="" de cada celda, además de
     alturas de fila y encabezados fijos. Si algo falla, se guarda sin estilos.
     ------------------------------------------------------------------------ */
  const PALETA_PARCIAL = {
    1: { osc: '1F4E79', med: 'BDD7EE', cla: 'DDEBF7', txt: '1F3864' },
    2: { osc: '375623', med: 'C6E0B4', cla: 'E2EFDA', txt: '274E13' },
    3: { osc: '5B3A8C', med: 'D9CCEE', cla: 'EEE7F7', txt: '3F2766' }
  };
  const EST = {
    encabezado: { fill: '1B396A', color: 'FFFFFF', b: 1, h: 'center', wrap: 1 },
    parcial: p => ({ fill: PALETA_PARCIAL[p].osc, color: 'FFFFFF', b: 1, sz: 12, h: 'center' }),
    indicador: p => ({ fill: PALETA_PARCIAL[p].med, color: PALETA_PARCIAL[p].txt, b: 1, h: 'center', wrap: 1 }),
    etiqueta: p => ({ fill: PALETA_PARCIAL[p].cla, color: PALETA_PARCIAL[p].txt, b: 1, sz: 10, h: 'center', wrap: 1 }),
    menosEnc: { fill: 'F4CCCC', color: '9C0006', b: 1, h: 'center', wrap: 1 },
    finalEnc: { fill: 'FFD966', color: '7F6000', b: 1, h: 'center', wrap: 1 },
    totalEnc: { fill: 'A9D08E', color: '274E13', b: 1, h: 'center', wrap: 1 },
    centro: { h: 'center' },
    nombre: { h: 'left' },
    control: { h: 'center', color: '404040' },
    calculo: { fill: 'F2F2F2', color: '404040', h: 'center', fmt: '0.00' },
    menos: { fill: 'FDECEC', color: 'C00000', h: 'center' },
    final: { fill: 'FFF2CC', b: 1, h: 'center', fmt: '0.0' },
    extra: { fill: 'F0F7EC', h: 'center' },
    totalExtra: { fill: 'E2EFDA', b: 1, h: 'center', fmt: '0.##' },
    fecha: { fill: 'DDEBF7', color: '1F3864', b: 1, sz: 9, h: 'center', fmt: 'dd/mm' },
    titulo: { b: 1, sz: 14, color: '1B396A', borde: false },
    etiquetaInfo: { b: 1, color: '1B396A', borde: false },
    texto: { borde: false, wrap: 1 }
  };

  const escXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function xmlEstilos(specs, dxfs) {
    dxfs = dxfs || [];
    const fuentes = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>'];
    const idFuente = new Map();
    const rellenos = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const idRelleno = new Map();
    const formatos = [];
    const idFormato = new Map();
    const lin = '<color rgb="FFBFC8D6"/>';
    const bordes = ['<border><left/><right/><top/><bottom/><diagonal/></border>',
      '<border><left style="thin">' + lin + '</left><right style="thin">' + lin + '</right><top style="thin">' + lin + '</top><bottom style="thin">' + lin + '</bottom><diagonal/></border>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    specs.slice(1).forEach(s => {
      const kf = [s.b ? 1 : 0, s.i ? 1 : 0, s.sz || 11, s.color || ''].join('|');
      if (!idFuente.has(kf)) {
        idFuente.set(kf, fuentes.length);
        fuentes.push('<font>' + (s.b ? '<b/>' : '') + (s.i ? '<i/>' : '') + '<sz val="' + (s.sz || 11) + '"/>' +
          (s.color ? '<color rgb="FF' + s.color + '"/>' : '<color theme="1"/>') + '<name val="Calibri"/><family val="2"/></font>');
      }
      let relleno = 0;
      if (s.fill) {
        if (!idRelleno.has(s.fill)) {
          idRelleno.set(s.fill, rellenos.length);
          rellenos.push('<fill><patternFill patternType="solid"><fgColor rgb="FF' + s.fill + '"/><bgColor indexed="64"/></patternFill></fill>');
        }
        relleno = idRelleno.get(s.fill);
      }
      let formato = 0;
      if (s.fmt) {
        if (!idFormato.has(s.fmt)) {
          const id = 164 + formatos.length;
          idFormato.set(s.fmt, id);
          formatos.push('<numFmt numFmtId="' + id + '" formatCode="' + escXml(s.fmt) + '"/>');
        }
        formato = idFormato.get(s.fmt);
      }
      const alineacion = '<alignment' + (s.h ? ' horizontal="' + s.h + '"' : '') + ' vertical="center"' + (s.wrap ? ' wrapText="1"' : '') + '/>';
      xfs.push('<xf numFmtId="' + formato + '" fontId="' + idFuente.get(kf) + '" fillId="' + relleno + '" borderId="' + (s.borde === false ? 0 : 1) +
        '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' + alineacion + '</xf>');
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (formatos.length ? '<numFmts count="' + formatos.length + '">' + formatos.join('') + '</numFmts>' : '') +
      '<fonts count="' + fuentes.length + '">' + fuentes.join('') + '</fonts>' +
      '<fills count="' + rellenos.length + '">' + rellenos.join('') + '</fills>' +
      '<borders count="' + bordes.length + '">' + bordes.join('') + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="' + dxfs.length + '">' + dxfs.map(d => '<dxf>' + (d.color || d.b ? '<font>' + (d.b ? '<b/>' : '') + (d.color ? '<color rgb="FF' + d.color + '"/>' : '') + '</font>' : '') + (d.fill ? '<fill><patternFill patternType="solid"><bgColor rgb="FF' + d.fill + '"/></patternFill></fill>' : '') + '</dxf>').join('') + '</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>' +
      '</styleSheet>';
  }

  /** Agrega s="" a las celdas (creando las vacías que tengan estilo), alturas y panel fijo. */
  function estilizarHojaXml(xml, meta, idDe, idDxf) {
    const porFila = new Map();
    meta.celdas.forEach((spec, addr) => {
      const d = XLSX.utils.decode_cell(addr);
      if (!porFila.has(d.r + 1)) porFila.set(d.r + 1, []);
      porFila.get(d.r + 1).push({ addr, c: d.c, s: idDe(spec) });
    });
    xml = xml.replace(/<sheetData\/>|<sheetData>([\s\S]*?)<\/sheetData>/, (todo, cuerpo) => {
      const filas = new Map();
      (cuerpo || '').replace(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, (m, at, cont) => {
        const r = +/\br="(\d+)"/.exec(at)[1];
        filas.set(r, { at, cont: cont || '' });
        return '';
      });
      porFila.forEach((_, r) => { if (!filas.has(r)) filas.set(r, { at: ' r="' + r + '"', cont: '' }); });
      Object.keys(meta.altos).forEach(r => { r = +r; if (!filas.has(r)) filas.set(r, { at: ' r="' + r + '"', cont: '' }); });
      const salida = Array.from(filas.keys()).sort((a, b) => a - b).map(r => {
        const f = filas.get(r);
        const celdas = [];
        f.cont.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (m, at, interior) => {
          const addr = /\br="([A-Z]+\d+)"/.exec(at)[1];
          celdas.push({ addr, c: XLSX.utils.decode_cell(addr).c, at: at.replace(/\ss="\d+"/, ''), interior: interior == null ? null : interior });
          return '';
        });
        (porFila.get(r) || []).forEach(e => {
          let x = celdas.find(k => k.addr === e.addr);
          if (!x) { x = { addr: e.addr, c: e.c, at: ' r="' + e.addr + '"', interior: null }; celdas.push(x); }
          x.s = e.s;
        });
        celdas.sort((a, b) => a.c - b.c);
        let at = f.at.replace(/\s(?:ht|customHeight|spans)="[^"]*"/g, '');
        if (meta.altos[r]) at += ' ht="' + meta.altos[r] + '" customHeight="1"';
        return '<row' + at + '>' + celdas.map(k => '<c' + k.at + (k.s ? ' s="' + k.s + '"' : '') + (k.interior == null ? '/>' : '>' + k.interior + '</c>')).join('') + '</row>';
      });
      return '<sheetData>' + salida.join('') + '</sheetData>';
    });
    if (meta.fijo) {
      const { filas, cols } = meta.fijo;
      const tl = XLSX.utils.encode_cell({ r: filas, c: cols });
      const panel = cols && filas ? 'bottomRight' : (filas ? 'bottomLeft' : 'topRight');
      const pane = '<pane' + (cols ? ' xSplit="' + cols + '"' : '') + (filas ? ' ySplit="' + filas + '"' : '') +
        ' topLeftCell="' + tl + '" activePane="' + panel + '" state="frozen"/><selection pane="' + panel + '" activeCell="' + tl + '" sqref="' + tl + '"/>';
      xml = xml.replace(/<sheetView\b([^>]*?)\/>/, '<sheetView$1>' + pane + '</sheetView>');
    }
    // Formato condicional y validación de datos (van después de mergeCells, en ese orden)
    let extra = '';
    meta.condicionales.forEach((cf, i) => {
      extra += '<conditionalFormatting sqref="' + cf.sqref + '"><cfRule type="expression" dxfId="' + idDxf(cf.dxf) + '" priority="' + (i + 1) + '"' +
        (cf.parar ? ' stopIfTrue="1"' : '') + '><formula>' + escXml(cf.formula) + '</formula></cfRule></conditionalFormatting>';
    });
    if (meta.validaciones.length) {
      extra += '<dataValidations count="' + meta.validaciones.length + '">' + meta.validaciones.map(v =>
        '<dataValidation type="' + v.tipo + '" allowBlank="1" showInputMessage="1" showErrorMessage="1"' +
        (v.titulo ? ' errorTitle="' + escXml(v.titulo) + '" error="' + escXml(v.error || '') + '" promptTitle="' + escXml(v.titulo) + '" prompt="' + escXml(v.ayuda || '') + '"' : '') +
        (v.tipo === 'whole' ? ' operator="between"' : '') + ' sqref="' + v.sqref + '"><formula1>' + escXml(v.f1) + '</formula1>' +
        (v.f2 != null ? '<formula2>' + escXml(v.f2) + '</formula2>' : '') + '</dataValidation>').join('') + '</dataValidations>';
    }
    if (extra) {
      if (xml.includes('</mergeCells>')) xml = xml.replace('</mergeCells>', '</mergeCells>' + extra);
      else xml = xml.replace('</sheetData>', '</sheetData>' + extra);
    }
    return xml;
  }

  function aplicarEstilos(bytes, metas) {
    const CFB = XLSX.CFB;
    const zip = CFB.read(bytes, { type: 'array' });
    const specs = [null];
    const indice = new Map();
    const idDe = spec => {
      const k = JSON.stringify(spec);
      if (!indice.has(k)) { indice.set(k, specs.length); specs.push(spec); }
      return indice.get(k);
    };
    const dxfs = [];
    const indiceDxf = new Map();
    const idDxf = d => {
      const k = JSON.stringify(d);
      if (!indiceDxf.has(k)) { indiceDxf.set(k, dxfs.length); dxfs.push(d); }
      return indiceDxf.get(k);
    };
    const leer = f => new TextDecoder('utf-8').decode(f.content);
    const escribir = (f, texto) => { f.content = new TextEncoder().encode(texto); f.size = f.content.length; };
    metas.forEach((meta, i) => {
      if (!meta) return;
      const f = CFB.find(zip, '/xl/worksheets/sheet' + (i + 1) + '.xml');
      if (f) escribir(f, estilizarHojaXml(leer(f), meta, idDe, idDxf));
    });
    const st = CFB.find(zip, '/xl/styles.xml');
    escribir(st, xmlEstilos(specs, dxfs));
    return new Uint8Array(CFB.write(zip, { fileType: 'zip', type: 'array' }));
  }

  /** Metadatos de estilo de una hoja: celdas \u2192 estilo, alturas de fila y panel fijo. */
  function nuevoMeta() {
    const meta = { celdas: new Map(), altos: {}, fijo: null, condicionales: [], validaciones: [] };
    return {
      meta,
      est(r, c, spec) { meta.celdas.set(XLSX.utils.encode_cell({ r, c }), spec); },
      rango(r1, c1, r2, c2, spec) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.est(r, c, spec); },
      alto(r, ht) { meta.altos[r + 1] = ht; },
      fijar(filas, cols) { meta.fijo = { filas, cols }; },
      condicional(sqref, formula, dxf, parar) { meta.condicionales.push({ sqref, formula, dxf, parar }); },
      validar(v) { meta.validaciones.push(v); }
    };
  }

  function bytesABase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  function guardarLibro(wb, nombre, metas) {
    let bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    if (metas) {
      try { bytes = aplicarEstilos(bytes, metas); } catch (err) { console.warn('[CONECT Mod Docentes] Plantilla sin estilos:', err); }
    }
    // Pruebas automatizadas
    if (typeof window.__cdocGuardar === 'function') { window.__cdocGuardar(nombre, bytes); return; }
    // En la app de Android (WebView) las descargas blob: no funcionan: se manda el archivo a la app
    if (window.CMODAndroid && typeof window.CMODAndroid.postMessage === 'function') {
      window.CMODAndroid.postMessage(JSON.stringify({ tipo: 'descargar', nombre, mime: MIME_XLSX, base64: bytesABase64(bytes) }));
      return;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME_XLSX }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }

  function nombrePlantilla(modelo, sufijo) {
    return 'Calificaciones_' + (modelo.claveGrupo || 'grupo').replace(/[^\w-]+/g, '') + '_' + sufijo + '.xlsx';
  }

  function hojaInfo(filas) {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    ws['!cols'] = [{ wch: 32 }, { wch: 90 }];
    const m = nuevoMeta();
    m.est(0, 0, EST.titulo);
    m.alto(0, 24);
    filas.forEach((f, r) => {
      if (r === 0 || !f.length) return;
      if (f.length > 1) { m.est(r, 0, EST.etiquetaInfo); m.est(r, 1, EST.texto); } else if (/^[A-ZÁÉÍÓÚ]/.test(String(f[0])) && !/^\d/.test(String(f[0]))) m.est(r, 0, EST.etiquetaInfo);
    });
    return { ws, meta: m.meta };
  }

  /* ------------------------------------------------------------------------
     Plantilla básica: una columna por indicador
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
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 38 }].concat(encInd.map(e => ({ wch: Math.max(14, Math.min(30, e.length)) })));
    ws['!autofilter'] = { ref: 'A1:' + letraColumna(aoa[0].length - 1) + aoa.length };
    const m = nuevoMeta();
    m.rango(0, 0, 0, 2, EST.encabezado);
    m.rango(0, 3, 0, 2 + encInd.length, EST.parcial(1));
    for (let r = 1; r < aoa.length; r++) {
      m.est(r, 0, EST.centro); m.est(r, 1, EST.control); m.est(r, 2, EST.nombre);
      for (let c = 3; c < 3 + encInd.length; c++) m.est(r, c, EST.centro);
    }
    m.alto(0, 36);
    m.fijar(1, 3);

    const info = hojaInfo([
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

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
    XLSX.utils.book_append_sheet(wb, info.ws, 'Info');
    guardarLibro(wb, nombrePlantilla(modelo, 'basica_P' + modelo.parcial), [m.meta, info.meta]);
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
    const estilo = nuevoMeta();
    let maxR = 0;
    let maxC = 0;
    return {
      cols,
      estilo,
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
    h.estilo.rango(0, 0, 2, 2, EST.encabezado);
    h.ancho(0, 8); h.ancho(1, 14); h.ancho(2, 36);
    modelo.alumnos.forEach((al, i) => {
      const r = FILA_DATOS + i;
      h.put(r, 1, al.control); h.put(r, 2, al.nombre);
      h.estilo.est(r, 0, EST.centro); h.estilo.est(r, 1, EST.control); h.estilo.est(r, 2, EST.nombre);
    });
    h.estilo.alto(0, 22); h.estilo.alto(1, 46); h.estilo.alto(2, 30);
    h.estilo.fijar(FILA_DATOS, 3);
  }

  /* ------------------------------------------------------------------------
     Horario y fechas del grupo ("Detalle de mis materias", cat_detmaterias.asp)
     Cada materia es una tabla: "Grupo/Materia : 2V1A - ...", los días como
     <B>Lu</B> 07:00-09:00-D04 y las fechas "1 | Aplicar | Del dd/mm/aaaa al dd/mm/aaaa".
     ------------------------------------------------------------------------ */
  const DIA_SEMANA = { LU: 1, MA: 2, MI: 3, JU: 4, VI: 5, SA: 6 };

  function fechaDMA(t) {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }

  function parsearDetalle(html, clave) {
    const objetivo = normalizar(clave);
    const tablas = html.split(/<table\b/i).slice(1).filter(t => /Grupo\/Materia/i.test(t));
    const leerParciales = t => {
      const out = [];
      const rePar = /<td[^>]*>\s*(\d)\s*<\/td>\s*<td[^>]*>\s*(?:<b>)?\s*Aplicar\s*(?:<\/b>)?\s*<\/td>\s*<td[^>]*>([^<]*)<\/td>/gi;
      let m;
      while ((m = rePar.exec(t))) {
        const fechas = m[2].match(/\d{1,2}\/\d{1,2}\/\d{4}/g) || [];
        if (fechas.length === 2) out.push({ n: +m[1], ini: fechaDMA(fechas[0]), fin: fechaDMA(fechas[1]) });
      }
      return out.sort((a, b) => a.n - b.n);
    };
    const tabla = tablas.find(t => {
      const m = /Grupo\/Materia[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i.exec(t);
      return m && normalizar(m[1].replace(/<[^>]+>/g, ' ')).startsWith(objetivo);
    });
    // Días: solo si el grupo aparece (el portal a veces mezcla salones de otro grupo; el docente los confirma)
    const dias = new Set();
    if (tabla) {
      const reDia = /<b>\s*(Lu|Ma|Mi|Ju|Vi|Sa)\s*<\/b>\s*\d\d:\d\d-\d\d:\d\d/gi;
      let m;
      while ((m = reDia.exec(tabla))) dias.add(DIA_SEMANA[m[1].toUpperCase()]);
    }
    // Fechas de parciales: son del calendario institucional; si el grupo no aparece se toman de otra materia
    let parciales = tabla ? leerParciales(tabla) : [];
    if (!parciales.length) parciales = (tablas.map(leerParciales).find(p => p.length)) || [];
    if (!parciales.length) return null;
    return { dias, parciales, grupoEncontrado: !!tabla };
  }

  async function leerDetalleGrupo(clave) {
    const r = await fetch('cat_detmaterias.asp' + location.search, { credentials: 'include' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = new TextDecoder('windows-1252').decode(await r.arrayBuffer());
    return parsearDetalle(html, clave);
  }

  /** Fecha de inicio sugerida: ~5 semanas antes del primer parcial, en lunes. */
  function inicioSugerido(detalle) {
    const p1 = detalle && detalle.parciales[0];
    const base = p1 ? new Date(p1.ini.getFullYear(), p1.ini.getMonth(), p1.ini.getDate() - 35) : new Date();
    const dow = base.getDay();
    base.setDate(base.getDate() - ((dow + 6) % 7));
    return base;
  }

  /** Lista de clases entre el inicio y el fin del último parcial, con el parcial al que pertenecen. */
  function generarSesiones(inicio, detalle) {
    if (!detalle || !inicio || !detalle.parciales.length) return null;
    const fin = detalle.parciales[detalle.parciales.length - 1].fin;
    const sesiones = [];
    for (let d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()); d <= fin; d.setDate(d.getDate() + 1)) {
      if (!detalle.dias.has(d.getDay())) continue;
      const p = detalle.parciales.find(x => d <= x.fin);
      sesiones.push({ fecha: new Date(d), parcial: p ? p.n : detalle.parciales.length });
    }
    return sesiones.length ? sesiones : null;
  }

  const serialExcel = d => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000;

  function hojaAsistencia(modelo, sesiones) {
    const ha = nuevaHoja();
    const n = modelo.alumnos.length;
    const F_ASUETO = 2;          // fila 3 de Excel
    const ini = FILA_DATOS;      // primera fila de alumnos (fila 4)
    const fin = FILA_DATOS + n - 1;
    const filaDia = fin + 1;     // "Faltas del día"
    const lista = sesiones || Array.from({ length: 40 }, () => ({ fecha: null, parcial: 0 }));
    const c0 = 3;
    const c1 = c0 + lista.length - 1;
    const cSes = c1 + 1, cFal = c1 + 2, cPor = c1 + 3;
    const L = c => letraColumna(c);

    // Encabezados fijos
    ha.put(0, 0, 'ASISTENCIA · 0 = asistió \u2714 · 1 = faltó \u2718'); ha.merge(0, 0, 0, 2);
    ha.estilo.rango(0, 0, 0, 2, EST.encabezado);
    ['Equipo', 'No. Control', 'Nombre'].forEach((t, i) => { ha.put(1, i, t); ha.estilo.est(1, i, EST.encabezado); });
    ha.put(F_ASUETO, 0, 'Asueto: elige \u2612 en el día que no hubo clase \u2192'); ha.merge(F_ASUETO, 0, F_ASUETO, 2);
    ha.estilo.rango(F_ASUETO, 0, F_ASUETO, 2, { fill: 'EDEDED', color: '595959', i: 1, h: 'right', sz: 10 });
    ha.ancho(0, 8); ha.ancho(1, 14); ha.ancho(2, 36);

    // Una columna por sesión
    let grupoIni = c0;
    lista.forEach((s, k) => {
      const c = c0 + k;
      const p = s.parcial || 1;
      if (s.fecha) {
        ha.put(1, c, serialExcel(s.fecha));
        ha.estilo.est(1, c, { fill: PALETA_PARCIAL[p].cla, color: PALETA_PARCIAL[p].txt, b: 1, sz: 9, h: 'center', wrap: 1, fmt: '[$-es-MX]ddd dd/mm' });
      } else {
        ha.put(1, c, 'S' + (k + 1));
        ha.estilo.est(1, c, EST.etiqueta(1));
      }
      ha.estilo.est(F_ASUETO, c, { fill: 'F7F7F7', color: '7F7F7F', h: 'center', fmt: ';;;"\u2612"' });
      ha.estilo.rango(ini, c, fin, c, { h: 'center', b: 1, fmt: '[Red]"\u2718";[Red]"\u2718";[Color10]"\u2714"' });
      ha.put(filaDia, c, { f: 'IF(' + L(c) + '$' + (F_ASUETO + 1) + '<>"","",IF(COUNT(' + L(c) + (ini + 1) + ':' + L(c) + (fin + 1) + ')=0,"",COUNTIF(' + L(c) + (ini + 1) + ':' + L(c) + (fin + 1) + ',1)))' });
      ha.estilo.est(filaDia, c, { fill: 'FDECEC', color: 'C00000', b: 1, h: 'center' });
      ha.ancho(c, 7);
      // Encabezado de parcial (agrupa las sesiones consecutivas del mismo parcial)
      const sig = lista[k + 1];
      if (!sig || (sig.parcial || 1) !== p) {
        ha.put(0, grupoIni, sesiones ? 'PARCIAL ' + p : 'SESIONES (escribe la fecha de cada clase)');
        ha.merge(0, grupoIni, 0, c);
        ha.estilo.rango(0, grupoIni, 0, c, EST.parcial(sesiones ? p : 1));
        grupoIni = c + 1;
      }
    });

    // Resumen por alumno: sesiones registradas (sin asuetos), faltas y % de faltas
    const asueto = '$' + L(c0) + '$' + (F_ASUETO + 1) + ':$' + L(c1) + '$' + (F_ASUETO + 1);
    [[cSes, 'SESIONES', 10], [cFal, 'FALTAS', 9], [cPor, '% FALTAS', 10]].forEach(([c, t, w]) => {
      ha.put(0, c, t); ha.merge(0, c, F_ASUETO, c); ha.ancho(c, w);
      ha.estilo.rango(0, c, F_ASUETO, c, c === cPor ? EST.menosEnc : EST.finalEnc);
    });
    modelo.alumnos.forEach((al, i) => {
      const r = ini + i;
      const fila = L(c0) + (r + 1) + ':' + L(c1) + (r + 1);
      ha.put(r, 1, al.control); ha.put(r, 2, al.nombre);
      ha.estilo.est(r, 0, EST.centro); ha.estilo.est(r, 1, EST.control); ha.estilo.est(r, 2, EST.nombre);
      ha.put(r, cSes, { f: 'SUMPRODUCT((' + asueto + '="")*(' + fila + '<>""))' });
      ha.put(r, cFal, { f: 'SUMPRODUCT((' + asueto + '="")*(' + fila + '=1))' });
      ha.put(r, cPor, { f: 'IF(' + L(cSes) + (r + 1) + '=0,"",' + L(cFal) + (r + 1) + '/' + L(cSes) + (r + 1) + ')' });
      ha.estilo.est(r, cSes, { fill: 'F2F2F2', h: 'center', fmt: '0' });
      ha.estilo.est(r, cFal, { fill: 'F2F2F2', h: 'center', b: 1, fmt: '0' });
      ha.estilo.est(r, cPor, { fill: 'FFF2CC', h: 'center', b: 1, fmt: '0%' });
    });
    ha.put(filaDia, 2, 'Faltas del día');
    ha.estilo.est(filaDia, 2, { fill: 'FDECEC', color: 'C00000', b: 1, h: 'right' });
    ha.estilo.rango(filaDia, 0, filaDia, 1, { fill: 'FDECEC' });

    // Días de asueto en gris; 20 % o más de faltas en rojo, 10 % o más en ámbar
    const rangoDatos = L(c0) + (ini + 1) + ':' + L(c1) + (filaDia + 1);
    ha.estilo.condicional(rangoDatos, L(c0) + '$' + (F_ASUETO + 1) + '<>""', { fill: 'D9D9D9', color: 'A6A6A6' }, true);
    const rangoPor = L(cPor) + (ini + 1) + ':' + L(cPor) + (fin + 1);
    ha.estilo.condicional(rangoPor, 'AND(' + L(cPor) + (ini + 1) + '<>"",' + L(cPor) + (ini + 1) + '>=0.2)', { fill: 'F4CCCC', color: '9C0006', b: 1 }, true);
    ha.estilo.condicional(rangoPor, 'AND(' + L(cPor) + (ini + 1) + '<>"",' + L(cPor) + (ini + 1) + '>=0.1)', { fill: 'FFE699', color: '7F6000' });
    ha.estilo.validar({ tipo: 'list', sqref: L(c0) + (F_ASUETO + 1) + ':' + L(c1) + (F_ASUETO + 1), f1: '"\u2612"', titulo: 'Asueto', ayuda: 'Elige \u2612 si ese día no hubo clase: no cuenta para la asistencia.', error: 'Solo se puede elegir \u2612 o dejarlo vacío.' });
    ha.estilo.validar({ tipo: 'whole', sqref: L(c0) + (ini + 1) + ':' + L(c1) + (fin + 1), f1: '0', f2: '1', titulo: 'Pase de lista', ayuda: '0 = asistió (\u2714)  ·  1 = faltó (\u2718)', error: 'Escribe 0 si asistió o 1 si faltó.' });

    ha.estilo.alto(0, 22); ha.estilo.alto(1, 30); ha.estilo.alto(F_ASUETO, 20);
    ha.estilo.fijar(FILA_DATOS, 3);
    return ha;
  }

  function descargarPlantillaMejorada(modelo, opciones) {
    opciones = opciones || {};
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
      // Cada criterio vale según su peso (5 pts en un indicador de 30% = 1.5 sobre la final); OTRO suma directo
      const criterios = inds.map(ind => ({ titulo: tituloInd(ind), peso: ind.peso, etq: 'pts × ' + ind.peso + '%' }))
        .concat([{ titulo: 'OTRO (directo a la final)', peso: 100, etq: 'pts directos' }]);
      const terminos = [];
      criterios.forEach(cr => {
        hx.put(1, c, cr.titulo); hx.put(2, c, cr.etq); hx.ancho(c, Math.max(11, Math.min(22, cr.titulo.length)));
        hx.estilo.est(1, c, EST.indicador(p)); hx.estilo.est(2, c, EST.etiqueta(p));
        hx.estilo.rango(FILA_DATOS, c, ultima, c, EST.extra);
        terminos.push({ c, peso: cr.peso });
        c++;
      });
      totalExtra[p] = c;
      hx.put(1, c, 'TOTAL EXTRA (sobre la final)'); hx.merge(1, c, 2, c); hx.ancho(c, 14);
      hx.estilo.rango(1, c, 2, c, EST.totalEnc);
      for (let r = FILA_DATOS; r <= ultima; r++) {
        const rango = celda(r, ini) + ':' + celda(r, c - 1);
        const suma = terminos.map(t => 'N(' + celda(r, t.c) + ')' + (t.peso === 100 ? '' : '*' + t.peso + '/100')).join('+');
        hx.put(r, c, { f: 'IF(COUNT(' + rango + ')=0,"",' + suma + ')' });
        hx.estilo.est(r, c, EST.totalExtra);
      }
      c++;
      hx.put(0, ini, 'PARCIAL ' + p); hx.merge(0, ini, 0, c - 1);
      hx.estilo.rango(0, ini, 0, c - 1, EST.parcial(p));
    }

    // --- Calificaciones
    const h = nuevaHoja();
    columnasFijas(h, modelo);
    c = 3;
    for (let p = 1; p <= 3; p++) {
      const ini = c;
      const menos = c;
      h.put(1, c, 'PUNTOS MENOS'); h.merge(1, c, 2, c); h.ancho(c, 9);
      h.estilo.rango(1, c, 2, c, EST.menosEnc);
      h.estilo.rango(FILA_DATOS, c, ultima, c, EST.menos);
      c++;
      const ponderados = [];
      inds.forEach(ind => {
        const varias = RE_INDICADOR_ACTIVIDADES.test(normalizar(ind.nombre));
        const nAct = varias ? 6 : 1;
        const iniInd = c;
        for (let k = 1; k <= nAct; k++) {
          h.put(2, c, varias ? 'T' + k : 'Calificación'); h.ancho(c, varias ? 6 : 12);
          h.estilo.est(2, c, EST.etiqueta(p));
          h.estilo.rango(FILA_DATOS, c, ultima, c, EST.centro);
          c++;
        }
        let prom = null;
        if (varias) {
          prom = c; h.put(2, c, 'PROMEDIO'); h.ancho(c, 10);
          h.estilo.est(2, c, EST.etiqueta(p));
          c++;
        }
        const pond = c;
        h.put(2, c, 'PONDERADO ' + ind.peso + '%'); h.ancho(c, 13);
        h.estilo.est(2, c, EST.etiqueta(p));
        c++;
        h.put(1, iniInd, tituloInd(ind)); h.merge(1, iniInd, 1, c - 1);
        h.estilo.rango(1, iniInd, 1, c - 1, EST.indicador(p));
        for (let r = FILA_DATOS; r <= ultima; r++) {
          let fuente = celda(r, iniInd);
          if (varias) {
            const rango = celda(r, iniInd) + ':' + celda(r, prom - 1);
            h.put(r, prom, { f: 'IF(COUNT(' + rango + ')=0,"",AVERAGE(' + rango + '))' });
            h.estilo.est(r, prom, EST.calculo);
            fuente = celda(r, prom);
          }
          h.put(r, pond, { f: 'IF(' + fuente + '="","",' + fuente + '*' + ind.peso + '/100)' });
          h.estilo.est(r, pond, EST.calculo);
        }
        ponderados.push(pond);
      });
      const fin = c;
      h.put(1, c, 'FINAL'); h.merge(1, c, 2, c); h.ancho(c, 9);
      h.estilo.rango(1, c, 2, c, EST.finalEnc);
      c++;
      const colTotal = letraColumna(totalExtra[p]);
      for (let r = FILA_DATOS; r <= ultima; r++) {
        const lista = ponderados.map(pc => celda(r, pc)).join(',');
        const extra = "SUMIF('" + HOJA_EXTRA + "'!$B:$B,$B" + (r + 1) + ",'" + HOJA_EXTRA + "'!" + colTotal + ':' + colTotal + ')';
        h.put(r, fin, { f: 'IF(COUNT(' + lista + ')=0,"",MIN(100,MAX(0,SUM(' + lista + ')-N(' + celda(r, menos) + ')+' + extra + ')))' });
        h.estilo.est(r, fin, EST.final);
      }
      h.put(0, ini, 'PARCIAL ' + p); h.merge(0, ini, 0, c - 1);
      h.estilo.rango(0, ini, 0, c - 1, EST.parcial(p));
    }

    // --- Asistencia: una columna por clase (según el horario del grupo), casilla de asueto,
    //     0 = asistió (\u2714 verde), 1 = faltó (\u2718 roja), y % de faltas que se actualiza al pasar lista
    const ha = hojaAsistencia(modelo, opciones.sesiones);

    // --- Segunda oportunidad
    const hs = nuevaHoja();
    ['No. Control', 'Nombre', 'Parcial 1', 'Parcial 2', 'Parcial 3'].forEach((t, i) => {
      hs.put(0, i, t);
      hs.estilo.est(0, i, i < 2 ? EST.encabezado : EST.parcial(i - 1));
    });
    hs.ancho(0, 14); hs.ancho(1, 36); hs.ancho(2, 10); hs.ancho(3, 10); hs.ancho(4, 10);
    modelo.alumnos.forEach((al, i) => {
      hs.put(1 + i, 0, al.control); hs.put(1 + i, 1, al.nombre);
      hs.estilo.est(1 + i, 0, EST.control); hs.estilo.est(1 + i, 1, EST.nombre);
      hs.estilo.rango(1 + i, 2, 1 + i, 4, EST.centro);
    });
    hs.estilo.alto(0, 22);
    hs.estilo.fijar(1, 2);

    // --- Info
    const info = hojaInfo([
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
      ['   Los extras de cada criterio valen según su peso (5 pts en un criterio de 30% = 1.5 sobre la final). OTRO suma directo.'],
      ['4. No cambies la columna "No. Control": con ella se identifica a cada alumno.'],
      ['5. En CONECT abre la captura del parcial y sube este archivo: se lee el bloque del parcial que estás capturando.'],
      ['6. El portal guarda una calificación por indicador; para que su final coincida con la tuya, la extensión reparte'],
      ['   los puntos extra/menos entre los indicadores (ninguno pasa de 100). Revisa la vista previa antes de guardar.'],
      [],
      ['Asistencia'],
      ['Una columna por cada clase según tu horario. Escribe 0 si asistió (se ve \u2714 verde) o 1 si faltó (\u2718 roja).'],
      ['Si un día no hubo clase, elige \u2612 en la fila "Asueto": la columna se pone gris y no cuenta. El % de faltas se actualiza solo (ámbar desde 10 %, rojo desde 20 %).'],
      [],
      ['Colores'],
      ['Azul = parcial 1 · Verde = parcial 2 · Morado = parcial 3 · Gris = se calcula solo · Amarillo = calificación final · Rojo = puntos menos.']
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, h.fin(), 'Calificaciones');
    XLSX.utils.book_append_sheet(wb, hx.fin(), HOJA_EXTRA);
    XLSX.utils.book_append_sheet(wb, ha.fin(), 'Asistencia');
    XLSX.utils.book_append_sheet(wb, hs.fin(), 'Segunda oportunidad');
    XLSX.utils.book_append_sheet(wb, info.ws, 'Info');
    guardarLibro(wb, nombrePlantilla(modelo, 'mejorada'), [h.estilo.meta, hx.estilo.meta, ha.estilo.meta, hs.estilo.meta, info.meta]);
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
        // Peso de cada columna: el del indicador de su encabezado (OTRO u otra columna = directo)
        const cols = [];
        for (let c = bx.ini; c <= bx.fin; c++) {
          const g = grupoColumna(mx, gx, c);
          if (/^TOTAL/.test(g)) continue;
          const num = /^(\d+) /.exec(g);
          let ind = num ? inds.find(x => x.num === num[1]) : null;
          if (!ind) ind = inds.find(x => g.includes(normalizar(x.nombre).slice(0, 10)));
          cols.push({ c, factor: ind ? ind.peso / 100 : 1 });
        }
        mx.slice(FILA_DATOS).forEach(f => {
          const ctrl = normalizarControl(f[cx]);
          if (!ctrl) return;
          const s = cols.reduce((a, k) => a + (numeroCelda(f[k.c]) || 0) * k.factor, 0);
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
  /**
   * Controles de asistencia de la plantilla mejorada: inicio del semestre y días
   * de clase. Se prellenan con "Detalle de mis materias"; el docente confirma.
   */
  function controlAsistencia(modelo) {
    const NOMBRES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    let detalle = null;
    const fecha = el('input', { type: 'date', class: 'cdoc-fecha', 'aria-label': 'Inicio del semestre' });
    const casillas = NOMBRES.map((d, i) => {
      const cb = el('input', { type: 'checkbox', value: String(i + 1) });
      return { cb, nodo: el('label', { class: 'cdoc-dia' }, [cb, d]) };
    });
    const resumen = el('div', { class: 'cdoc-nota cdoc-asis-resumen', text: 'Buscando tu horario en "Detalle de mis materias"\u2026' });
    const aIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const deIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };

    function sesiones() {
      if (!detalle) return null;
      const dias = new Set(casillas.filter(k => k.cb.checked).map(k => +k.cb.value));
      if (!dias.size) return null;
      return generarSesiones(deIso(fecha.value), { dias, parciales: detalle.parciales });
    }
    function actualizar() {
      if (!detalle) return;
      const s = sesiones();
      resumen.textContent = s
        ? s.length + ' clases (parcial 1: ' + s.filter(x => x.parcial === 1).length + ', parcial 2: ' + s.filter(x => x.parcial === 2).length +
          ', parcial 3: ' + s.filter(x => x.parcial === 3).length + '), hasta el ' + detalle.parciales[detalle.parciales.length - 1].fin.toLocaleDateString('es-MX') + '.'
        : 'Marca los días que das clase a este grupo.';
      resumen.classList.toggle('cdoc-asis-falta', !s);
    }
    fecha.addEventListener('change', actualizar);
    casillas.forEach(k => k.cb.addEventListener('change', actualizar));

    leerDetalleGrupo(modelo.claveGrupo).then(d => {
      if (!d) throw new Error('sin datos');
      detalle = d;
      fecha.value = aIso(inicioSugerido(d));
      casillas.forEach(k => { k.cb.checked = d.dias.has(+k.cb.value); });
      actualizar();
      if (!d.grupoEncontrado) resumen.textContent = 'Tu grupo no aparece en "Detalle de mis materias": marca los días que das clase.';
      else if (d.dias.size > 3) resumen.textContent += ' Revisa los días: el portal a veces incluye horarios de otro grupo.';
    }).catch(() => {
      resumen.textContent = 'No se pudo leer tu horario: la hoja de asistencia tendrá 40 columnas para escribir las fechas.';
      fecha.disabled = true;
      casillas.forEach(k => { k.cb.disabled = true; });
    });

    const nodo = el('div', { class: 'cdoc-asis' }, [
      el('div', { class: 'cdoc-asis-fila' }, [el('span', { class: 'cdoc-asis-etq', text: 'Asistencia desde' }), fecha]),
      el('div', { class: 'cdoc-asis-fila' }, [el('span', { class: 'cdoc-asis-etq', text: 'Días de clase' })].concat(casillas.map(k => k.nodo))),
      resumen
    ]);
    return { nodo, sesiones };
  }

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
    const asistencia = controlAsistencia(modelo);
    ui.asistencia = asistencia.nodo;

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
              ui.asistencia,
              el('button', { type: 'button', class: 'cdoc-btn', onclick: () => {
                try { descargarPlantillaMejorada(modelo, { sesiones: asistencia.sesiones() }); } catch (err) { avisar('No se pudo generar la plantilla: ' + err.message, 'error'); }
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
.cdoc-asis{margin-top:8px;padding-top:8px;border-top:1px dashed var(--b);display:flex;flex-direction:column;gap:6px}
.cdoc-asis-fila{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.cdoc-asis-etq{font-size:12.5px;font-weight:600;color:var(--t);min-width:108px}
.cdoc-fecha{font:inherit;font-size:13px;padding:4px 8px;border:1px solid var(--b);border-radius:7px;background:var(--sup);color:var(--t)}
.cdoc-dia{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;padding:3px 8px;border:1px solid var(--b);border-radius:999px;background:var(--sup);cursor:pointer;color:var(--t)}
.cdoc-dia input{margin:0;accent-color:var(--p)}
.cdoc-asis-resumen{margin:0}
.cdoc-asis-falta{color:var(--av);font-weight:600}
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
    module.exports = { evaluarValor, calcularFinal, normalizarControl, claveNombre, analizarMatriz, autoMapear, cruzar, descargarPlantilla, descargarPlantillaMejorada, leerPlantillaMejorada, ajustarIndicadores, parsearDetalle, generarSesiones, inicioSugerido };
    return;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
