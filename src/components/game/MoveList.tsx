import { ScrollArea } from "@/components/ui/scroll-area"
import type { RecordedMove } from "@/lib/game/session"

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return null
  }

  return `${(durationMs / 1000).toFixed(1)}s`
}

export function MoveList({ moves }: { moves: readonly RecordedMove[] }) {
  const rows = Array.from({length: Math.ceil(moves.length / 2)}, (_, index) => ({
    turn: index + 1,
    white: moves[index * 2] ?? null,
    black: moves[index * 2 + 1] ?? null,
  }))

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-medium">Ходы партии</h2>
      </div>
      <ScrollArea className="h-72">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 px-4 py-3 text-sm">
          <div className="text-muted-foreground">#</div>
          <div className="text-muted-foreground">Белые</div>
          <div className="text-muted-foreground">Чёрные</div>
          {rows.map((row) => (
            <MoveListRow key={row.turn} {...row} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function MoveListRow({
  turn,
  white,
  black,
}: {
  turn: number
  white: RecordedMove | null
  black: RecordedMove | null
}) {
  return (
    <>
      <div className="text-muted-foreground">{turn}.</div>
      <MoveCell move={white} />
      <MoveCell move={black} />
    </>
  )
}

function MoveCell({ move }: { move: RecordedMove | null }) {
  if (!move) {
    return <div className="text-muted-foreground">—</div>
  }

  return (
    <div className="flex flex-col">
      <span className="font-medium">{move.notation}</span>
      {formatDuration(move.durationMs) ? (
        <span className="text-xs text-muted-foreground">{formatDuration(move.durationMs)}</span>
      ) : null}
    </div>
  )
}
