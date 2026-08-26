export interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function isWithinWindow(inner: TimeWindow, outer: TimeWindow): boolean {
  return inner.startTime >= outer.startTime && inner.endTime <= outer.endTime;
}
