# Subir CONECT Mod Docentes a Chrome Web Store (paso a paso)

Chrome no permite que ninguna extensión automatice Chrome Web Store, así que este envío se hace a mano.
Todo lo que hay que escribir está abajo, listo para copiar.

Panel: https://chrome.google.com/webstore/devconsole

## 1. Subir el paquete
1. **+ Nuevo elemento** → elige el archivo:
   `DOCENTES\ANDROID Y CHROME\conect-mod-docentes-chrome.zip`

## 2. Pestaña "Ficha de Play Store" (Store listing)
- **Descripción:** copia la de `TIENDAS\FICHAS.md` → sección *CONECT Mod Docentes* → **Descripción**.
- **Categoría:** Educación
- **Idioma:** Español (Latinoamérica)
- **Ícono de la tienda (128×128):** `DOCENTES\src\iconos\icono-128.png`
- **Capturas de pantalla (1280×800):** de `TIENDAS\docentes\` sube, en este orden:
  `5-plantillas.png`, `4-captura-excel.png`, `2-grupos-oscuro.png`, `3-horario.png`, `1-inicio.png`
  (máximo 5).
- **Mosaico promocional pequeño (440×280):** `TIENDAS\docentes\promo-440x280.png`
- **URL de la página principal:** https://github.com/Botello-Santos/conect-mod
- **URL de asistencia:** https://github.com/Botello-Santos/conect-mod/issues

## 3. Pestaña "Prácticas de privacidad"
- **Propósito único:**
  Mejorar el portal CONECT de docentes del ITS Purísima del Rincón: rediseñar sus páginas y permitir asignar calificaciones a partir de un archivo Excel.
- **Justificación de permisos de host** (aparece por los content scripts en `purisima.tecnm.mx/conect_docentes/*`):
  La extensión solo modifica las páginas del portal CONECT de docentes para rediseñarlas y llenar el formulario de captura de calificaciones con los datos del archivo que el docente elige. No funciona en ningún otro sitio.
- **¿Usas código remoto?** No, no uso código remoto.
- **Uso de datos:** no marques ninguna casilla (no se recopila nada) y marca las tres certificaciones
  (no vendo datos, no los uso para fines ajenos, no los uso para créditos).
- **URL de la política de privacidad:**
  https://github.com/Botello-Santos/conect-mod/blob/main/PRIVACIDAD.md

## 4. Pestaña "Distribución"
- **Visibilidad:** Público
- **Regiones:** Todas (o solo México, si prefieres)

## 5. Enviar
**Enviar para revisión.** La revisión suele tardar de unos días a un par de semanas; Google avisa por correo.

---

### ¿Y la versión de estudiantes?
Si no está en Chrome Web Store, el proceso es igual con
`ESTUDIANTES\ANDROID Y CHROME\conect-mod-extension (6).zip` y los textos de la sección
*CONECT Mod — estudiantes* de `FICHAS.md`. Ahí, en "¿Usas código remoto?", responde **No** (solo carga
hojas de estilo y fuentes de CDN, no código). Para sus capturas no tengo páginas del portal de estudiantes:
tómalas desde tu navegador con la extensión activa (1280×800) cuidando que no se vean datos personales.
