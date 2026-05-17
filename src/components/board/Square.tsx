import { Piece } from "@/components/board/Piece"
import { indexToSquare } from "@/lib/engine/board"
import type { Piece as BoardPiece } from "@/lib/engine/types"
import { cn } from "@/lib/utils"

function getAccessibleLabel({
  index,
  piece,
  playable,
  selected,
  canMoveTo,
}: {
  index: number
  piece: BoardPiece | null
  playable: boolean
  selected: boolean
  canMoveTo: boolean
}) {
  if (!playable) {
    return "Light square"
  }

  const square = indexToSquare(index)
  const pieceLabel = piece
    ? `${piece.color === "white" ? "White" : "Black"} ${piece.king ? "king" : "man"}`
    : "Empty"

  return [square, pieceLabel, selected ? "selected" : null, canMoveTo ? "legal target" : null]
    .filter(Boolean)
    .join(", ")
}

export function Square({
  index,
  piece,
  playable,
  selected,
  canSelect,
  canMoveTo,
  disabled,
  onPress,
}: {
  index: number
  piece: BoardPiece | null
  playable: boolean
  selected: boolean
  canSelect: boolean
  canMoveTo: boolean
  disabled: boolean
  onPress: (index: number) => void
}) {
  return (
    <button
      type="button"
      disabled={!playable || disabled}
      aria-label={getAccessibleLabel({index, piece, playable, selected, canMoveTo})}
      onClick={() => onPress(index)}
      className={cn(
        "relative flex aspect-square items-center justify-center transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
        playable ? "bg-amber-800/90" : "bg-amber-100/80",
        selected && "ring-4 ring-primary/70 ring-inset",
        canSelect && "cursor-pointer hover:bg-amber-700/90",
        canMoveTo && "cursor-pointer bg-amber-700",
        disabled && playable && "cursor-not-allowed",
      )}
    >
      {piece ? <Piece piece={piece} selected={selected} /> : null}
      {canMoveTo && !piece ? (
        <span className="pointer-events-none absolute size-3 rounded-full bg-primary shadow-sm" />
      ) : null}
    </button>
  )
}
