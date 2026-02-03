# Инструкции по установке и запуску

## Установка зависимостей

Откройте терминал (PowerShell, CMD или терминал в Cursor) и выполните:

```bash
cd "c:\Users\plotn\OneDrive\Документы\GITHUB\vibecoding\risk-calculator"
npm install
```

Это установит все необходимые зависимости из `package.json`.

## Запуск приложения

После успешной установки зависимостей, запустите dev сервер:

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

## Сборка для продакшена

Для создания оптимизированной версии приложения:

```bash
npm run build
```

Собранные файлы появятся в папке `dist/`.

## Предпросмотр production сборки

После сборки можно запустить предпросмотр:

```bash
npm run preview
```

## Тестирование

Для запуска тестов:

```bash
npm test
```

## Возможные проблемы

Если у вас возникают проблемы с установкой, попробуйте:

1. Убедитесь, что установлена последняя версия Node.js (рекомендуется 18+)
2. Очистите кэш npm: `npm cache clean --force`
3. Удалите `node_modules` и `package-lock.json`, затем запустите `npm install` снова

## Инициализация Git репозитория

После установки зависимостей, инициализируйте Git:

```bash
git init
git add .
git commit -m "Initial commit: Risk Calculator MVP"
```

## Создание GitHub репозитория

Создайте новый репозиторий на GitHub, затем:

```bash
git remote add origin https://github.com/YOUR_USERNAME/risk-calculator.git
git branch -M main
git push -u origin main
```
