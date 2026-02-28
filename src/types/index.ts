export type PositionDirection = 'long' | 'short'
export type CalculatorMode = 'entry' | 'exit'

export interface Entry {
  id: string
  price: number
  amount: number
  originalIndex: number
}

export interface PartialScenario {
  entryId: string
  entryPrice: number
  avgPrice?: number
  totalQty?: number
  totalAmount?: number
  pnlAtStop?: number
  pnlAtTake?: number
  percentToStop?: number
  percentToTake?: number
  riskReward?: number
}

export interface PositionSummary {
  totalQty: number
  totalAmount: number
  avgPrice: number
  riskUSD: number
  rewardUSD: number
  riskReward: number
}

export interface CalculatorState {
  ticker: string
  direction: PositionDirection
  entries: Entry[]
  stopLoss: number
  takeProfit: number
  presets: number[]
}

export interface ExitPoint {
  id: string
  exitPrice: number
  percent: number
  originalIndex: number
}

export interface ExitScenario {
  exitId: string
  exitPrice: number
  percent: number
  avgExitPrice: number
  volumeUSDT: number
  volumeTicker: number
  percentToTP: number
  pnlAtTP: number
  pnlAtSL: number
  riskReward: number
}

export interface ExitPositionSummary {
  avgExitPrice: number
  totalVolumeTicker: number
  totalVolumeUSDT: number
  riskSL: number
  profitTP: number
  riskReward: number
}
