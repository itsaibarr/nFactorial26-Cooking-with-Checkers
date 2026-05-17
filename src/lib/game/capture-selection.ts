import type { Move } from "@/lib/engine/types"

function pathStartsWith(movePath: readonly number[], selectedPath: readonly number[]) {
  return selectedPath.every((square, index) => movePath[index] === square)
}

export function getMovesMatchingPathPrefix(
  moves: readonly Move[],
  selectedPath: readonly number[],
) {
  return moves.filter(
    (move) => selectedPath.length <= move.path.length && pathStartsWith(move.path, selectedPath),
  )
}

export function getCapturePathNextSquares(
  moves: readonly Move[],
  selectedPath: readonly number[],
) {
  const nextSquares = new Set<number>()

  for (const move of getMovesMatchingPathPrefix(moves, selectedPath)) {
    const nextSquare = move.path[selectedPath.length]

    if (typeof nextSquare === "number") {
      nextSquares.add(nextSquare)
    }
  }

  return [...nextSquares].sort((left, right) => left - right)
}

export function findMoveMatchingPath(moves: readonly Move[], selectedPath: readonly number[]) {
  return (
    moves.find(
      (move) =>
        move.path.length === selectedPath.length && pathStartsWith(move.path, selectedPath),
    ) ?? null
  )
}
