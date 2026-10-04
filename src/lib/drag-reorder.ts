import {
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"

/** Sensors shared by every drag-to-reorder list. A grip is the only activator, so a small move
 * threshold keeps clicks working; touch waits for a short press so a swipe still scrolls; the
 * keyboard moves items with Space + arrow keys. */
export function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

/** Items only reorder up and down — keeps the lifted row from drifting sideways. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
