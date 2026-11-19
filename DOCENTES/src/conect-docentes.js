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
    const nombre = 'Calificaciones_' + (modelo.claveGrupo || 'grupo').replace(/[^\w-]+/g, '') + '_P' + modelo.parcial + '.xlsx';
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
          el('div', { class: 'cdoc-paso-tit', text: 'Descarga la plantilla (opcional)' }),
          el('div', { class: 'cdoc-nota', text: 'Trae la lista del grupo, los indicadores y las calificaciones actuales. También puedes usar tu propio Excel con una columna de número de control.' }),
          el('button', { type: 'button', class: 'cdoc-btn cdoc-btn-sec', onclick: () => {
            try { descargarPlantilla(modelo); } catch (err) { avisar('No se pudo generar la plantilla: ' + err.message, 'error'); }
          } }, 'Descargar plantilla .xlsx')
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
        el('th', { text: 'Calif.' })
      ]);
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
.cdoc-panel{--p:#1b396a;--p2:#132a4f;--ps:#e8eef8;--ac:#8a2036;--b:#dfe5ee;--t:#1a2433;--ts:#4b5768;--ok:#17784a;--okf:#e4f4ec;--er:#b42318;--erf:#fdeceb;--av:#8f5200;--avf:#fff2dc;
  font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--t);background:#fff;border:1px solid var(--b);border-radius:12px;
  box-shadow:0 1px 3px rgba(16,24,40,.08);max-width:860px;margin:4px auto 18px;padding:16px 18px;text-align:left;box-sizing:border-box}
.cdoc-panel *{box-sizing:border-box}
.cdoc-cab{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--b);padding-bottom:12px;margin-bottom:6px}
.cdoc-titulo{font-size:18px;font-weight:700;color:var(--p)}
.cdoc-sub{color:var(--ts);font-size:13px}
.cdoc-chips,.cdoc-resumen{display:flex;flex-wrap:wrap;gap:6px}
.cdoc-resumen{margin:8px 0}
.cdoc-chip{display:inline-block;padding:2px 10px;border-radius:999px;background:#edf0f4;color:#36424f;font-size:12px;font-weight:600;white-space:nowrap}
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
.cdoc-zona{display:flex;flex-direction:column;align-items:center;gap:2px;padding:18px;border:2px dashed #b7c3d6;border-radius:10px;background:#f8fafc;cursor:pointer;text-align:center;color:var(--t)}
.cdoc-zona span{color:var(--ts);font-size:12.5px}
.cdoc-zona:hover,.cdoc-sobre{border-color:var(--p);background:var(--ps)}
.cdoc-btn{font:inherit;font-weight:600;border:1px solid var(--p);background:var(--p);color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;margin:2px 6px 2px 0}
.cdoc-btn:hover{background:var(--p2)}
.cdoc-btn:disabled{opacity:.45;cursor:not-allowed}
.cdoc-btn-sec{background:#fff;color:var(--p)}
.cdoc-btn-sec:hover{background:var(--ps)}
.cdoc-btn-guardar{background:var(--ac);border-color:var(--ac)}
.cdoc-btn-guardar:hover{background:#6e1a2b}
.cdoc-btn:focus-visible,.cdoc-select:focus-visible,.cdoc-zona:focus-within{outline:3px solid rgba(29,79,158,.35);outline-offset:2px}
.cdoc-grid{display:grid;grid-template-columns:minmax(160px,1fr) minmax(180px,1.4fr);gap:6px 12px;align-items:center}
@media (max-width:560px){.cdoc-grid{grid-template-columns:1fr}}
.cdoc-etq{font-size:13px;font-weight:600}
.cdoc-etq-suave{font-weight:400;color:var(--ts)}
.cdoc-select{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--b);border-radius:7px;background:#fff;color:var(--t);width:100%}
.cdoc-vista{max-height:380px;overflow:auto;border:1px solid var(--b);border-radius:8px;margin:6px 0}
.cdoc-tabla{border-collapse:collapse;width:100%;font-size:12.5px}
.cdoc-tabla th{position:sticky;top:0;background:#eef2f7;color:var(--t);text-align:left;padding:6px 8px;border-bottom:1px solid var(--b);white-space:nowrap}
.cdoc-tabla td{padding:4px 8px;border-bottom:1px solid #eef1f5;white-space:nowrap}
.cdoc-tabla td:nth-child(3){white-space:normal;min-width:160px}
.cdoc-tabla s{color:#98a2b3}
.cdoc-mono{font-family:ui-monospace,Consolas,monospace}
.cdoc-nuevo b{color:var(--ok)}
.cdoc-rep b,.cdoc-rep{color:var(--er)}
.cdoc-err{background:var(--erf);color:var(--er);font-weight:700}
.cdoc-sin{color:#98a2b3}
.cdoc-fila-sin-datos td{background:#fffaf0}
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
`;

  function inyectarEstilos() {
    if ($('#cdoc-estilos')) return;
    const st = el('style', { id: 'cdoc-estilos' });
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
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

  /**
   * La página principal es un frameset: cols="165px,*". Mientras el marco
   * izquierdo muestra un paso de acceso se ensancha (o pasa a pantalla
   * completa en pantallas angostas); al llegar al menú se restaura.
   */
  function ajustarMarcos(esAcceso) {
    try {
      if (window.name !== 'fraizq' || window.parent !== window.top) return;
      const fs = window.top.document.querySelector('frameset');
      if (!fs) return;
      if (!fs.hasAttribute('data-cdoc-cols')) fs.setAttribute('data-cdoc-cols', fs.getAttribute('cols') || '165px,*');
      const original = fs.getAttribute('data-cdoc-cols');
      // El portal no declara viewport: en celular se ve a ancho de escritorio.
      // Solo durante el acceso se usa el ancho del dispositivo.
      const topDoc = window.top.document;
      let meta = topDoc.getElementById('cdoc-viewport');
      if (esAcceso && !meta && !topDoc.querySelector('meta[name="viewport"]')) {
        meta = topDoc.createElement('meta');
        meta.id = 'cdoc-viewport';
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1';
        (topDoc.head || topDoc.documentElement).appendChild(meta);
      } else if (!esAcceso && meta) {
        meta.remove();
      }
      const aplicar = () => {
        if (!esAcceso) { fs.setAttribute('cols', original); return; }
        const ancho = Math.min(window.top.innerWidth, window.top.screen.width || Infinity);
        fs.setAttribute('cols', ancho < 760 ? '*,0' : '420,*');
      };
      aplicar();
      if (esAcceso) window.top.addEventListener('resize', aplicar);
    } catch (e) {
      /* marco de otro origen: nada que hacer */
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
        el('div', {}, [el('b', { text: 'CONECT Docentes' }), el('span', { text: 'ITS Purísima del Rincón' })])
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
@media (prefers-color-scheme:dark){html.cdoc-acceso{--a-p:#3a64aa;--a-p2:#4a75bd;--a-ac:#f0a3b3;--a-f:#0e141d;--a-s:#151d29;--a-b:#2a3546;--a-t:#e5e9f0;--a-ts:#a9b3c2;--a-in:#1a2331;--a-en:#9cbcf0;--a-foco:rgba(156,188,240,.35);--a-av:#f5c06a;--a-sombra:0 12px 32px rgba(0,0,0,.5);color-scheme:dark}}
html.cdoc-acceso,html.cdoc-acceso body{margin:0!important;padding:0!important;min-height:100%;background:var(--a-f)!important}
html.cdoc-acceso body>:not(.cdoc-acc-fondo){display:none!important}
.cdoc-acc-fondo{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;box-sizing:border-box;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--a-t);text-align:left}
.cdoc-acc-fondo *{box-sizing:border-box}
.cdoc-acc-tarjeta{width:100%;max-width:350px;background:var(--a-s);border:1px solid var(--a-b);border-radius:16px;padding:28px 24px 18px;box-shadow:var(--a-sombra)}
.cdoc-acc-marca{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.cdoc-acc-logo{flex:none;width:42px;height:42px;border-radius:12px;background:var(--a-p);color:#fff;display:grid;place-items:center}
.cdoc-acc-marca b{display:block;font-size:16px;line-height:1.2}
.cdoc-acc-marca span{display:block;font-size:12.5px;color:var(--a-ts)}
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
.cdoc-acc-pie{margin:22px 0 0;padding-top:14px;border-top:1px solid var(--a-b);font-size:11.5px;color:var(--a-ts)}
`;

  function inyectarEstilosAcceso() {
    if ($('#cdoc-estilos-acceso')) return;
    const st = el('style', { id: 'cdoc-estilos-acceso' });
    st.textContent = CSS_ACCESO;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------ */
  function iniciar() {
    const acceso = detectarAcceso();
    // En el marco izquierdo: ensanchar durante el acceso, restaurar al llegar al menú
    if (acceso) ajustarMarcos(true);
    else if ($('img[src*="mnu_"]')) ajustarMarcos(false);
    if (acceso) {
      try { moduloAcceso(acceso); } catch (err) { console.error('[CONECT Mod Docentes] Acceso:', err); }
      return;
    }

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
    module.exports = { evaluarValor, calcularFinal, normalizarControl, claveNombre, analizarMatriz, autoMapear, cruzar };
    return;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
