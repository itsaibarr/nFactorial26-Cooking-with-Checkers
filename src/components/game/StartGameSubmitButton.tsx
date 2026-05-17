"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

export function StartGameSubmitButton() {
  const {pending} = useFormStatus()

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Создаём партию…" : "Начать партию"}
    </Button>
  )
}
