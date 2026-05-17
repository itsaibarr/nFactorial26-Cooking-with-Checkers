import { Square } from "@/components/board/Square"
import { isPlayableSquare, toIndex } from "@/lib/engine/board"
import type { GameState } from "@/lib/engine/types"

export function Board({
  state,
  selectedSquare,
  selectableSquares,
  destinationSquares,
  disabled,
  onSquarePress,
}: {
  state: GameState
  selectedSquare: number | null
  selectableSquares: ReadonlySet<number>
  destinationSquares: ReadonlySet<number>
  disabled: boolean
  onSquarePress: (index: number) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-border shadow-sm">
      <div className="grid aspect-square w-full max-w-[min(92vw,32rem)] grid-cols-8">
        {Array.from({length: 64}, (_, index) => {
          const row = Math.floor(index / 8)
          const col = index % 8
          const playable = isPlayableSquare(row, col)
          const boardIndex = toIndex(row, col)

          return (
            <Square
              key={index}
              index={boardIndex}
              piece={state.board[boardIndex]}
              playable={playable}
              selected={selectedSquare === boardIndex}
              canSelect={selectableSquares.has(boardIndex)}
              canMoveTo={destinationSquares.has(boardIndex)}
              disabled={disabled}
              onPress={onSquarePress}
            />
          )
        })}
      </div>
    </div>
  )
}
