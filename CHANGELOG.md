# Changelog

Все значимые изменения в проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
и проект следует [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-02-03

### Fixed
- Fix local build errors (TypeScript unused variable warnings)

### Added
- Add Vercel deployment configuration with SPA routing support

## [0.1.0] - 2026-02-03

### Added
- Первый MVP релиз Risk Calculator
- Поддержка Long и Short позиций
- Множественные точки входа
- Динамический расчет средней цены позиции
- Расчет частичных сценариев для каждого входа
- Расчет Risk/Reward ratio
- Расчет прибыли/убытка при достижении SL/TP
- Расчет процентов движения цены
- Пресеты для быстрого ввода размеров позиций
- Сортировка входов (исходный порядок, по возрастанию, по убыванию)
- Предупреждение о подозрительных значениях R/R
- Адаптивный дизайн для десктопа
- Темная тема интерфейса
- Unit тесты для основной логики
- Документация (README, USAGE, ARCHITECTURE)

### Technical
- Vue 3 с Composition API
- TypeScript для типобезопасности
- Vite для быстрой разработки
- Pinia для управления состоянием
- Tailwind CSS для стилизации
- Vitest для тестирования

[Unreleased]: https://github.com/yourusername/risk-calculator/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yourusername/risk-calculator/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yourusername/risk-calculator/releases/tag/v0.1.0
