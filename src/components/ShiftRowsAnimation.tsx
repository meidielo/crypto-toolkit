import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { State } from '@/lib/aes-math';
import { Button } from '@/components/ui/button';

interface ShiftRowsAnimationProps {
  before: State;
  after: State;
}

// Cell size constants
const CELL = 40; // px
const GAP = 2;   // px
const STEP = CELL + GAP; // total shift per position

export function ShiftRowsAnimation({ before, after }: ShiftRowsAnimationProps) {
  const [animated, setAnimated] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Row shift amounts: row 0 = 0, row 1 = 1, row 2 = 2, row 3 = 3
  const shifts = [0, 1, 2, 3];

  function play() {
    setAnimated(false);
    setShowResult(false);
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimated(true);
        setTimeout(() => setShowResult(true), 600);
      });
    });
  }

  function reset() {
    setAnimated(false);
    setShowResult(false);
  }

  // Get the value at [col][row] from before state (column-major)
  const getVal = (col: number, row: number) =>
    before[col][row].toString(16).padStart(2, '0');

  const getAfterVal = (col: number, row: number) =>
    after[col][row].toString(16).padStart(2, '0');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-start">
        {/* Animated grid */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            {showResult ? 'After ShiftRows' : animated ? 'Shifting...' : 'Before'}
          </p>
          <div
            className="relative overflow-hidden rounded-lg border bg-background"
            style={{ width: 4 * STEP + GAP, height: 4 * STEP + GAP }}
          >
            {[0, 1, 2, 3].map(row =>
              [0, 1, 2, 3].map(col => {
                const shift = shifts[row];
                const isShifted = shift > 0;
                // Destination position after shift
                return (
                  <div
                    key={`${row}-${col}`}
                    className={cn(
                      'absolute flex items-center justify-center font-mono font-bold text-xs rounded border',
                      'transition-transform ease-in-out',
                      isShifted && animated
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-muted/50 border-border text-foreground',
                    )}
                    style={{
                      width: CELL,
                      height: CELL,
                      top: row * STEP + GAP,
                      left: col * STEP + GAP,
                      // Shift left by (shift * STEP) px, wrapping handled by modular position
                      transform: animated ? `translateX(${-shift * STEP}px)` : 'translateX(0)',
                      transitionDuration: '500ms',
                      // Cells that wrap: they go off-screen left, we show a ghost
                      opacity: animated && col < shift ? 0 : 1,
                      transitionProperty: 'transform, opacity',
                    }}
                  >
                    {getVal(col, row)}
                  </div>
                );
              })
            )}

            {/* Ghost cells: bytes wrapping from left to right */}
            {[0, 1, 2, 3].map(row =>
              [0, 1, 2, 3].map(col => {
                const shift = shifts[row];
                if (shift === 0 || col >= shift) return null;
                // This byte wraps: it starts at col, ends at (col - shift + 4) % 4
                // Ghost starts off-screen right (at position 4 + col - shift relative)
                const ghostStartCol = 4 + col;
                return (
                  <div
                    key={`ghost-${row}-${col}`}
                    className={cn(
                      'absolute flex items-center justify-center font-mono font-bold text-xs rounded border',
                      'transition-all ease-in-out',
                      animated
                        ? 'bg-primary/20 border-primary/50 text-primary opacity-100'
                        : 'opacity-0',
                    )}
                    style={{
                      width: CELL,
                      height: CELL,
                      top: row * STEP + GAP,
                      left: ghostStartCol * STEP + GAP,
                      transform: animated ? `translateX(${-shift * STEP}px)` : 'translateX(0)',
                      transitionDuration: '500ms',
                      transitionProperty: 'transform, opacity',
                    }}
                  >
                    {getVal(col, row)}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Row labels */}
        <div className="space-y-0.5 self-end mb-1 hidden sm:block">
          {shifts.map((s, i) => (
            <div key={i} className="h-[42px] flex items-center">
              <span className={cn(
                'text-[10px] font-mono',
                s === 0 ? 'text-muted-foreground' : 'text-primary',
              )}>
                ← {s === 0 ? 'no shift' : `shift ${s}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={play} variant="outline" size="sm" className="flex-1">
          {animated ? 'Replay Animation' : 'Animate ShiftRows'}
        </Button>
        {animated && (
          <Button onClick={reset} variant="ghost" size="sm">Reset</Button>
        )}
      </div>

      {/* Final result grid for verification */}
      {showResult && (
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1.5">Result (verify)</p>
          <div className="grid grid-cols-4 gap-0.5 w-fit">
            {[0, 1, 2, 3].map(row =>
              [0, 1, 2, 3].map(col => (
                <div
                  key={`result-${row}-${col}`}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center font-mono font-bold text-xs rounded border',
                    before[col][row] !== after[col][row]
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-muted/50 border-border',
                  )}
                >
                  {getAfterVal(col, row)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
