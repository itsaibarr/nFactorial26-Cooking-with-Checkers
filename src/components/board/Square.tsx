import { Piece } from "@/components/board/Piece"
import type { BoardThemeStyles } from "@/components/board/theme"
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
    .filter((part): part is string => part !== null)
    .join(", ")
}

export function Square({
  index,
  piece,
  themeStyles,
  playable,
  selected,
  lastMoved,
  recommended,
  pathPreview,
  canSelect,
  canMoveTo,
  disabled,
  onPress,
}: {
  index: number
  piece: BoardPiece | null
  themeStyles: BoardThemeStyles
  playable: boolean
  selected: boolean
  lastMoved: boolean
  recommended: boolean
  pathPreview: boolean
  canSelect: boolean
  canMoveTo: boolean
  disabled: boolean
  onPress: (index: number) => void
}) {
  if (!playable) {
    return <div aria-hidden="true" className={cn("aspect-square", themeStyles.lightSquare)} />
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={getAccessibleLabel({index, piece, playable, selected, canMoveTo})}
      onClick={() => onPress(index)}
      className={cn(
        "relative flex aspect-square items-center justify-center transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
        themeStyles.darkSquare,
        selected && "ring-4 ring-primary/70 ring-inset",
        canSelect && "cursor-pointer",
        canSelect && themeStyles.darkSquareHover,
        canMoveTo && "cursor-pointer",
        canMoveTo && themeStyles.darkSquareDestination,
        disabled && "cursor-not-allowed",
      )}
    >
      {pathPreview ? (
        <span className={cn("pointer-events-none absolute inset-1 rounded-md", themeStyles.capturePathFill)} />
      ) : null}
      {recommended ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-2 rounded-md ring-2 ring-inset",
            themeStyles.recommendedRing,
          )}
        />
      ) : null}
      {lastMoved ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-1 rounded-md ring-2 ring-inset",
            themeStyles.lastMoveRing,
          )}
        />
      ) : null}
      {piece ? <Piece piece={piece} themeStyles={themeStyles} selected={selected} /> : null}
      {canMoveTo && !piece ? (
        <span className="pointer-events-none absolute size-3 rounded-full bg-primary shadow-sm" />
      ) : null}
    </button>
  )
}
