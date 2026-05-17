import type { BoardTheme } from "@/lib/game/preferences"

export interface BoardThemeStyles {
  readonly frame: string
  readonly lightSquare: string
  readonly darkSquare: string
  readonly darkSquareHover: string
  readonly darkSquareDestination: string
  readonly lastMoveRing: string
  readonly recommendedRing: string
  readonly capturePathFill: string
  readonly whitePiece: string
  readonly whitePieceCore: string
  readonly blackPiece: string
  readonly blackPieceCore: string
  readonly whiteKingBadge: string
  readonly blackKingBadge: string
}

const BOARD_THEME_STYLES: Record<BoardTheme, BoardThemeStyles> = {
  classic: {
    frame: "border-border bg-border",
    lightSquare: "bg-amber-100/80",
    darkSquare: "bg-amber-800/90",
    darkSquareHover: "hover:bg-amber-700/90",
    darkSquareDestination: "bg-amber-700",
    lastMoveRing: "ring-stone-300/80",
    recommendedRing: "ring-primary/55",
    capturePathFill: "bg-primary/12",
    whitePiece: "border-stone-300 bg-stone-50 text-stone-900",
    whitePieceCore: "border-stone-400/80 bg-stone-200",
    blackPiece: "border-stone-900 bg-stone-900 text-stone-50",
    blackPieceCore: "border-stone-600 bg-stone-700",
    whiteKingBadge: "bg-amber-500 text-stone-950",
    blackKingBadge: "bg-amber-300 text-stone-950",
  },
  walnut: {
    frame: "border-stone-400/60 bg-stone-300/70",
    lightSquare: "bg-stone-200",
    darkSquare: "bg-stone-700",
    darkSquareHover: "hover:bg-stone-600",
    darkSquareDestination: "bg-stone-600",
    lastMoveRing: "ring-amber-100/75",
    recommendedRing: "ring-primary/55",
    capturePathFill: "bg-primary/12",
    whitePiece: "border-stone-400 bg-amber-50 text-stone-900",
    whitePieceCore: "border-stone-400/80 bg-amber-100",
    blackPiece: "border-stone-800 bg-stone-950 text-stone-50",
    blackPieceCore: "border-stone-700 bg-stone-700",
    whiteKingBadge: "bg-amber-500 text-stone-950",
    blackKingBadge: "bg-amber-200 text-stone-950",
  },
  slate: {
    frame: "border-slate-400/60 bg-slate-300/70",
    lightSquare: "bg-slate-200",
    darkSquare: "bg-slate-700",
    darkSquareHover: "hover:bg-slate-600",
    darkSquareDestination: "bg-slate-600",
    lastMoveRing: "ring-slate-100/80",
    recommendedRing: "ring-primary/55",
    capturePathFill: "bg-primary/12",
    whitePiece: "border-slate-300 bg-slate-50 text-slate-900",
    whitePieceCore: "border-slate-400/80 bg-slate-200",
    blackPiece: "border-slate-800 bg-slate-900 text-slate-50",
    blackPieceCore: "border-slate-700 bg-slate-700",
    whiteKingBadge: "bg-amber-400 text-slate-950",
    blackKingBadge: "bg-amber-200 text-slate-950",
  },
  forest: {
    frame: "border-emerald-500/30 bg-emerald-200/40",
    lightSquare: "bg-lime-100",
    darkSquare: "bg-emerald-800",
    darkSquareHover: "hover:bg-emerald-700",
    darkSquareDestination: "bg-emerald-700",
    lastMoveRing: "ring-lime-100/80",
    recommendedRing: "ring-primary/60",
    capturePathFill: "bg-primary/14",
    whitePiece: "border-emerald-200 bg-stone-50 text-emerald-950",
    whitePieceCore: "border-emerald-200 bg-lime-100",
    blackPiece: "border-emerald-900 bg-emerald-950 text-stone-50",
    blackPieceCore: "border-emerald-800 bg-emerald-800",
    whiteKingBadge: "bg-amber-400 text-emerald-950",
    blackKingBadge: "bg-amber-200 text-emerald-950",
  },
}

export function getBoardThemeStyles(theme: BoardTheme) {
  return BOARD_THEME_STYLES[theme]
}
