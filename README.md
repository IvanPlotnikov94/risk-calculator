# Risk Calculator 📊

Современное веб-приложение для расчета рисков и потенциальной прибыли при торговле с множественными точками входа. Идеально подходит для планирования усредненных позиций в крипто- и традиционной торговле.

<div align="center">

![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vue](https://img.shields.io/badge/Vue-3.4-42b883.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178c6.svg)

</div>

---

## ✨ Возможности

### 🎯 Основные функции
- ✅ **Поддержка Long и Short позиций** - торгуйте в любом направлении
- ✅ **Множественные точки входа** - планируйте усреднение позиции
- ✅ **Динамический расчет** - все обновляется в реальном времени
- ✅ **Частичные сценарии** - видите результат для каждого этапа набора позиции
- ✅ **Risk/Reward анализ** - оценивайте соотношение риска к прибыли
- ✅ **Пресеты размеров** - быстрый ввод стандартных сумм
- ✅ **Гибкая сортировка** - упорядочивайте входы как удобно

### 📊 Рассчитываемые метрики
- Средняя цена позиции (взвешенная)
- Общий объем и сумма инвестиций
- Прибыль/убыток в $ при достижении SL/TP
- Процент движения цены до SL и TP
- Risk/Reward ratio с предупреждениями
- Индивидуальные метрики для каждого входа

### 💡 UX функции
- Красивый темный дизайн интерфейса
- Адаптивная таблица с прокруткой
- Цветовая индикация риска/прибыли
- Предупреждения о подозрительных R/R
- Настраиваемые пресеты

## 🚀 Быстрый старт

### Требования
- Node.js 18+ и npm

### Установка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/yourusername/risk-calculator.git
cd risk-calculator
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Запустите dev сервер:**
```bash
npm run dev
```

4. **Откройте в браузере:**
```
http://localhost:5173
```

### Другие команды

```bash
# Сборка для продакшена
npm run build

# Предпросмотр production сборки
npm run preview

# Запуск тестов
npm test
```

## 📖 Документация

- **[SETUP.md](SETUP.md)** - подробные инструкции по установке
- **[USAGE.md](USAGE.md)** - руководство пользователя с примерами
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - архитектура и структура проекта
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - как внести вклад в проект
- **[VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)** - инструкции по деплою на Vercel

## 🚀 Деплой

Приложение готово к деплою на Vercel. Конфигурация уже настроена в `vercel.json` с поддержкой SPA роутинга (Vue Router history mode).

**Быстрый деплой:**
1. Подключите репозиторий к [Vercel](https://vercel.com)
2. Vercel автоматически определит настройки
3. Нажмите "Deploy"

Подробные инструкции: **[VERCEL_DEPLOY.md](VERCEL_DEPLOY.md)**

## 🛠️ Технологический стек

### Core
- **[Vue 3](https://vuejs.org/)** - прогрессивный JavaScript фреймворк
- **[TypeScript](https://www.typescriptlang.org/)** - типизированный JavaScript
- **[Vite](https://vitejs.dev/)** - молниеносный сборщик

### State & Routing
- **[Pinia](https://pinia.vuejs.org/)** - интуитивное управление состоянием
- **[VueUse](https://vueuse.org/)** - коллекция утилит

### Styling
- **[Tailwind CSS](https://tailwindcss.com/)** - utility-first CSS
- **[Radix Vue](https://www.radix-vue.com/)** - unstyled компоненты

### Quality
- **[Vitest](https://vitest.dev/)** - быстрое unit-тестирование
- **[Zod](https://zod.dev/)** - валидация схем

## 📐 Как это работает

### Логика исполнения входов

**Short позиция:**
```
Входы исполняются по ВОЗРАСТАНИЮ цены
90000 → 91000 → 92000 → ...
```

**Long позиция:**
```
Входы исполняются по УБЫВАНИЮ цены
90000 → 89000 → 88000 → ...
```

### Математика расчетов

**Средняя цена позиции:**
```typescript
// Для каждого входа вычисляем количество актива
quantity_i = amount_i / price_i

// Средняя цена = взвешенная по количеству
avgPrice = Σ(amount_i) / Σ(quantity_i)
```

**Прибыль/убыток:**
```typescript
// Long позиция
PnL = (exitPrice - avgPrice) × totalQuantity

// Short позиция
PnL = (avgPrice - exitPrice) × totalQuantity
```

**Risk/Reward:**
```typescript
riskUSD = |PnL при StopLoss|
rewardUSD = |PnL при TakeProfit|
R/R = rewardUSD / riskUSD
```

## 💡 Примеры использования

### Пример 1: Short на BTC

```
Тикер: BTC
Направление: Short
Стоп-лосс: 93000
Тейк-профит: 85000

Входы:
1. 90000 USDT: 100
2. 91000 USDT: 100
3. 92000 USDT: 200

Результат при всех входах:
- Средняя цена: ~91250
- Риск: -$7.66
- Прибыль: $27.47
- R/R: 3.59
```

### Пример 2: Long на ETH

```
Тикер: ETH
Направление: Long
Стоп-лосс: 2800
Тейк-профит: 3500

Входы:
1. 3000 USDT: 200
2. 2950 USDT: 200  
3. 2900 USDT: 400

Результат при всех входах:
- Средняя цена: ~2933
- Риск: -$36.40
- Прибыль: $155.02
- R/R: 4.26
```

## 🧪 Тестирование

Проект включает comprehensive unit-тесты:

```bash
# Запуск тестов
npm test

# Тесты с покрытием
npm test -- --coverage

# Watch mode для разработки
npm test -- --watch
```

## 🤝 Contributing

Мы приветствуем вклад сообщества! Смотрите [CONTRIBUTING.md](CONTRIBUTING.md) для деталей.

### Quick start для разработки:

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменений (`git commit -m 'feat: add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 License

Этот проект распространяется под лицензией MIT. См. [LICENSE](LICENSE) для деталей.

## 🙏 Благодарности

- Вдохновлено инструментами TradingView
- Создано для сообщества трейдеров
- Powered by Vue.js и современный веб-стек

---

<div align="center">

**[Документация](USAGE.md)** • **[Примеры](USAGE.md#примеры-использования)** • **[Архитектура](ARCHITECTURE.md)** • **[Changelog](CHANGELOG.md)**

Сделано с ❤️ для трейдеров

</div>
