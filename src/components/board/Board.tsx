import { getBoardThemeStyles } from "@/components/board/theme"
import { Square } from "@/components/board/Square"
import { Piece } from "@/components/board/Piece"
import type { BoardTheme } from "@/lib/game/preferences"
import { isPlayableSquare, toIndex, toRowCol } from "@/lib/engine/board"
import type { ActiveMoveAnimation } from "@/lib/game/move-animation"
import type { GameState } from "@/lib/engine/types"
import { cn } from "@/lib/utils"

const EMPTY_SQUARE_SET = new Set<number>()

export function Board({
  state,
  selectedSquare,
  selectableSquares,
  destinationSquares,
  lastMoveSquares = EMPTY_SQUARE_SET,
  recommendedSquares = EMPTY_SQUARE_SET,
  pathPreviewSquares = EMPTY_SQUARE_SET,
  moveAnimation = null,
  boardTheme = "classic",
  disabled,
  onSquarePress,
}: {
  state: GameState
  selectedSquare: number | null
  selectableSquares: ReadonlySet<number>
  destinationSquares: ReadonlySet<number>
  lastMoveSquares?: ReadonlySet<number>
  recommendedSquares?: ReadonlySet<number>
  pathPreviewSquares?: ReadonlySet<number>
  moveAnimation?: ActiveMoveAnimation | null
  boardTheme?: BoardTheme
  disabled: boolean
  onSquarePress: (index: number) => void
}) {
  const themeStyles = getBoardThemeStyles(boardTheme)

  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[min(92vw,32rem)] overflow-hidden rounded-2xl border shadow-sm",
        themeStyles.frame,
      )}
    >
      <div className="grid size-full grid-cols-8">
        {Array.from({length: 64}, (_, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const playable = isPlayableSquare(row, col)
          const boardIndex = toIndex(row, col)
          const piece =
            moveAnimation?.to === boardIndex ? null : state.board[boardIndex]

          return (
            <Square
              key={boardIndex}
              index={boardIndex}
              piece={piece}
              themeStyles={themeStyles}
              playable={playable}
              selected={selectedSquare === boardIndex}
              lastMoved={lastMoveSquares.has(boardIndex)}
              recommended={recommendedSquares.has(boardIndex)}
              pathPreview={pathPreviewSquares.has(boardIndex)}
              canSelect={selectableSquares.has(boardIndex)}
              canMoveTo={destinationSquares.has(boardIndex)}
              disabled={disabled}
              onPress={onSquarePress}
            />
          )
        })}
      </div>
      {moveAnimation ? <MoveAnimationLayer animation={moveAnimation} boardTheme={boardTheme} /> : null}
    </div>
  )
}

function MoveAnimationLayer({
  animation,
  boardTheme,
}: {
  animation: ActiveMoveAnimation
  boardTheme: BoardTheme
}) {
  const themeStyles = getBoardThemeStyles(boardTheme)
  const from = toRowCol(animation.from)
  const to = toRowCol(animation.to)
  const translateX = (to.col - from.col) * 100
  const translateY = (to.row - from.row) * 100

  return (
    <div className="pointer-events-none absolute inset-0">
      {animation.capturedPieces.map(({square, piece}) => {
        const {row, col} = toRowCol(square)

        return (
          <div
            key={`captured-${square}`}
            className="absolute flex items-center justify-center"
            style={{
              width: "12.5%",
              height: "12.5%",
              left: `${col * 12.5}%`,
              top: `${row * 12.5}%`,
              opacity: animation.started ? 0 : 1,
              transform: animation.started ? "scale(0.92)" : "scale(1)",
              transition: `opacity 140ms ease-out ${Math.round(animation.durationMs * 0.45)}ms, transform 140ms ease-out ${Math.round(animation.durationMs * 0.45)}ms`,
            }}
          >
            <Piece piece={piece} themeStyles={themeStyles} />
          </div>
        )
      })}

      <div
        className="absolute z-10 flex items-center justify-center"
        style={{
          width: "12.5%",
          height: "12.5%",
          left: `${from.col * 12.5}%`,
          top: `${from.row * 12.5}%`,
          transform: animation.started
            ? `translate(${translateX}%, ${translateY}%)`
            : "translate(0, 0)",
          transition: `transform ${animation.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          willChange: "transform",
        }}
      >
        <Piece piece={animation.movingPiece} themeStyles={themeStyles} />
      </div>
    </div>
  )
}
