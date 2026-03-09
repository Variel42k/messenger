# Visual Paradigm Diagrams

Папка содержит артефакты диаграмм для пояснительной записки по проекту `E:\git\messenger`.

## Состав

- `messenger.vpp` — проект Visual Paradigm с диаграммами, по которым выполнен экспорт.
- `exports/*.png` — актуальные изображения для вставки в записку.
- `exports-orthogonal/*.png` — промежуточные выгрузки после правки маршрутов связей.

## Статус по обязательным диаграммам раздела 3

- `3.1 Архитектура на ArchiMate`: `exports/archimate-overview.png` (есть, требует ручной проверки в VP).
- `3.2.1 Use Case`: `exports/use-case.png` (обновлено из `messenger.vpp`, связи ортогонализированы).
- `3.2.3 Sequence`: `exports/sequence.png` (обновлено из `messenger.vpp`, связи ортогонализированы).
- `3.2.5 SysML BDD`: `exports/sysml-bdd.png` (обновлено из `messenger.vpp`, связи ортогонализированы).
- `3.3.3 Class Diagram`: `exports/class-diagram.png` (есть, требует ручной проверки в VP).
- `3.3.4 Component Diagram`: `exports/component.png` (обновлено из `messenger.vpp`, связи ортогонализированы).
- `3.4.6 ER Diagram`: `exports/er-diagram.png` (обновлено из `messenger.vpp`, диаграмма `ER_Diagram_Messenger_Draft`).

## Импорт из учебных работ

В `messenger.vpp` добавлены шаблоны из `sources/from-study/lab2.vpp`:

- `ArchiMate_Lab2_Template`
- `ER_Diagram_Messenger_Draft`
- `Class_Lab2_Template`

## Важно про линии под 90°

Для диаграмм, которые выгружены из `messenger.vpp`, маршруты связей в базе проекта приведены к ломаным сегментам без диагональных участков.

## Ограничение экспорта ArchiMate

В Visual Paradigm CE экспорт ArchiMate через `scripts/ExportDiagramImage.bat` может не создавать выходной PNG. В этом случае нужно открыть `messenger.vpp` в GUI и выполнить экспорт вручную.
