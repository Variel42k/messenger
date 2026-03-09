import re
import struct
import sqlite3
import gzip
from pathlib import Path

VPP = Path(r'E:\git\messenger\docs\diagrams\visual-paradigm\messenger.vpp')
OUT = Path(r'E:\git\messenger\docs\diagrams\visual-paradigm\exports\from-vp-preview')
OUT.mkdir(parents=True, exist_ok=True)

TARGETS = {
    'ArchiMate_Lab2_Template': 'archimate-overview.png',
    'UseCaseDiagram': 'use-case.png',
    'SequenceDiagram': 'sequence.png',
    'BlockDefinitionDiagram': 'sysml-bdd.png',
    'messenger': 'component.png',
    'ER_Diagram_Messenger_Draft': 'er-diagram.png',
    'Class_Lab2_Template': 'class-diagram.png',
}

PNG_SIG = b'\x89PNG\r\n\x1a\n'


def extract_png_blob(data: bytes) -> bytes | None:
    # preview blobs are usually gzip-wrapped payloads containing png bytes
    candidates = [data]
    if len(data) >= 2 and data[:2] == b'\x1f\x8b':
        try:
            candidates.insert(0, gzip.decompress(data))
        except Exception:
            pass

    for c in candidates:
        idx = c.find(PNG_SIG)
        if idx == -1:
            continue
        blob = c[idx:]

        # trim strictly to PNG IEND
        try:
            pos = 8
            while pos + 8 <= len(blob):
                length = struct.unpack('>I', blob[pos:pos+4])[0]
                ctype = blob[pos+4:pos+8]
                pos += 8 + length + 4
                if ctype == b'IEND':
                    return blob[:pos]
        except Exception:
            pass
        return blob
    return None


con = sqlite3.connect(VPP)
cur = con.cursor()

for dname, out_name in TARGETS.items():
    drow = cur.execute('SELECT DEFINITION FROM DIAGRAM WHERE NAME=?', (dname,)).fetchone()
    if not drow:
        print('missing_diagram', dname)
        continue
    text = drow[0].decode('utf-8', 'ignore')
    m = re.search(r'diagramPreviewData_id="([^"]+)"', text)
    if not m:
        print('missing_preview_id', dname)
        continue
    pid = m.group(1)

    prow = cur.execute('SELECT CONTENT FROM PROJECT_FILE WHERE PATH=?', (f'diagramPreviewData/{pid}',)).fetchone()
    if not prow or prow[0] is None:
        print('missing_preview_blob', dname, pid)
        continue

    blob = bytes(prow[0])
    png = extract_png_blob(blob)
    if not png:
        print('no_png_found', dname, pid)
        continue

    out_path = OUT / out_name
    out_path.write_bytes(png)
    print('written', dname, '->', out_path, 'bytes', len(png))

con.close()
