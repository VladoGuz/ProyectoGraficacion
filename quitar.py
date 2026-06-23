#!/usr/bin/env python3
import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path

def seleccionar_archivo_txt() -> Path | None:
    """Abre un cuadro de diálogo y devuelve la ruta del .txt seleccionado."""
    root = tk.Tk()
    root.withdraw()  # Ocultar ventana principal
    ruta = filedialog.askopenfilename(
        title="Selecciona un archivo .txt",
        filetypes=[("Archivos de texto", "*.txt"), ("Todos los archivos", "*.*")]
    )
    root.destroy()
    return Path(ruta) if ruta else None

def limpiar_archivo_txt():
    archivo_entrada = seleccionar_archivo_txt()
    if not archivo_entrada or not archivo_entrada.is_file():
        messagebox.showerror("Error", "No se seleccionó un archivo válido.")
        return

    archivo_salida = archivo_entrada.with_name(
        f"{archivo_entrada.stem}_limpio{archivo_entrada.suffix}"
    )

    try:
        with archivo_entrada.open("r", encoding="utf-8") as f_in, \
             archivo_salida.open("w", encoding="utf-8") as f_out:

            for linea in f_in:
                linea_sin_izq = linea.lstrip()

                # Comentarios SIN “Faces:” -> se descartan
                if linea_sin_izq.startswith("#") and "Faces:" not in linea_sin_izq:
                    continue

                # Líneas vacías -> se descartan
                if linea.strip() == "":
                    continue

                # Líneas con “Faces:” -> se conservan (quitamos el ‘#’ si lo hay)
                if "Faces:" in linea_sin_izq:
                    contenido = linea_sin_izq.lstrip("#").lstrip()
                    f_out.write(contenido.rstrip() + "\n")
                    continue

                # Resto de líneas válidas
                f_out.write(linea.rstrip() + "\n")

        messagebox.showinfo("Éxito", f"Archivo limpio creado:\n{archivo_salida}")

    except Exception as e:
        messagebox.showerror("Error", f"Ocurrió un problema:\n{e}")

if __name__ == "__main__":
    limpiar_archivo_txt()



