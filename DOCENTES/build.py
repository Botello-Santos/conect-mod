"""Genera los paquetes de CONECT Mod Docentes a partir de src/.

    python build.py

Salida (igual que la versión de estudiantes):
    ANDROID Y CHROME/conect-mod-docentes-chrome.zip
    FIREFOX/conect-mod-docentes-firefox.zip
    SAFARI/conect-mod-docentes.user.js
"""
import json
import pathlib
import zipfile

VERSION = "1.0.0"
RAIZ = pathlib.Path(__file__).resolve().parent
SRC = RAIZ / "src"
SHEETJS_VERSION = "0.18.5"

COMUN = {
    "manifest_version": 3,
    "name": "CONECT Mod Docentes (no oficial)",
    "version": VERSION,
    "description": "Captura de calificaciones parciales desde Excel para el portal CONECT de docentes del ITS Purísima del Rincón.",
    "icons": {s: f"iconos/icono-{s}.png" for s in ("16", "32", "48", "128")},
    "content_scripts": [
        {
            "matches": [
                "https://purisima.tecnm.mx/conect_docentes/*",
                "http://purisima.tecnm.mx/conect_docentes/*",
            ],
            "js": ["lib/xlsx.full.min.js", "conect-docentes.js"],
            "run_at": "document_idle",
            "all_frames": True,
        }
    ],
}

FIREFOX_EXTRA = {
    "browser_specific_settings": {
        "gecko": {
            "id": "conect-mod@itspr-docentes",
            "strict_min_version": "128.0",
            "data_collection_permissions": {"required": ["none"]},
        },
        "gecko_android": {"strict_min_version": "128.0"},
    }
}

USERSCRIPT_HEADER = f"""// ==UserScript==
// @name         CONECT Mod Docentes - Captura desde Excel
// @namespace    https://purisima.tecnm.mx/conect_docentes/
// @version      {VERSION}
// @description  Sube un Excel y asigna automáticamente las calificaciones parciales en el portal CONECT de docentes del ITSPR. Todo se procesa localmente.
// @author       Equipo CONECT Mod
// @match        https://purisima.tecnm.mx/conect_docentes/*
// @match        http://purisima.tecnm.mx/conect_docentes/*
// @run-at       document-idle
// @inject-into  page
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/{SHEETJS_VERSION}/xlsx.full.min.js
// ==/UserScript==

"""


def empaquetar(destino: pathlib.Path, manifest: dict) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        z.write(SRC / "conect-docentes.js", "conect-docentes.js")
        z.write(SRC / "lib" / "xlsx.full.min.js", "lib/xlsx.full.min.js")
        for icono in sorted((SRC / "iconos").glob("*.png")):
            z.write(icono, f"iconos/{icono.name}")
    print("OK", destino.relative_to(RAIZ))


def main() -> None:
    empaquetar(RAIZ / "ANDROID Y CHROME" / "conect-mod-docentes-chrome.zip", COMUN)
    empaquetar(RAIZ / "FIREFOX" / "conect-mod-docentes-firefox.zip", {**COMUN, **FIREFOX_EXTRA})

    safari = RAIZ / "SAFARI" / "conect-mod-docentes.user.js"
    safari.parent.mkdir(parents=True, exist_ok=True)
    codigo = (SRC / "conect-docentes.js").read_text(encoding="utf-8")
    safari.write_text(USERSCRIPT_HEADER + codigo, encoding="utf-8")
    print("OK", safari.relative_to(RAIZ))


if __name__ == "__main__":
    main()
