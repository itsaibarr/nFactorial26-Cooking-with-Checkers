import type { Piece as BoardPiece } from "@/lib/engine/types"
import { cn } from "@/lib/utils"

export function Piece({
  piece,
  selected = false,
}: {
  piece: BoardPiece
  selected?: boolean
}) {
  const isWhite = piece.color === "white"

  return (
    <div
      className={cn(
        "relative flex size-[78%] items-center justify-center rounded-full border shadow-sm transition-transform",
        isWhite
          ? "border-stone-300 bg-stone-50 text-stone-900"
          : "border-stone-900 bg-stone-900 text-stone-50",
        selected && "scale-[1.04] shadow-md",
      )}
    >
      <span
        className={cn(
          "size-[28%] rounded-full border",
          isWhite ? "border-stone-400/80 bg-stone-200" : "border-stone-600 bg-stone-700",
        )}
      />
      {piece.king ? (
        <span
          className={cn(
            "absolute -top-1 rounded-full px-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            isWhite ? "bg-amber-500 text-stone-950" : "bg-amber-300 text-stone-950",
          )}
        >
          K
        </span>
      ) : null}
    </div>
  )
}
