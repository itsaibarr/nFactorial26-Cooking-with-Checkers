import type {
  Board,
  CreateGameStateOptions,
  GameState,
  Move,
  Piece,
  PieceColor,
} from "@/lib/engine/types"

const BOARD_SIZE = 8
const FILES = "abcdefgh"
type MutableBoard = Array<Piece | null>

const WHITE_MAN = Object.freeze({color: "white", king: false} satisfies Piece)
const WHITE_KING = Object.freeze({color: "white", king: true} satisfies Piece)
const BLACK_MAN = Object.freeze({color: "black", king: false} satisfies Piece)
const BLACK_KING = Object.freeze({color: "black", king: true} satisfies Piece)

export function getPiece(color: PieceColor, king: boolean) {
  if (color === "white") {
    return king ? WHITE_KING : WHITE_MAN
  }

  return king ? BLACK_KING : BLACK_MAN
}

export function getOpponentColor(color: PieceColor): PieceColor {
  return color === "white" ? "black" : "white"
}

export function isWithinBoard(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function isPlayableSquare(row: number, col: number) {
  return isWithinBoard(row, col) && (row + col) % 2 === 1
}

export function toIndex(row: number, col: number) {
  return row * BOARD_SIZE + col
}

export function toRowCol(index: number) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  }
}

export function indexToSquare(index: number) {
  const {row, col} = toRowCol(index)

  if (!isPlayableSquare(row, col)) {
    throw new Error(`Index ${index} is not a playable square`)
  }

  return `${FILES[col]}${BOARD_SIZE - row}`
}

export function squareToIndex(square: string) {
  if (!/^[a-h][1-8]$/.test(square)) {
    throw new Error(`Invalid square: ${square}`)
  }

  const col = FILES.indexOf(square[0])
  const row = BOARD_SIZE - Number(square[1])

  if (!isPlayableSquare(row, col)) {
    throw new Error(`Square ${square} is not playable in draughts`)
  }

  return toIndex(row, col)
}

export function isPromotionRow(color: PieceColor, row: number) {
  return color === "white" ? row === 0 : row === BOARD_SIZE - 1
}

export function createEmptyBoard(): MutableBoard {
  return Array.from({length: BOARD_SIZE * BOARD_SIZE}, () => null)
}

export function freezeBoard(board: MutableBoard) {
  return Object.freeze([...board]) as Board
}

export function freezeMove(move: Move) {
  return Object.freeze({
    ...move,
    path: Object.freeze([...move.path]),
    captures: Object.freeze([...move.captures]),
  })
}

export function freezeState(state: Omit<GameState, "board"> & {board: MutableBoard | Board}) {
  return Object.freeze({
    ...state,
    board: Array.isArray(state.board) ? freezeBoard([...state.board]) : state.board,
    moveHistory: Object.freeze([...state.moveHistory]),
    positionHashes: Object.freeze([...state.positionHashes]),
  }) as GameState
}

export function buildPositionHash(board: Board, sideToMove: PieceColor) {
  const boardHash = board
    .map((piece, index) => {
      const {row, col} = toRowCol(index)
      if (!isPlayableSquare(row, col)) {
        return "_"
      }

      if (!piece) {
        return "."
      }

      if (piece.color === "white") {
        return piece.king ? "W" : "w"
      }

      return piece.king ? "B" : "b"
    })
    .join("")

  return `${boardHash}:${sideToMove}`
}

export function getPieceCounts(board: Board) {
  let whiteMen = 0
  let whiteKings = 0
  let blackMen = 0
  let blackKings = 0

  for (const piece of board) {
    if (!piece) {
      continue
    }

    if (piece.color === "white") {
      if (piece.king) {
        whiteKings += 1
      } else {
        whiteMen += 1
      }
    } else if (piece.king) {
      blackKings += 1
    } else {
      blackMen += 1
    }
  }

  return {whiteMen, whiteKings, blackMen, blackKings}
}

export function isThreeKingsVersusOneKing(board: Board) {
  const counts = getPieceCounts(board)
  const totalMen = counts.whiteMen + counts.blackMen

  if (totalMen > 0) {
    return false
  }

  return (
    (counts.whiteKings === 3 && counts.blackKings === 1) ||
    (counts.whiteKings === 1 && counts.blackKings === 3)
  )
}

export function createInitialBoard() {
  const board = createEmptyBoard()

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (!isPlayableSquare(row, col)) {
        continue
      }

      if (row <= 2) {
        board[toIndex(row, col)] = BLACK_MAN
      } else if (row >= 5) {
        board[toIndex(row, col)] = WHITE_MAN
      }
    }
  }

  return freezeBoard(board)
}

export function createGameState({
  sideToMove = "white",
  whiteMen = [],
  whiteKings = [],
  blackMen = [],
  blackKings = [],
  moveHistory = [],
  positionHashes,
  kingQuietMoveCount = 0,
  threeKingsVsOneKingCount = 0,
  status = "playing",
  result = null,
  endReason = null,
}: CreateGameStateOptions = {}) {
  const board = createEmptyBoard()

  for (const square of whiteMen) {
    board[squareToIndex(square)] = WHITE_MAN
  }

  for (const square of whiteKings) {
    board[squareToIndex(square)] = WHITE_KING
  }

  for (const square of blackMen) {
    board[squareToIndex(square)] = BLACK_MAN
  }

  for (const square of blackKings) {
    board[squareToIndex(square)] = BLACK_KING
  }

  const frozenBoard = freezeBoard(board)

  return freezeState({
    board: frozenBoard,
    sideToMove,
    moveHistory,
    positionHashes: positionHashes ?? [buildPositionHash(frozenBoard, sideToMove)],
    kingQuietMoveCount,
    threeKingsVsOneKingCount,
    status,
    result,
    endReason,
  })
}

export function createInitialState() {
  const board = createInitialBoard()

  return freezeState({
    board,
    sideToMove: "white",
    moveHistory: [],
    positionHashes: [buildPositionHash(board, "white")],
    kingQuietMoveCount: 0,
    threeKingsVsOneKingCount: 0,
    status: "playing",
    result: null,
    endReason: null,
  })
}

export function createMove({
  from,
  to,
  path,
  captures,
  endsAsKing,
}: Omit<Move, "notation"> & {path: readonly number[]; captures: readonly number[]}) {
  const separator = captures.length > 0 ? ":" : "-"
  const notation = path.map((square) => indexToSquare(square)).join(separator)

  return freezeMove({
    from,
    to,
    path,
    captures,
    notation,
    endsAsKing,
  })
}

export function applyLegalMoveRaw(state: GameState, move: Move) {
  const movingPiece = state.board[move.from]

  if (!movingPiece) {
    throw new Error(`No piece found at ${indexToSquare(move.from)}`)
  }

  const board = [...state.board]
  board[move.from] = null

  for (const capturedIndex of move.captures) {
    board[capturedIndex] = null
  }

  board[move.to] = getPiece(movingPiece.color, movingPiece.king || move.endsAsKing)

  const nextSideToMove = getOpponentColor(state.sideToMove)
  const nextBoard = freezeBoard(board)
  const nextPositionHashes = [
    ...state.positionHashes,
    buildPositionHash(nextBoard, nextSideToMove),
  ]

  return freezeState({
    board: nextBoard,
    sideToMove: nextSideToMove,
    moveHistory: [...state.moveHistory, move.notation],
    positionHashes: nextPositionHashes,
    kingQuietMoveCount:
      move.captures.length === 0 && movingPiece.king
        ? state.kingQuietMoveCount + 1
        : 0,
    threeKingsVsOneKingCount: isThreeKingsVersusOneKing(nextBoard)
      ? state.threeKingsVsOneKingCount + 1
      : 0,
    status: "playing",
    result: null,
    endReason: null,
  })
}
