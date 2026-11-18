# CONECT Mod (no oficial)

Extensiones para el portal **CONECT** del Instituto Tecnológico Superior de Purísima del Rincón (TecNM).
Proyecto independiente: no está afiliado ni respaldado por el instituto. Todo se procesa en tu navegador;
no se envían datos a ningún servidor externo.

| Versión | Portal | Qué hace |
|---|---|---|
| [Estudiantes](ESTUDIANTES) | `purisima.tecnm.mx/conect/` | Rediseño moderno y responsivo, modo oscuro, horario visual y resumen académico. |
| [Docentes](DOCENTES) | `purisima.tecnm.mx/conect_docentes/` | Captura de calificaciones parciales **subiendo un Excel**, plantilla descargable y corrección del formulario de captura (que solo funcionaba en Internet Explorer). |

## Instalación

Descarga el paquete desde [Releases](../../releases) o desde la carpeta correspondiente.

**Chrome / Edge / Brave (escritorio)**
1. Descomprime el `.zip` de `ANDROID Y CHROME`.
2. Abre `chrome://extensions`, activa *Modo de desarrollador*.
3. *Cargar descomprimida* → elige la carpeta.

**Android** (Kiwi, Lemur u otro navegador con soporte de extensiones): instala el `.zip` desde el gestor de extensiones del navegador.

**Firefox**: `about:debugging#/runtime/this-firefox` → *Cargar complemento temporal* → elige el `.zip` de `FIREFOX`
(para instalación permanente debe firmarse en addons.mozilla.org).

**Safari (iPhone/iPad/Mac)**: instala la app *Userscripts* y agrega el archivo `.user.js` de `SAFARI`.
También funciona con Tampermonkey o Violentmonkey en cualquier navegador.

## Docentes: captura desde Excel

1. En CONECT entra a *Mis grupos*, elige el grupo y *Evaluación #N*, y escribe la contraseña de captura.
2. Arriba de la lista aparece el panel **Captura desde Excel**.
3. *Descargar plantilla .xlsx* (lista del grupo, indicadores y calificaciones actuales) o usa tu propio Excel
   con una columna de número de control.
4. Sube el archivo, revisa la vista previa (antes → después) y presiona *Aplicar* o *Aplicar y guardar*.

- Cruza alumnos por número de control y, como respaldo, por nombre.
- Detecta columnas por indicador (`Proyecto`, `1 - PROYECTO…`, etc.) o una sola columna para todos.
- Acepta 0–100, `NC` y `NP`; las celdas vacías no modifican nada.
- Redondea igual que el portal (debajo de la mínima trunca, si no redondea).

La lógica del portal está documentada en [DOCENTES/LOGICA_PORTAL_DOCENTES.md](DOCENTES/LOGICA_PORTAL_DOCENTES.md).

### Compilar

```bash
cd DOCENTES
python build.py
```

Genera los paquetes de Chrome, Firefox y Safari a partir de `DOCENTES/src/`.

## Créditos

- [SheetJS Community Edition](https://sheetjs.com) (Apache 2.0) para leer y generar Excel.
- [Bootstrap](https://getbootstrap.com) (MIT) en la versión de estudiantes.
