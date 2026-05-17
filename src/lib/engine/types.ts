export type PieceColor = "white" | "black"
export type DifficultyLevel = "easy" | "medium" | "hard"
export type GameStatus = "playing" | "won" | "drawn"
export type GameEndReason =
  | "no-pieces"
  | "no-moves"
  | "threefold-repetition"
  | "25-king-moves"
  | "three-kings-versus-one-king"
  | null
export type GameResult = PieceColor | "draw" | null

export interface Piece {
  readonly color: PieceColor
  readonly king: boolean
}

export type Board = ReadonlyArray<Piece | null>

export interface Move {
  readonly from: number
  readonly to: number
  readonly path: readonly number[]
  readonly captures: readonly number[]
  readonly notation: string
  readonly endsAsKing: boolean
}

export interface GameState {
  readonly board: Board
  readonly sideToMove: PieceColor
  readonly moveHistory: readonly string[]
  readonly positionHashes: readonly string[]
  readonly kingQuietMoveCount: number
  readonly threeKingsVsOneKingCount: number
  readonly status: GameStatus
  readonly result: GameResult
  readonly endReason: GameEndReason
}

export interface CreateGameStateOptions {
  readonly sideToMove?: PieceColor
  readonly whiteMen?: readonly string[]
  readonly whiteKings?: readonly string[]
  readonly blackMen?: readonly string[]
  readonly blackKings?: readonly string[]
  readonly moveHistory?: readonly string[]
  readonly positionHashes?: readonly string[]
  readonly kingQuietMoveCount?: number
  readonly threeKingsVsOneKingCount?: number
  readonly status?: GameStatus
  readonly result?: GameResult
  readonly endReason?: GameEndReason
}

export interface GameStateSummary {
  readonly status: GameStatus
  readonly result: GameResult
  readonly endReason: GameEndReason
}

export interface SearchResult {
  readonly bestMove: Move | null
  readonly eval: number
  readonly principalVariation: readonly string[]
}
