# Архитектура приложения Risk Calculator

## Обзор

Risk Calculator - это одностраничное Vue 3 приложение для расчета рисков и потенциальной прибыли при торговле. Поддерживает два режима работы:
- **Multiple Entry** — множественные точки входа, один Stop Loss, один Take Profit
- **Multiple Exit** — одна точка входа, один Stop Loss, несколько точек выхода (Take Profit) с распределением объема

## Технологический стек

- **Vue 3** - реактивный фреймворк с Composition API
- **TypeScript** - типизация для безопасности кода
- **Vite** - быстрый сборщик и dev сервер
- **Pinia** - управление состоянием
- **Tailwind CSS** - утилитарный CSS фреймворк
- **VueUse** - коллекция композаблов
- **Zod** - валидация данных
- **Vitest** - unit тестирование

## Структура проекта

```
risk-calculator/
├── src/
│   ├── components/                  # Vue компоненты
│   │   ├── CalculatorView.vue       # Главный view (маршрутизация режимов)
│   │   ├── ModeSwitcher.vue         # Переключатель Entry/Exit режимов
│   │   ├── PositionSettings.vue     # Настройки позиции (mode-aware)
│   │   ├── PositionSummaryCard.vue  # Сводка — режим Entry
│   │   ├── EntriesTable.vue         # Таблица входов — режим Entry
│   │   ├── EntryRow.vue             # Строка входа — режим Entry
│   │   ├── ExitPointsTable.vue      # Таблица выходов — режим Exit
│   │   ├── ExitPointRow.vue         # Строка выхода — режим Exit
│   │   ├── AllocationIndicator.vue  # Круговая диаграмма распределения %
│   │   └── ExitPositionSummary.vue  # Сводка — режим Exit
│   ├── stores/                      # Pinia stores
│   │   ├── calculator.ts            # Store для Entry режима + общий state
│   │   └── exitCalculator.ts        # Store для Exit режима
│   ├── types/                       # TypeScript типы
│   │   └── index.ts                 # Интерфейсы и типы
│   ├── App.vue                      # Корневой компонент
│   ├── main.ts                      # Точка входа
│   └── style.css                    # Глобальные стили
├── public/                          # Статические файлы
├── index.html                       # HTML template
├── vite.config.ts                   # Конфигурация Vite
├── tsconfig.json                    # Конфигурация TypeScript
├── tailwind.config.js               # Конфигурация Tailwind
└── package.json                     # Зависимости проекта
```

## Режимы работы

Приложение поддерживает два режима, переключаемых через `ModeSwitcher`:

| Режим | Store | Компоненты |
|-------|-------|------------|
| Multiple Entry | `calculator.ts` | `EntriesTable`, `EntryRow`, `PositionSummaryCard` |
| Multiple Exit | `exitCalculator.ts` | `ExitPointsTable`, `ExitPointRow`, `AllocationIndicator`, `ExitPositionSummary` |

Общие данные (тикер, направление, стоп-лосс) хранятся в `calculator.ts` и доступны обоим режимам.

## Основные компоненты

### CalculatorView
Главный компонент, объединяющий все части приложения. Условно рендерит Entry или Exit компоненты в зависимости от `store.mode`.

### ModeSwitcher
Анимированный переключатель режимов (segmented control) с информационными подсказками.

### PositionSettings
Компонент для настройки базовых параметров (mode-aware):
- Тикер, Направление, Стоп-лосс — общие для обоих режимов
- Тейк-профит — только Entry режим
- Цена входа, Объем позиции — только Exit режим

### PositionSummaryCard
Отображает сводную информацию по всей позиции (режим Entry):
- Средняя цена, Общий объем, Риск и прибыль в $, Risk/Reward ratio

### EntriesTable / EntryRow
Таблица с точками входа и кнопками сортировки (режим Entry).

### ExitPointsTable / ExitPointRow
Таблица с точками выхода (режим Exit). Каждая строка содержит:
- Цена выхода, % объема, Средняя цена выхода, Объем USDT/ticker
- % до TP, PnL при TP (кумулятивный), PnL при SL, R/R

### AllocationIndicator
SVG-диаграмма (donut chart) показывающая распределение объема по точкам выхода (% распределено / % осталось).

### ExitPositionSummary
Сводная информация по позиции (режим Exit):
- Средняя цена выхода, Общий объем, Риск (SL), Прибыль (TP), R/R

## State Management (Pinia)

### Calculator Store (`stores/calculator.ts`)

Содержит общее состояние и логику режима Multiple Entry.

**Shared State (оба режима):**
- `mode` - текущий режим (`'entry'` | `'exit'`)
- `ticker` - тикер актива
- `direction` - направление позиции (long/short)
- `stopLoss` - цена стоп-лосса

**Entry-mode State:**
- `entries` - массив точек входа
- `takeProfit` - цена тейк-профита
- `presets` - массив пресетов размеров (ключ localStorage: `risk-calculator-presets`)
- `sortOrder` - порядок сортировки таблицы

**Computed:**
- `sortedEntries` - отсортированные входы для отображения
- `executionOrderEntries` - входы в порядке исполнения
- `partialScenarios` - сценарии для каждого входа (только для валидных по цене входов)
- `positionSummary` - сводка по всей позиции (только по валидным входам)
- `isRiskRewardSuspicious` - проверка на подозрительные значения R/R

**Actions:**
- `setMode(mode)` - переключить режим
- `addEntry()` - добавить новый вход
- `removeEntry(id)` - удалить вход
- `updateEntry(id, field, value)` - обновить поле входа
- `applyPreset(entryId, value)` - применить пресет
- `setSortOrder(order)` - изменить сортировку
- `setDirection(direction)` - изменить направление

### Exit Calculator Store (`stores/exitCalculator.ts`)

Содержит состояние и логику режима Multiple Exit. Читает общие данные из Calculator Store.

**State:**
- `entryPrice` - цена входа
- `totalVolume` - объем позиции (USDT)
- `exitPoints` - массив точек выхода (`ExitPoint[]`)
- `sortOrder` - порядок сортировки

**Computed:**
- `sortedExitPoints` - выходы отсортированные для отображения
- `executionOrderExits` - выходы в порядке исполнения (Long: asc, Short: desc)
- `totalAllocatedPercent` - сумма распределенных процентов
- `remainingPercent` - остаток нераспределенного объема
- `isFullyAllocated` / `isOverAllocated` - флаги распределения
- `exitScenarios` - расчетные сценарии для каждого выхода
- `exitPositionSummary` - сводка по позиции

**Actions:**
- `addExitPoint()` - добавить точку выхода
- `removeExitPoint(id)` - удалить точку выхода
- `updateExitPoint(id, field, value)` - обновить поле выхода
- `setSortOrder(order)` - изменить сортировку

## Логика расчетов

### Порядок исполнения входов

**Short позиция:**
Входы исполняются по возрастанию цены (90000 → 91000 → 92000)

**Long позиция:**
Входы исполняются по убыванию цены (90000 → 89000 → 88000)

### Расчет средней цены

```typescript
// Количество для каждого входа
qty_i = amount_i / price_i

// Общее количество
totalQty = Σ qty_i

// Средняя цена (взвешенная по количеству)
avgPrice = Σ(amount_i) / Σ(amount_i / price_i)
```

### Расчет PnL

**Long позиция:**
```typescript
pnl = (exitPrice - avgPrice) * totalQty
```

**Short позиция:**
```typescript
pnl = (avgPrice - exitPrice) * totalQty
```

### Расчет процентов движения

**Long:**
```typescript
toSL% = (avgPrice - stopLoss) / avgPrice * 100
toTP% = (takeProfit - avgPrice) / avgPrice * 100
```

**Short:**
```typescript
toSL% = (stopLoss - avgPrice) / avgPrice * 100
toTP% = (avgPrice - takeProfit) / avgPrice * 100
```

### Расчет Risk/Reward

```typescript
riskUSD = Math.abs(pnlAtStop)
rewardUSD = Math.abs(pnlAtTake)
riskReward = rewardUSD / riskUSD
```

## Частичные сценарии

Для каждого входа рассчитывается сценарий, при котором:
1. Цена дошла до этого входа
2. Цена НЕ дошла до следующих входов
3. Затем цена пошла к тейк-профиту

Это позволяет видеть потенциальную прибыль на каждом этапе набора позиции.

**Валидность входа:** В расчётах участвуют только точки входа, прошедшие валидацию (цена входа между SL и TP для выбранного направления). Для невалидной строки сценарий не считается — в таблице отображаются только «Цена входа» и «Сумма USDT»; сводка по позиции строится только по валидным входам.

## Логика расчетов — режим Multiple Exit

### Порядок исполнения выходов

**Long позиция:** выходы исполняются по возрастанию цены (ближайший TP → дальний TP)
**Short позиция:** выходы исполняются по убыванию цены (ближайший TP → дальний TP)

### Расчет объема выхода

```typescript
volumeUSDT_i = totalVolume × (percent_i / 100)
volumeTicker_i = volumeUSDT_i / exitPrice_i
```

### Расчет PnL при TP (кумулятивный)

**Long:**
```typescript
pnlAtTP_i = Σ(j=0..i) [volumeUSDT_j / exitPrice_j × (exitPrice_j - entryPrice)]
```

**Short:**
```typescript
pnlAtTP_i = Σ(j=0..i) [volumeUSDT_j / exitPrice_j × (entryPrice - exitPrice_j)]
```

### Расчет PnL при SL (после частичного закрытия)

```typescript
remainingVolume = totalVolume - Σ(j=0..i) volumeUSDT_j
pnlAtSL_i = pnlAtTP_i + (remainingVolume / stopLoss) × (stopLoss - entryPrice)  // Long
pnlAtSL_i = pnlAtTP_i + (remainingVolume / stopLoss) × (entryPrice - stopLoss)  // Short
```

### Средняя цена выхода (взвешенная)

```typescript
avgExitPrice = Σ(exitPrice_i × percent_i) / Σ(percent_i)
```

### Распределение объема

Сумма всех `percent_i` должна равняться 100%. Индикатор (`AllocationIndicator`) визуально отображает текущее распределение.

## Валидация

Приложение показывает предупреждение, если:
- R/R > 10 (слишком высокий)
- R/R < 0.2 (слишком низкий)

Это помогает выявить возможные ошибки в вводе данных.

## Возможные будущие улучшения

1. **Персистентность данных**
   - LocalStorage для сохранения позиций
   - Импорт/экспорт сценариев

2. **Дополнительные функции**
   - Учет комиссий
   - Расчет с плечом
   - История сделок

3. **Визуализация**
   - Графики цены
   - Визуализация уровней

4. **API интеграция**
   - Автоподгрузка текущей цены
   - Данные с бирж

5. **Мультипозиционность**
   - Управление несколькими позициями
   - Портфолио риск-менеджмент
