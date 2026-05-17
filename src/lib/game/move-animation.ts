import type { GameState, Move, Piece } from "@/lib/engine/types"

export interface CapturedAnimationPiece {
  readonly square: number
  readonly piece: Piece
}

export interface PreparedMoveAnimation {
  readonly from: number
  readonly to: number
  readonly movingPiece: Piece
  readonly capturedPieces: readonly CapturedAnimationPiece[]
}

export interface ActiveMoveAnimation extends PreparedMoveAnimation {
  readonly started: boolean
  readonly durationMs: number
}

export function buildPreparedMoveAnimation(
  state: GameState,
  move: Move,
): PreparedMoveAnimation | null {
  const sourcePiece = state.board[move.from]
  if (!sourcePiece) {
    return null
  }

  const capturedPieces = move.captures.flatMap((square) => {
    const piece = state.board[square]
    return piece ? [{square, piece}] : []
  })

  return {
    from: move.from,
    to: move.to,
    movingPiece: {
      color: sourcePiece.color,
      king: move.endsAsKing || sourcePiece.king,
    },
    capturedPieces,
  }
}

export function getMoveAnimationDuration(move: Move): number {
  return move.captures.length > 0 ? 320 : 200
}
