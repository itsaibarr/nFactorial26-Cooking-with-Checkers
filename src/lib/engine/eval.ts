import { isPlayableSquare, toRowCol } from "@/lib/engine/board"
import type { Board, GameState, PieceColor } from "@/lib/engine/types"

const MAN_VALUE = 100
const KING_VALUE = 300
const CENTER_BONUS = 5
const BACK_RANK_BONUS = 10
const ADVANCEMENT_BONUS = 2

function getBackRank(color: PieceColor) {
  return color === "white" ? 7 : 0
}

function getAdvancement(color: PieceColor, row: number) {
  return color === "white" ? 7 - row : row
}

function scoreBoard(board: Board, perspective: PieceColor) {
  let whiteScore = 0
  let blackScore = 0

  for (let index = 0; index < board.length; index += 1) {
    const piece = board[index]
    if (!piece) {
      continue
    }

    const {row, col} = toRowCol(index)
    const scoreTarget = piece.color === "white" ? "white" : "black"
    let score = piece.king ? KING_VALUE : MAN_VALUE

    if (!piece.king) {
      score += getAdvancement(piece.color, row) * ADVANCEMENT_BONUS
      if (row === getBackRank(piece.color)) {
        score += BACK_RANK_BONUS
      }
    }

    if (isPlayableSquare(row, col) && row >= 2 && row <= 5 && col >= 2 && col <= 5) {
      score += CENTER_BONUS
    }

    if (scoreTarget === "white") {
      whiteScore += score
    } else {
      blackScore += score
    }
  }

  return perspective === "white" ? whiteScore - blackScore : blackScore - whiteScore
}

export function evaluateState(state: GameState) {
  if (state.status === "won") {
    if (state.result === state.sideToMove) {
      return 100_000
    }

    return -100_000
  }

  if (state.status === "drawn") {
    return 0
  }

  return scoreBoard(state.board, state.sideToMove)
}
