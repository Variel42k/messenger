# Checklist: Диаграммы для ПЗ (Visual Paradigm)

Дата проверки: 2026-03-09

## Требуемый набор

- [x] Диаграмма вариантов использования (Use Case Diagram)
- [x] Диаграмма последовательности (Sequence Diagram)
- [x] Диаграмма блоков (SysML BDD)
- [x] Диаграмма компонентов (Component Diagram)
- [ ] Архитектура на языке ArchiMate
- [ ] Диаграмма классов (Class Diagram)
- [x] ER-диаграмма базы данных (черновой вариант в VP)

## Что уже сделано

- Создан проект VP: `messenger.vpp`.
- Для связей в `messenger.vpp` выполнена ортогонализация маршрутов (ломаные линии 90°).
- Обновлены выгрузки в `exports`:
  - `use-case.png`
  - `sequence.png`
  - `sysml-bdd.png`
  - `component.png`
  - `er-diagram.png` (из диаграммы `ER_Diagram_Messenger_Draft` в VP)
- Добавлены диаграммы из учебного `lab2.vpp`:
  - `ArchiMate_Lab2_Template`
  - `ER_Diagram_Messenger_Draft`
  - `Class_Lab2_Template`

## Что нужно дорисовать в VP

- `ArchiMate` (`archimate-overview.png` как референс).
- `Class Diagram` (`class-diagram.png` как референс).
- `ER_Diagram_Messenger_Draft` желательно доработать вручную (подписи связей и состав таблиц).

## Ограничение CLI Visual Paradigm CE

Экспорт ArchiMate-диаграмм через `ExportDiagramImage.bat` в CE не создает PNG-файл (команда отрабатывает без ошибки, но файл не появляется). Для ArchiMate нужен ручной экспорт из GUI Visual Paradigm.

## Параметр для линий 90° в Visual Paradigm

Для каждого коннектора в нужной диаграмме:

1. Выделить связь.
2. ПКМ → `Presentation Options` → `Connector Style`.
3. Выбрать ортогональный стиль (`Rectilinear` / `Orthogonal`).
4. При необходимости включить авто-маршрутизацию (`Reset/Auto Route`) и поправить узлы перегиба.
