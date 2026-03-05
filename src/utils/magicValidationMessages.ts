export const INPUT_VALIDATION_REVIEW_PROMPT = 'Пожалуйста, проверьте введенные данные.'

export const MAGIC_VALIDATION_MESSAGES = {
  entry: {
    long: {
      takeProfitRange: 'Тейк-профит должен быть больше диапазона входа.',
      takeProfitRangePoint: 'Эта цена входа должна быть ниже тейк-профита.',
      stopLossRange: 'Стоп-лосс должен быть меньше диапазона входа.',
      stopLossRangePoint: 'Эта цена входа должна быть выше стоп-лосса.',
    },
    short: {
      takeProfitRange: 'Тейк-профит должен быть меньше диапазона входа.',
      takeProfitRangePoint: 'Эта цена входа должна быть выше тейк-профита.',
      stopLossRange: 'Стоп-лосс должен быть больше диапазона входа.',
      stopLossRangePoint: 'Эта цена входа должна быть ниже стоп-лосса.',
    },
  },
  exit: {
    long: {
      entryPriceRange: 'Цена входа должна быть меньше диапазона выхода.',
      entryPriceRangePoint: 'Эта цена выхода должна быть выше цены входа.',
      stopLossEntryPrice: 'Стоп-лосс должен быть меньше цены входа.',
      stopLossRange: 'Стоп-лосс должен быть меньше диапазона выхода.',
      stopLossRangePoint: 'Эта цена выхода должна быть выше стоп-лосса.',
    },
    short: {
      entryPriceRange: 'Цена входа должна быть больше диапазона выхода.',
      entryPriceRangePoint: 'Эта цена выхода должна быть ниже цены входа.',
      stopLossEntryPrice: 'Стоп-лосс должен быть больше цены входа.',
      stopLossRange: 'Стоп-лосс должен быть больше диапазона выхода.',
      stopLossRangePoint: 'Эта цена выхода должна быть ниже стоп-лосса.',
    },
  },
} as const
