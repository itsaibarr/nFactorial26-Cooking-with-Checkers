import type { Piece as BoardPiece } from "@/lib/engine/types"
import type { BoardThemeStyles } from "@/components/board/theme"
import { cn } from "@/lib/utils"

export function Piece({
  piece,
  themeStyles,
  selected = false,
}: {
  piece: BoardPiece
  themeStyles: BoardThemeStyles
  selected?: boolean
}) {
  const isWhite = piece.color === "white"

  return (
    <div
      className={cn(
        "relative flex size-[78%] items-center justify-center rounded-full border shadow-sm transition-transform",
        isWhite ? themeStyles.whitePiece : themeStyles.blackPiece,
        selected && "scale-[1.04] shadow-md",
      )}
    >
      <span
        className={cn(
          "size-[28%] rounded-full border",
          isWhite ? themeStyles.whitePieceCore : themeStyles.blackPieceCore,
        )}
      />
      {piece.king ? (
        <span
          className={cn(
            "absolute -top-1 rounded-full px-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            isWhite ? themeStyles.whiteKingBadge : themeStyles.blackKingBadge,
          )}
        >
          K
        </span>
      ) : null}
    </div>
  )
}
