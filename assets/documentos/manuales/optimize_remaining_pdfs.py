from __future__ import annotations

import shutil
from pathlib import Path

import fitz


LIMIT = 24 * 1024 * 1024
WORK = Path(r"C:\Users\PC\AppData\Local\Temp\ilovepdf_batches\local_final")
WORK.mkdir(parents=True, exist_ok=True)

TARGETS = [
    {
        "name": "Analizador de incubadora",
        "source": Path(r"C:\Users\PC\AppData\Local\Temp\ilovepdf_batches\extremeC\Analizador de incubadora_compressed_compressed_compressed.pdf"),
        "dest": Path(r"C:\Users\PC\Desktop\Github\FAQ-Ingenieria-Biomedica-UNITEC\assets\documentos\manuales\Analizador de incubadora\Analizador de incubadora.pdf"),
    },
    {
        "name": "Manual de analizador de flujo",
        "source": Path(r"C:\Users\PC\AppData\Local\Temp\ilovepdf_batches\extremeC\Manual de analizador de flujo_compressed_compressed_compressed.pdf"),
        "dest": Path(r"C:\Users\PC\Desktop\Github\FAQ-Ingenieria-Biomedica-UNITEC\assets\documentos\manuales\Analizador de ventilación\Manual de analizador de flujo.pdf"),
    },
    {
        "name": "manual de analizador de bomba de infusion",
        "source": Path(r"C:\Users\PC\AppData\Local\Temp\ilovepdf_batches\extremeD\manual de analizador de bomba de infusión_compressed_compressed_compressed.pdf"),
        "dest": Path(r"C:\Users\PC\Desktop\Github\FAQ-Ingenieria-Biomedica-UNITEC\assets\documentos\manuales\Analizador de Bomba de Infusion\manual de analizador de bomba de infusión.pdf"),
    },
]


def mb(size: int) -> str:
    return f"{size / 1024 / 1024:.2f} MB"


def raster_pdf(src: Path, out: Path, *, dpi: int, quality: int, gray: bool) -> tuple[int, int]:
    source = fitz.open(src)
    result = fitz.open()
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)
    colorspace = fitz.csGRAY if gray else fitz.csRGB

    for index, page in enumerate(source, start=1):
        pix = page.get_pixmap(matrix=matrix, colorspace=colorspace, alpha=False)
        image = pix.tobytes("jpeg", jpg_quality=quality)
        new_page = result.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(new_page.rect, stream=image)
        if index == 1 or index == source.page_count or index % 10 == 0:
            print(f"PAGE | {src.name} | {index}/{source.page_count}", flush=True)

    page_count = source.page_count
    result.save(out, garbage=4, deflate=True)
    result.close()
    source.close()

    check = fitz.open(out)
    new_count = check.page_count
    check.close()
    return page_count, new_count


def process_target(target: dict[str, Path | str]) -> None:
    src = Path(target["source"])
    dest = Path(target["dest"])
    name = str(target["name"])
    if not src.exists():
        print(f"MISSING_SOURCE | {name} | {src}", flush=True)
        return

    print(f"START | {name} | {mb(src.stat().st_size)}", flush=True)
    settings = [
        (75, 62, True),
        (70, 60, True),
        (65, 58, True),
        (60, 56, True),
    ]

    best: Path | None = None
    for dpi, quality, gray in settings:
        out = WORK / f"{dest.stem}.dpi{dpi}.q{quality}.gray{int(gray)}.pdf"
        before, after = raster_pdf(src, out, dpi=dpi, quality=quality, gray=gray)
        size = out.stat().st_size
        print(
            f"CANDIDATE | {name} | dpi={dpi} q={quality} gray={gray} | "
            f"{mb(size)} | pages={after}/{before}",
            flush=True,
        )
        if before == after and size <= LIMIT:
            best = out
            break

    if best is None:
        print(f"NO_VALID_CANDIDATE | {name}", flush=True)
        return

    shutil.copyfile(best, dest)
    print(f"REPLACED | {name} | {mb(best.stat().st_size)} | {dest}", flush=True)


def main() -> None:
    for target in TARGETS:
        process_target(target)


if __name__ == "__main__":
    main()
