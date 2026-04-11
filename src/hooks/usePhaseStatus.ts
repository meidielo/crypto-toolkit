import { useCallback } from 'react';

type PhaseStatus = 'pending' | 'active' | 'complete';

/**
 * Derive phase status from a phase ordering and the current phase.
 *
 * Returns a `getStatus(phase)` function that computes whether each phase
 * is 'pending', 'active', or 'complete' relative to the current phase.
 *
 * This pattern was duplicated across 17 workflow components — extracted
 * here to keep a single implementation.
 */
export function usePhaseStatus<T extends string>(
  phases: readonly T[],
  current: T
): (phase: T) => PhaseStatus {
  const currentIdx = phases.indexOf(current);
  return useCallback(
    (phase: T): PhaseStatus => {
      const idx = phases.indexOf(phase);
      if (idx < currentIdx) return 'complete';
      if (idx === currentIdx) return 'active';
      return 'pending';
    },
    // phases is expected to be a stable array literal; currentIdx captures the position
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIdx]
  );
}
