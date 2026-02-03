# Деплой на Vercel

Это руководство поможет вам задеплоить Risk Calculator на Vercel бесплатно.

## Быстрый деплой

### Вариант 1: Через GitHub (рекомендуется)

1. **Подключите репозиторий к Vercel:**
   - Зайдите на [vercel.com](https://vercel.com)
   - Войдите через GitHub
   - Нажмите "Add New Project"
   - Выберите ваш репозиторий `risk-calculator`

2. **Настройки проекта:**
   - Vercel автоматически определит настройки из `vercel.json`
   - Framework: Vite (определится автоматически)
   - Build Command: `npm run build` (уже настроено)
   - Output Directory: `dist` (уже настроено)
   - Install Command: `npm install` (уже настроено)

3. **Нажмите "Deploy"**
   - Vercel автоматически соберет и задеплоит ваше приложение
   - После завершения вы получите URL вида: `https://your-project.vercel.app`

### Вариант 2: Через Vercel CLI

1. **Установите Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Войдите в Vercel:**
   ```bash
   vercel login
   ```

3. **Задеплойте проект:**
   ```bash
   vercel
   ```
   
   При первом деплое следуйте инструкциям:
   - Link to existing project? → `N` (создать новый)
   - Project name → `risk-calculator` (или свой вариант)
   - Directory → `./` (текущая директория)

4. **Для production деплоя:**
   ```bash
   vercel --prod
   ```

## Конфигурация

Файл `vercel.json` уже настроен со следующими параметрами:

- **SPA Routing**: Все маршруты перенаправляются на `index.html` для поддержки Vue Router history mode
- **Кэширование**: Статические ресурсы (CSS, JS) кэшируются на 1 год для оптимизации
- **Build**: Автоматическая сборка через `npm run build`
- **Output**: Результат сборки в директории `dist`

## Поддержка Vue Router History Mode

Конфигурация `vercel.json` включает правило `rewrites`, которое перенаправляет все запросы на `index.html`. Это необходимо для работы Vue Router в history mode, чтобы избежать ошибок 404 при прямом переходе на маршруты.

### Как это работает:

```json
"rewrites": [
  {
    "source": "/(.*)",
    "destination": "/index.html"
  }
]
```

Это означает, что любой URL (например, `/about`, `/calculator`) будет обработан Vue Router, а не возвращать 404.

## Переменные окружения

Если вам нужны переменные окружения:

1. В Vercel Dashboard перейдите в Settings → Environment Variables
2. Добавьте необходимые переменные
3. Они будут доступны в процессе сборки и выполнения

**Важно:** Не добавляйте `.env` файлы в репозиторий! Используйте `.env.example` для документации.

## Обновление деплоя

После каждого push в основную ветку (обычно `main` или `master`), Vercel автоматически создаст новый деплой.

Для ручного обновления:
```bash
vercel --prod
```

## Просмотр логов

В Vercel Dashboard вы можете:
- Просматривать логи сборки и выполнения
- Видеть историю деплоев
- Настраивать домены и SSL сертификаты

## Troubleshooting

### Ошибка 404 на маршрутах
- Убедитесь, что `vercel.json` содержит правильные `rewrites`
- Проверьте, что файл находится в корне проекта

### Проблемы со сборкой
- Проверьте логи сборки в Vercel Dashboard
- Убедитесь, что все зависимости указаны в `package.json`
- Проверьте, что Node.js версия совместима (Vercel использует Node 18+ по умолчанию)

### Статические файлы не загружаются
- Убедитесь, что файлы находятся в директории `public/`
- Проверьте пути в `index.html` (должны начинаться с `/`)

## Дополнительные ресурсы

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Vue Router History Mode](https://router.vuejs.org/guide/essentials/history-mode.html)
