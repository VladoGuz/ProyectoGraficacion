#!/usr/bin/env python3
"""
extraer.py — Entry point para extracción de .obj → .dat estructurado
Arquitectura Hexagonal / Clean Architecture

Uso: python extraer.py
"""

import sys
from pathlib import Path

# Asegurar que src esté en el path
sys.path.insert(0, str(Path(__file__).parent))

from src.infrastructure.adapters.tkinter_adapter import TkinterFileAdapter, TkinterNotifier
from src.infrastructure.parsers.obj_parser import ObjParser
from src.infrastructure.parsers.dat_formatter import DatFormatter
from src.application.use_cases.extract_obj_use_case import ExtractObjUseCase


def main():
    # Composición de dependencias (Composition Root)
    file_adapter = TkinterFileAdapter()
    notifier = TkinterNotifier()
    parser = ObjParser()
    formatter = DatFormatter()

    use_case = ExtractObjUseCase(
        file_reader=file_adapter,
        file_writer=file_adapter,
        parser=parser,
        formatter=formatter,
        notifier=notifier,
    )

    use_case.execute()
    file_adapter.destroy()


if __name__ == "__main__":
    main()
