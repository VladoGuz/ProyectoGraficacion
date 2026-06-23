#!/usr/bin/env python3
"""
limpiar.py — Entry point para limpieza de .dat estructurado → .dat limpio
Arquitectura Hexagonal / Clean Architecture

Elimina comentarios incompatibles con el parser del visor de clase.
Genera un archivo con sufijo _limpio.dat listo para usar.

Uso: python limpiar.py
"""

import sys
from pathlib import Path

# Asegurar que src esté en el path
sys.path.insert(0, str(Path(__file__).parent))

from src.infrastructure.adapters.tkinter_adapter import TkinterFileAdapter, TkinterNotifier
from src.application.use_cases.clean_dat_use_case import CleanDatUseCase


def main():
    # Composición de dependencias (Composition Root)
    file_adapter = TkinterFileAdapter()
    notifier = TkinterNotifier()

    use_case = CleanDatUseCase(
        file_reader=file_adapter,
        file_writer=file_adapter,
        notifier=notifier,
    )

    use_case.execute()
    file_adapter.destroy()


if __name__ == "__main__":
    main()
