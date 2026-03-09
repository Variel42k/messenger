import re
import shutil
import sqlite3
from pathlib import Path

CONNECTOR_TYPES = {
    'Association',
    'Dependency',
    'Message',
    'Extend',
    'Generalization',
    'ArchiMateAssociation',
    'ArchiMateRealization',
    'ArchiMateUsedBy',
    'ControlFlow',
    'Transition2',
    'Realization',
}

POINTS_RE = re.compile(r'_points="([^"]*)";')


def parse_points(raw: str):
    points = []
    for part in raw.split(';'):
        part = part.strip()
        if not part or ',' not in part:
            continue
        x, y = part.split(',', 1)
        points.append((int(x), int(y)))
    return points


def orthogonalize(points):
    if len(points) < 2:
        return points

    result = [points[0]]
    for x2, y2 in points[1:]:
        x1, y1 = result[-1]
        if x1 != x2 and y1 != y2:
            # L-shape: horizontal then vertical
            result.append((x2, y1))
        result.append((x2, y2))

    deduped = [result[0]]
    for p in result[1:]:
        if p != deduped[-1]:
            deduped.append(p)
    return deduped


def count_diagonal_segments(points):
    diagonal = 0
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        if x1 != x2 and y1 != y2:
            diagonal += 1
    return diagonal


def main():
    project = Path(r'E:\git\messenger\docs\diagrams\visual-paradigm\messenger.vpp')
    backup = project.with_suffix('.vpp.bak')

    if not project.exists():
        raise FileNotFoundError(project)

    shutil.copyfile(project, backup)

    con = sqlite3.connect(project)
    cur = con.cursor()

    updated = 0
    for row_id, shape_type, blob in cur.execute('SELECT ID, SHAPE_TYPE, DEFINITION FROM DIAGRAM_ELEMENT').fetchall():
        if shape_type not in CONNECTOR_TYPES:
            continue

        try:
            text = blob.decode('utf-8')
        except Exception:
            continue

        m = POINTS_RE.search(text)
        if not m:
            continue

        points = parse_points(m.group(1))
        if len(points) < 2:
            continue

        new_points = orthogonalize(points)
        new_raw = ';'.join(f'{x},{y}' for x, y in new_points) + ';'

        if new_raw == m.group(1):
            continue

        new_text = text[:m.start(1)] + new_raw + text[m.end(1):]
        cur.execute(
            'UPDATE DIAGRAM_ELEMENT SET DEFINITION = ? WHERE ID = ?',
            (new_text.encode('utf-8'), row_id),
        )
        updated += 1

    con.commit()

    total_segments = 0
    diagonal_segments = 0
    for shape_type, blob in cur.execute('SELECT SHAPE_TYPE, DEFINITION FROM DIAGRAM_ELEMENT').fetchall():
        if shape_type not in CONNECTOR_TYPES:
            continue
        text = blob.decode('utf-8', 'ignore')
        m = POINTS_RE.search(text)
        if not m:
            continue
        points = parse_points(m.group(1))
        total_segments += max(0, len(points) - 1)
        diagonal_segments += count_diagonal_segments(points)

    con.close()

    print(f'Updated connector shapes: {updated}')
    print(f'Total segments: {total_segments}')
    print(f'Diagonal segments after normalization: {diagonal_segments}')
    print(f'Backup: {backup}')


if __name__ == '__main__':
    main()
