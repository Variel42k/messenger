import re
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

DST = Path(r'E:\git\messenger\docs\diagrams\visual-paradigm\messenger.vpp')
SRC = Path(r'E:\git\messenger\docs\diagrams\visual-paradigm\sources\from-study\lab2.vpp')

if not DST.exists() or not SRC.exists():
    raise FileNotFoundError('Missing source or destination VPP file')

backup = DST.with_name(f"messenger.vpp.bak_study_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
shutil.copyfile(DST, backup)

src = sqlite3.connect(SRC)
s_cur = src.cursor()
dst = sqlite3.connect(DST)
d_cur = dst.cursor()

# Copy full model set from source once; IDs do not collide with destination IDs.
model_rows = s_cur.execute('SELECT * FROM MODEL_ELEMENT').fetchall()
d_cur.executemany('INSERT OR IGNORE INTO MODEL_ELEMENT VALUES (?,?,?,?,?,?,?,?,?,?,?)', model_rows)

# Diagram copy plan: source name -> destination name
plan = [
    ('Course Management System - ArchiMate Diagram', 'ArchiMate_Lab2_Template'),
    ('University Course Management System Class Diagram', 'ER_Diagram_Messenger_Draft'),
    ('Key Abstractions', 'Class_Lab2_Template'),
]

copied = []
for source_name, target_name in plan:
    if d_cur.execute('SELECT 1 FROM DIAGRAM WHERE NAME=?', (target_name,)).fetchone():
        copied.append((source_name, target_name, 'exists'))
        continue

    row = s_cur.execute('SELECT ID, DIAGRAM_TYPE, PARENT_MODEL_ID, NAME, DEFINITION FROM DIAGRAM WHERE NAME=?', (source_name,)).fetchone()
    if not row:
        copied.append((source_name, target_name, 'missing_source'))
        continue

    did, dtype, parent_id, _old_name, definition = row
    d_cur.execute('INSERT OR IGNORE INTO DIAGRAM VALUES (?,?,?,?,?)', (did, dtype, parent_id, target_name, definition))

    # Copy all shapes for the diagram.
    shape_rows = s_cur.execute(
        'SELECT ID, SHAPE_TYPE, DIAGRAM_ID, MODEL_ELEMENT_ID, COMPOSITE_MODEL_ELEMENT_ADDRESS, REF_MODEL_ELEMENT_ADDRESS, PARENT_ID, DEFINITION '
        'FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=?',
        (did,),
    ).fetchall()
    d_cur.executemany('INSERT OR IGNORE INTO DIAGRAM_ELEMENT VALUES (?,?,?,?,?,?,?,?)', shape_rows)

    # Enforce target diagram name in case ID already existed.
    d_cur.execute('UPDATE DIAGRAM SET NAME=? WHERE ID=?', (target_name, did))
    copied.append((source_name, target_name, f'copied:{len(shape_rows)}shapes'))

# Tune ER draft diagram with messenger-oriented table names.
er_id_row = d_cur.execute('SELECT ID FROM DIAGRAM WHERE NAME=?', ('ER_Diagram_Messenger_Draft',)).fetchone()
if er_id_row:
    er_id = er_id_row[0]

    rename_map = {
        'User': 'users',
        'Course': 'chats',
        'CourseOffering': 'messages',
        'Student': 'chat_members',
        'Professor': 'files',
        'Schedule': 'refresh_tokens',
        'DayOfWeek': 'message_status',
        'UserType': 'chat_role',
    }

    attr_map = {
        'User': [('login', 'id'), ('passwordHash', 'username'), ('type', 'email')],
        'Course': [('code', 'id'), ('description', 'name'), ('duration', 'type')],
        'CourseOffering': [('number', 'id'), ('day', 'chat_id'), ('pair', 'sender_id'), ('semester', 'content')],
        'Student': [('id', 'id'), ('name', 'chat_id'), ('phone', 'user_id'), ('address', 'role')],
        'Professor': [('name', 'id'), ('phones', 'original_name'), ('academicDegree', 'content_type')],
        'Schedule': [('semester', 'token')],
    }

    literal_map = {
        'DayOfWeek': [('SU', 'SENT'), ('MO', 'DELIVERED'), ('TU', 'READ'), ('WE', 'FAILED'), ('TH', 'PENDING'), ('FR', 'QUEUED'), ('SA', 'SYSTEM')],
        'UserType': [('STUDENT', 'OWNER'), ('PROFESSOR', 'MEMBER'), ('REGISTRATOR', 'GUEST')],
    }

    class_shapes = d_cur.execute(
        "SELECT ID, MODEL_ELEMENT_ID, DEFINITION FROM DIAGRAM_ELEMENT WHERE DIAGRAM_ID=? AND SHAPE_TYPE='Class'",
        (er_id,),
    ).fetchall()

    for shape_id, model_id, shape_blob in class_shapes:
        if not model_id:
            continue
        mrow = d_cur.execute('SELECT NAME, DEFINITION FROM MODEL_ELEMENT WHERE ID=?', (model_id,)).fetchone()
        if not mrow:
            continue
        old_name, model_blob = mrow
        model_text = model_blob.decode('utf-8', 'ignore')
        shape_text = shape_blob.decode('utf-8', 'ignore')

        # Widen class boxes to avoid truncation with long table names.
        shape_text = re.sub(r'\bwidth=\d+;', 'width=180;', shape_text)
        d_cur.execute('UPDATE DIAGRAM_ELEMENT SET DEFINITION=? WHERE ID=?', (shape_text.encode('utf-8'), shape_id))

        if old_name in rename_map:
            new_name = rename_map[old_name]
            model_text = re.sub(r':"[^"]+":Class\s*\{', f':"{new_name}":Class {{', model_text, count=1)
            d_cur.execute(
                'UPDATE MODEL_ELEMENT SET NAME=?, DEFINITION=? WHERE ID=?',
                (new_name, model_text.encode('utf-8'), model_id),
            )

            # Re-read model text after rename for downstream replacements.
            model_text = d_cur.execute('SELECT DEFINITION FROM MODEL_ELEMENT WHERE ID=?', (model_id,)).fetchone()[0].decode('utf-8', 'ignore')

            for old_attr, new_attr in attr_map.get(old_name, []):
                model_text = re.sub(
                    rf':"{re.escape(old_attr)}":Attribute\s*\{{',
                    f':"{new_attr}":Attribute {{',
                    model_text,
                )

            for old_lit, new_lit in literal_map.get(old_name, []):
                model_text = re.sub(
                    rf':"{re.escape(old_lit)}":EnumerationLiteral\s*\{{',
                    f':"{new_lit}":EnumerationLiteral {{',
                    model_text,
                )

            d_cur.execute('UPDATE MODEL_ELEMENT SET DEFINITION=? WHERE ID=?', (model_text.encode('utf-8'), model_id))

dst.commit()
src.close()
dst.close()

print('backup', backup)
for row in copied:
    print('copy', row)
