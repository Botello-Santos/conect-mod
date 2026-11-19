# Textos para las tiendas

Política de privacidad (ambas extensiones): https://botello-santos.github.io/conect-mod/privacidad.html
Sitio / soporte: https://github.com/Botello-Santos/conect-mod

---

## CONECT Mod Docentes (no oficial)

**Categoría:** Educación (Chrome) · Productividad / Educación (Firefox)
**Idioma:** Español (Latinoamérica)

**Resumen (máx. 132 caracteres):**
Captura calificaciones subiendo un Excel y usa un portal CONECT docente rediseñado, con modo oscuro. ITS Purísima del Rincón.

**Descripción:**
Extensión NO oficial para el portal CONECT de docentes del Instituto Tecnológico Superior de Purísima del Rincón (purisima.tecnm.mx/conect_docentes).

CAPTURA DE CALIFICACIONES DESDE EXCEL
• Descarga una plantilla con la lista del grupo ya llenada: básica (una columna por indicador) o mejorada (los 3 parciales, cada trabajo por separado, puntos menos, puntos extra por criterio con tope de 100, asistencia y segunda oportunidad).
• Sube tu archivo (.xlsx, .xls, .ods o .csv): los alumnos se identifican por número de control y las calificaciones se asignan solas.
• Vista previa antes/después, validación (0–100, NC, NP) y el mismo redondeo que el portal. Nada se guarda hasta que presionas Guardar.

PORTAL REDISEÑADO
• Pantallas de acceso modernas, barra lateral con todas las secciones y diseño adaptado a celular.
• Mis grupos en tarjetas con botón "Capturar", horario semanal visual, detalle de materias, reportes de calificaciones con resumen (aprobados, reprobados, promedio).
• Modo claro u oscuro (Alt + T).
• Corrige la página de captura, que dependía de VBScript (solo Internet Explorer): recalcula la calificación final, navega con flechas y evita envíos con valores inválidos.

PRIVACIDAD
Todo se procesa en tu navegador. No se recopilan ni envían datos a ningún servidor; lo que guardas va directo al portal del instituto, como siempre.

Proyecto independiente, no afiliado al ITS de Purísima del Rincón ni al TecNM. Código abierto: https://github.com/Botello-Santos/conect-mod

**Propósito único (Chrome):**
Mejorar el portal CONECT de docentes del ITS Purísima del Rincón: rediseñar sus páginas y permitir asignar calificaciones a partir de un archivo Excel.

**Justificación de permisos de host (content scripts en purisima.tecnm.mx/conect_docentes/*):**
La extensión solo modifica las páginas del portal CONECT de docentes para rediseñarlas y llenar el formulario de captura de calificaciones con los datos del archivo que el docente elige. No funciona en ningún otro sitio.

**¿Usa código remoto?** No. Todas las librerías (SheetJS) vienen incluidas en el paquete.

**Uso de datos:** No recopila ningún tipo de dato del usuario.

**Notas para revisores (Firefox):**
lib/xlsx.full.min.js es SheetJS Community Edition 0.18.5 sin modificar (https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js). El resto del código no está minificado ni transpilado (conect-docentes-diseno.js y conect-docentes.js). El portal requiere una cuenta institucional, así que no se puede probar sin credenciales; las capturas usan datos ficticios.

---

## CONECT Mod (no oficial) — estudiantes

**Categoría:** Educación
**Resumen:** Rediseño del portal CONECT de estudiantes del ITS Purísima del Rincón: modo oscuro, horario visual y resumen académico.

**Descripción:**
Extensión NO oficial para el portal CONECT de estudiantes del Instituto Tecnológico Superior de Purísima del Rincón (purisima.tecnm.mx/conect).

• Diseño moderno y adaptado a celular, con modo claro u oscuro.
• Horario visual, kárdex y calificaciones parciales y finales más fáciles de leer, con resumen académico.
• Todo se procesa en tu navegador: no se recopilan ni envían datos.

Proyecto independiente, no afiliado al ITS de Purísima del Rincón ni al TecNM. Código abierto: https://github.com/Botello-Santos/conect-mod

**Propósito único:** Rediseñar el portal CONECT de estudiantes del ITS Purísima del Rincón para que sea más claro y fácil de usar.
**Permisos de host:** Solo se ejecuta en purisima.tecnm.mx/conect/* para cambiar el diseño de sus páginas.
**¿Usa código remoto?** No ejecuta código remoto; carga hojas de estilo y fuentes públicas (Bootstrap, Bootstrap Icons, Google Fonts) desde CDN.
**Uso de datos:** No recopila datos.
