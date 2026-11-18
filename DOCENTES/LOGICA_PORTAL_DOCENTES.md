# Lógica del portal CONECT Docentes

Obtenida analizando el tráfico del portal (HAR). Los ejemplos usan valores ficticios.
Base: `https://purisima.tecnm.mx/conect_docentes/`. Servidor ASP clásico, páginas en ISO-8859-1,
scripts del cliente en **VBScript** (solo funcionan en Internet Explorer).

## 1. Inicio de sesión (2 pasos) — cookie de sesión ASP

| Paso | Petición | Campos | Respuesta |
|---|---|---|---|
| Usuario | `POST Logi_Us_xyz_79_p2_Val.asp` | `username`, `login` | 302 → `27_p3_Pass_xyz_Logi_Acce.asp?sessionIDUser_ClaveX=…&catidUser_ID=…&catnombreUser_Nombre=…&catclaveUser_Cve=…` |
| Contraseña | `POST p4_Logi_Pass_1379_xyz_Val.asp` | `password` (máx. 15), `valida_pass` | 302 → `redireccionar.asp?pagina=mnucatedraticos.asp&cat_id=…&cat_nombre=…&cat_clave=…&tipo=ca` |

Después, todas las URLs llevan en el query string: `session_id`, `cat_id` (id interno del docente),
`cat_nombre`, `cat_clave` (clave del docente).

## 2. Marcos (frames)

- Superior: menú `mnucatedraticos.asp` (marco izquierdo) + `fracontenido` (marco derecho).
- `cat_home.asp` → datos generales (nombre, clave, estatus, fecha de ingreso, academia).
- Menú *Semestre actual* (`mnucatedraticos.asp?…&tipo=cat&np=1`):
  `cat_contenido.asp?…&page_id=misgpos` (Mis grupos), `page_id=det_materias`, horario, avisos.
- `cat_contenido.asp` solo pone el título y un `<iframe>` con la página real
  (p. ej. `cat_cap_misgrupos.asp`, `cat_cap_parcial.asp`).

## 3. Mis grupos → elegir captura

`cat_cap_misgrupos.asp` tiene un formulario `POST cat_cap_redirect.asp?session_id=…&cat_id=…&cat_nombre=…&cat_clave=…`:

- `BoolModTrad=true` (oculto)
- `materia` (radio) = `'{GpoID}R{MateriaID}C{ClaveGrupo} @{NOMBRE MATERIA}'` — ej. `10R20C1A1A @NOMBRE DE LA MATERIA`
- Un `<select name="{GpoID}R{MateriaID}">` por grupo (solo el del radio elegido va habilitado) con opciones:
  - Captura: `Evaluación #2 - 1er Oportunidad` (el texto de la opción es el valor)
  - Consultas: `Cal. Parcial - # 1..3`, `Cal. Finales`
  - Excel del portal: `XLC1..3` (parcial/1ª oportunidad), `XLR1..3` (regularización)
  - Formatos en blanco: `FLA` (asistencia), `FLI1..3`, `FLR1..3`; `VERMAS` reportes personalizados
- `B1=Mostrar Lista`

Respuesta: 302 → `xyzLogPassCaptCalif123.asp?…&P=2&page_id=capturaparcial`.

## 4. Contraseña de captura

`xyzLogPassCaptCalif123.asp` pide una segunda contraseña:
`POST 123CaptCalifLogPassValidaX.asp` con `passwordCC`, `valida_passCC` →
302 → `cat_posic_nav.asp?…&P=2&R=2&page_id=capturaparcial` → abre
`cat_contenido.asp?…&P=2&page_id=capturaparcial` → iframe `cat_cap_parcial.asp?…&P=2`.

El grupo seleccionado queda guardado **en la sesión del servidor** (la URL de captura no lo lleva,
solo `P`). Por eso la extensión trabaja sobre la página ya abierta y no hace las peticiones por su cuenta.

## 5. Página de captura `cat_cap_parcial.asp`

```html
<form action="cat_guarda_calpar.asp?session_id=…&cat_id=…&cat_nombre=…&cat_clave=…&P=2&GpoID=10" method="post" name="form1">
  … <tr><td>Núm</td><td>[*]No. control</td><td>Nombre</td>
       <td><input name="R1L1001P2I501V35E1" value="85" maxlength="3" onfocusout="Calcula(70 )"></td> …
       <td><input name="R1L1001P2I501V35F" disabled value="85"></td></tr>
```

Nombre de cada caja: `R{fila}L{idInscripción}P{parcial}I{idIndicador}V{peso%}E{númIndicador}`

| Parte | Ejemplo | Significado |
|---|---|---|
| `R` | 1 | Número de renglón (1..n) |
| `L` | 1001 | Id de la inscripción/alumno en el grupo |
| `P` | 2 | Parcial |
| `I` | 501 | Id del indicador/competencia |
| `V` | 35 | Peso del indicador (%) |
| `E` | 1 | Número del indicador (1-PROYECTO, 2-EXAMEN ESCRITO, 4-TRABAJOS, 7-EXPOSICIÓN) |

- La caja `…V{peso}F` (final) está `disabled`: **no se envía**; el servidor recalcula.
- `*` antes del número de control marca a ciertos alumnos (p. ej. repetidores).
- Valores válidos: 0–100, `NC`, `NP` (máx. 3 caracteres).
- La mínima aprobatoria llega como argumento de `Calcula(70 )`.
- Autoguardado VBScript: `setInterval('Guardado()', 1080000)` → envía el formulario a los 18 min.

### Cálculo (subrutina VBScript `Calcula`)

1. Por indicador: `NC`/`NP`/vacío → 0. Si valor < mínima → se trunca (`Fix`). Si no → se redondea (x.5 sube).
2. Final = Σ peso/100 × calificación.
3. Final < mínima → se trunca; si no → se redondea.

Nota: por error de punto flotante del servidor, 14 en todos los indicadores (35/25/30/10) da 13.

## 6. Guardado

`POST cat_guarda_calpar.asp?session_id=…&cat_id=…&cat_nombre=…&cat_clave=…&P=2&GpoID=10`
`Content-Type: application/x-www-form-urlencoded`, cuerpo = todas las cajas habilitadas:

```
R1L1001P2I501V35E1=85&R1L1001P2I502V25E2=85&R1L1001P2I503V30E4=85&R1L1001P2I504V10E7=85&R2L1002P2I501V35E1=90&…
```

Respuesta 200 HTML con "Las calificaciones parciales fueron guardadas correctamente" y enlaces a
`cat_rpt_oficialcalif.asp?…&P=2&GpoID=10&Tipo=P` (formato de impresión) y
`cat_posic_nav.asp?…&page_id=misgpos` (volver a grupos).

## 7. Qué hace la extensión

En cualquier página de `conect_docentes` que tenga cajas con el patrón anterior:

- Agrega el panel **Captura desde Excel**: plantilla descargable (.xlsx con la lista, los indicadores
  y las calificaciones actuales), carga de .xlsx/.xls/.ods/.csv, detección automática de columnas
  (número de control, nombre, cada indicador o una sola columna para todos), vista previa
  antes/después y botones *Aplicar* / *Aplicar y guardar*.
- Cruza por número de control (sin `*` ni espacios) y, como respaldo, por nombre.
- Reemplaza el VBScript roto: recalcula la columna final, valida (0–100, NC, NP), redondea igual que
  el portal, flechas ↑/↓ y Enter para moverse, evita envíos con valores inválidos, avisa si sales sin
  guardar y reproduce el autoguardado de 18 min.
- El envío es el mismo `submit` del formulario original: no se inventan campos ni peticiones.
