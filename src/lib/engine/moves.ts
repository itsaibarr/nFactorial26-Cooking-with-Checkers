import {
  createMove,
  getOpponentColor,
  getPiece,
  getPieceCounts,
  indexToSquare,
  isPlayableSquare,
  isPromotionRow,
  isThreeKingsVersusOneKing,
  isWithinBoard,
  toIndex,
  toRowCol,
} from "@/lib/engine/board"
import type {
  GameState,
  GameStateSummary,
  Move,
  Piece,
} from "@/lib/engine/types"

const MAN_CAPTURE_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

const KING_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function sortMoves(moves: Move[]) {
  return Object.freeze([...moves].sort((left, right) => left.notation.localeCompare(right.notation)))
}

function collectManQuietMoves(board: GameState["board"], index: number, piece: Piece) {
  const moves: Move[] = []
  const {row, col} = toRowCol(index)
  const forward = piece.color === "white" ? -1 : 1

  for (const offset of [-1, 1]) {
    const nextRow = row + forward
    const nextCol = col + offset
    if (!isPlayableSquare(nextRow, nextCol)) {
      continue
    }

    const landingIndex = toIndex(nextRow, nextCol)
    if (board[landingIndex]) {
      continue
    }

    moves.push(
      createMove({
        from: index,
        to: landingIndex,
        path: [index, landingIndex],
        captures: [],
        endsAsKing: isPromotionRow(piece.color, nextRow),
      }),
    )
  }

  return moves
}

function collectKingQuietMoves(board: GameState["board"], index: number) {
  const moves: Move[] = []
  const {row, col} = toRowCol(index)

  for (const [rowStep, colStep] of KING_DIRECTIONS) {
    let nextRow = row + rowStep
    let nextCol = col + colStep

    while (isPlayableSquare(nextRow, nextCol)) {
      const landingIndex = toIndex(nextRow, nextCol)
      if (board[landingIndex]) {
        break
      }

      moves.push(
        createMove({
          from: index,
          to: landingIndex,
          path: [index, landingIndex],
          captures: [],
          endsAsKing: true,
        }),
      )

      nextRow += rowStep
      nextCol += colStep
    }
  }

  return moves
}

function collectManCaptureMoves(
  board: GameState["board"],
  index: number,
  piece: Piece,
  path: readonly number[],
  captures: readonly number[],
  moves: Move[],
) {
  let foundCapture = false
  const {row, col} = toRowCol(index)

  for (const [rowStep, colStep] of MAN_CAPTURE_DIRECTIONS) {
    const captureRow = row + rowStep
    const captureCol = col + colStep
    const landingRow = row + rowStep * 2
    const landingCol = col + colStep * 2

    if (!isPlayableSquare(captureRow, captureCol) || !isPlayableSquare(landingRow, landingCol)) {
      continue
    }

    const captureIndex = toIndex(captureRow, captureCol)
    const landingIndex = toIndex(landingRow, landingCol)
    const capturedPiece = board[captureIndex]

    if (!capturedPiece || capturedPiece.color === piece.color || board[landingIndex]) {
      continue
    }

    foundCapture = true
    const promoted = isPromotionRow(piece.color, landingRow)
    const nextPiece = getPiece(piece.color, promoted)
    const nextBoard = [...board]
    nextBoard[index] = null
    nextBoard[captureIndex] = null
    nextBoard[landingIndex] = nextPiece

    if (promoted) {
      collectKingCaptureMoves(
        nextBoard,
        landingIndex,
        nextPiece,
        [...path, landingIndex],
        [...captures, captureIndex],
        moves,
      )
    } else {
      collectManCaptureMoves(
        nextBoard,
        landingIndex,
        nextPiece,
        [...path, landingIndex],
        [...captures, captureIndex],
        moves,
      )
    }
  }

  if (!foundCapture && captures.length > 0) {
    moves.push(
      createMove({
        from: path[0]!,
        to: path[path.length - 1]!,
        path,
        captures,
        endsAsKing: piece.king,
      }),
    )
  }
}

function collectKingCaptureMoves(
  board: GameState["board"],
  index: number,
  piece: Piece,
  path: readonly number[],
  captures: readonly number[],
  moves: Move[],
) {
  let foundCapture = false
  const {row, col} = toRowCol(index)

  for (const [rowStep, colStep] of KING_DIRECTIONS) {
    let nextRow = row + rowStep
    let nextCol = col + colStep
    let capturedIndex: number | null = null

    while (isWithinBoard(nextRow, nextCol)) {
      if (!isPlayableSquare(nextRow, nextCol)) {
        nextRow += rowStep
        nextCol += colStep
        continue
      }

      const squareIndex = toIndex(nextRow, nextCol)
      const occupant = board[squareIndex]

      if (!occupant) {
        if (capturedIndex !== null) {
          foundCapture = true
          const nextBoard = [...board]
          nextBoard[index] = null
          nextBoard[capturedIndex] = null
          nextBoard[squareIndex] = piece

          collectKingCaptureMoves(
            nextBoard,
            squareIndex,
            piece,
            [...path, squareIndex],
            [...captures, capturedIndex],
            moves,
          )
        }

        nextRow += rowStep
        nextCol += colStep
        continue
      }

      if (occupant.color === piece.color) {
        break
      }

      if (capturedIndex !== null) {
        break
      }

      capturedIndex = squareIndex
      nextRow += rowStep
      nextCol += colStep
    }
  }

  if (!foundCapture && captures.length > 0) {
    moves.push(
      createMove({
        from: path[0]!,
        to: path[path.length - 1]!,
        path,
        captures,
        endsAsKing: true,
      }),
    )
  }
}

function collectCaptureMovesForPiece(board: GameState["board"], index: number, piece: Piece) {
  const moves: Move[] = []

  if (piece.king) {
    collectKingCaptureMoves(board, index, piece, [index], [], moves)
  } else {
    collectManCaptureMoves(board, index, piece, [index], [], moves)
  }

  return moves
}

function collectQuietMovesForPiece(board: GameState["board"], index: number, piece: Piece) {
  return piece.king ? collectKingQuietMoves(board, index) : collectManQuietMoves(board, index, piece)
}

export function getLegalMoves(state: GameState) {
  const captureMoves: Move[] = []
  const quietMoves: Move[] = []

  for (let index = 0; index < state.board.length; index += 1) {
    const piece = state.board[index]

    if (!piece || piece.color !== state.sideToMove) {
      continue
    }

    captureMoves.push(...collectCaptureMovesForPiece(state.board, index, piece))
  }

  if (captureMoves.length > 0) {
    return sortMoves(captureMoves)
  }

  for (let index = 0; index < state.board.length; index += 1) {
    const piece = state.board[index]

    if (!piece || piece.color !== state.sideToMove) {
      continue
    }

    quietMoves.push(...collectQuietMovesForPiece(state.board, index, piece))
  }

  return sortMoves(quietMoves)
}

function getRepeatedHashCount(positionHashes: readonly string[]) {
  const currentHash = positionHashes[positionHashes.length - 1]

  if (!currentHash) {
    return 0
  }

  return positionHashes.filter((hash) => hash === currentHash).length
}

export function getGameSummary(state: GameState): GameStateSummary {
  const counts = getPieceCounts(state.board)
  const whitePieces = counts.whiteMen + counts.whiteKings
  const blackPieces = counts.blackMen + counts.blackKings

  if (whitePieces === 0) {
    return {status: "won", result: "black", endReason: "no-pieces"}
  }

  if (blackPieces === 0) {
    return {status: "won", result: "white", endReason: "no-pieces"}
  }

  const legalMoves = getLegalMoves(state)
  if (legalMoves.length === 0) {
    return {
      status: "won",
      result: getOpponentColor(state.sideToMove),
      endReason: "no-moves",
    }
  }

  if (getRepeatedHashCount(state.positionHashes) >= 3) {
    return {
      status: "drawn",
      result: "draw",
      endReason: "threefold-repetition",
    }
  }

  if (state.kingQuietMoveCount >= 25) {
    return {
      status: "drawn",
      result: "draw",
      endReason: "25-king-moves",
    }
  }

  if (state.threeKingsVsOneKingCount >= 16 && isThreeKingsVersusOneKing(state.board)) {
    return {
      status: "drawn",
      result: "draw",
      endReason: "three-kings-versus-one-king",
    }
  }

  return {
    status: "playing",
    result: null,
    endReason: null,
  }
}

export function describeMove(move: Move) {
  if (move.captures.length === 0) {
    return `${indexToSquare(move.from)}-${indexToSquare(move.to)}`
  }

  return move.path.map((square) => indexToSquare(square)).join(":")
}
