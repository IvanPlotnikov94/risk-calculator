# Архитектура приложения Risk Calculator

## Обзор

Risk Calculator - это одностраничное Vue 3 приложение для расчета рисков и потенциальной прибыли при торговле с множественными точками входа.

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
│   ├── components/           # Vue компоненты
│   │   ├── CalculatorView.vue    # Главный view
│   │   ├── PositionSettings.vue  # Настройки позиции
│   │   ├── PositionSummaryCard.vue # Сводка по позиции
│   │   ├── EntriesTable.vue      # Таблица входов
│   │   └── EntryRow.vue          # Строка входа
│   ├── stores/              # Pinia stores
│   │   └── calculator.ts    # Основной store с логикой расчетов
│   ├── types/               # TypeScript типы
│   │   └── index.ts         # Интерфейсы и типы
│   ├── App.vue              # Корневой компонент
│   ├── main.ts              # Точка входа
│   └── style.css            # Глобальные стили
├── public/                  # Статические файлы
├── index.html               # HTML template
├── vite.config.ts           # Конфигурация Vite
├── tsconfig.json            # Конфигурация TypeScript
├── tailwind.config.js       # Конфигурация Tailwind
└── package.json             # Зависимости проекта
```

## Основные компоненты

### CalculatorView
Главный компонент, объединяющий все части приложения.

### PositionSettings
Компонент для настройки базовых параметров:
- Тикер
- Направление (Long/Short)
- Стоп-лосс
- Тейк-профит

### PositionSummaryCard
Отображает сводную информацию по всей позиции:
- Средняя цена
- Общий объем
- Риск и прибыль в $
- Risk/Reward ratio

### EntriesTable
Таблица с точками входа и кнопками сортировки.

### EntryRow
Строка таблицы для одной точки входа с:
- Полями ввода цены и суммы
- Кнопками пресетов
- Рассчитанными метриками

## State Management (Pinia)

### Calculator Store (`stores/calculator.ts`)

**State:**
- `ticker` - тикер актива
- `direction` - направление позиции (long/short)
- `entries` - массив точек входа
- `stopLoss` - цена стоп-лосса
- `takeProfit` - цена тейк-профита
- `presets` - массив пресетов размеров
- `sortOrder` - порядок сортировки таблицы

**Computed:**
- `sortedEntries` - отсортированные входы для отображения
- `executionOrderEntries` - входы в порядке исполнения
- `partialScenarios` - сценарии для каждого входа
- `positionSummary` - сводка по всей позиции
- `isRiskRewardSuspicious` - проверка на подозрительные значения R/R

**Actions:**
- `addEntry()` - добавить новый вход
- `removeEntry(id)` - удалить вход
- `updateEntry(id, field, value)` - обновить поле входа
- `applyPreset(entryId, value)` - применить пресет
- `setSortOrder(order)` - изменить сортировку
- `setDirection(direction)` - изменить направление

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
