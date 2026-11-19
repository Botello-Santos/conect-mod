# CONECT Mod (no oficial)

Extensiones para el portal **CONECT** del Instituto Tecnológico Superior de Purísima del Rincón (TecNM).
Proyecto independiente: no está afiliado ni respaldado por el instituto. Todo se procesa en tu navegador;
no se envían datos a ningún servidor externo.

| Versión | Portal | Qué hace |
|---|---|---|
| [Estudiantes](ESTUDIANTES) | `purisima.tecnm.mx/conect/` | Rediseño moderno y responsivo, modo oscuro, horario visual y resumen académico. |
| [Docentes](DOCENTES) | `purisima.tecnm.mx/conect_docentes/` | Rediseño completo (barra lateral, inicio, grupos en tarjetas, horario visual, reportes con resumen, modo oscuro, adaptado a celular) y captura de calificaciones **subiendo un Excel** con plantilla básica o mejorada. |

## Instalación

Descarga el paquete desde [Releases](../../releases) o desde la carpeta correspondiente.

**Chrome / Edge / Brave (escritorio)**
1. Descomprime el `.zip` de `ANDROID Y CHROME`.
2. Abre `chrome://extensions`, activa *Modo de desarrollador*.
3. *Cargar descomprimida* → elige la carpeta.

**Android (app)**: descarga `conect-mod-estudiantes.apk` o `conect-mod-docentes.apk` desde [Releases](../../releases)
y ábrelo (Android pedirá permitir instalar apps de origen desconocido). Requiere Android 7.0 o superior.
La app abre el portal e incluye el mismo mod; también permite subir el Excel, guardar la plantilla e imprimir.

**Android (navegador)**: en Kiwi, Lemur u otro navegador con soporte de extensiones, instala el `.zip` desde su gestor de extensiones.

**Firefox**: `about:debugging#/runtime/this-firefox` → *Cargar complemento temporal* → elige el `.zip` de `FIREFOX`
(para instalación permanente debe firmarse en addons.mozilla.org).

**Safari (iPhone/iPad/Mac)**: instala la app *Userscripts* y agrega el archivo `.user.js` de `SAFARI`.
También funciona con Tampermonkey o Violentmonkey en cualquier navegador.

## Docentes: captura desde Excel

1. En CONECT entra a *Mis grupos* y presiona **Capturar** en el grupo; escribe la contraseña de captura.
2. Arriba de la lista aparece el panel **Captura desde Excel** con dos plantillas, ambas con los alumnos del grupo ya llenados:
   - **Básica**: una columna por indicador, con las calificaciones actuales del portal.
   - **Mejorada** (basada en la lista real de un docente): los 3 parciales; cada trabajo por separado
     (T1, T2… con promedio y ponderado por indicador); *Puntos menos*; hoja **Puntos extra** por criterio
     de evaluación, que se suma solo a la calificación final según el peso del criterio (5 pts en un criterio de 30 % = 1.5; "Otro" suma directo; nunca pasa de 100); hojas de *Asistencia* y
     *Segunda oportunidad*. Puedes insertar columnas para más trabajos dentro del bloque del indicador.
3. Sube el archivo, revisa la vista previa (antes → después, y en la mejorada la final del Excel con sus
   extras/menos) y presiona *Aplicar* o *Aplicar y guardar*.

- Cruza alumnos por número de control y, como respaldo, por nombre.
- Acepta 0–100, `NC` y `NP`; las celdas vacías no modifican nada.
- Redondea igual que el portal (debajo de la mínima trunca, si no redondea).
- El portal guarda una calificación por indicador: con la plantilla mejorada, los puntos extra/menos se reparten
  entre los indicadores (ninguno pasa de 100) para que la final del portal coincida con la de tu Excel.

La lógica del portal está documentada en [DOCENTES/LOGICA_PORTAL_DOCENTES.md](DOCENTES/LOGICA_PORTAL_DOCENTES.md).

### Compilar

```bash
cd DOCENTES
python build.py
```

Genera los paquetes de Chrome, Firefox y Safari a partir de `DOCENTES/src/` (`conect-docentes-diseno.js` = rediseño, `conect-docentes.js` = captura desde Excel).

Las apps Android (`android/`, un WebView con dos sabores: `estudiantes` y `docentes`) se compilan en
GitHub Actions ([android.yml](.github/workflows/android.yml)) al publicar un Release, y los APK firmados se
adjuntan automáticamente. Requiere los secretos `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD` y `KEY_ALIAS`.

## Créditos

- [SheetJS Community Edition](https://sheetjs.com) (Apache 2.0) para leer y generar Excel.
- [Bootstrap](https://getbootstrap.com) (MIT) en la versión de estudiantes.
