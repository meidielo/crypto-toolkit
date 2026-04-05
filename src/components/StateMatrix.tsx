import { cn } from '@/lib/utils';
import type { State } from '@/lib/aes-math';

interface StateMatrixProps {
  state: State;
  label?: string;
  highlight?: boolean[][];  // which cells to highlight
  className?: string;
  size?: 'sm' | 'md';
}

export function StateMatrix({ state, label, highlight, className, size = 'md' }: StateMatrixProps) {
  const cellSize = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';

  return (
    <div className={cn('inline-block', className)}>
      {label && <p className="text-xs text-muted-foreground mb-1.5 font-sans">{label}</p>}
      <div className="grid grid-cols-4 gap-0.5">
        {/* Display row-major: iterate rows, then columns */}
        {[0, 1, 2, 3].map(row =>
          [0, 1, 2, 3].map(col => {
            const isHighlighted = highlight?.[col]?.[row];
            return (
              <div
                key={`${row}-${col}`}
                className={cn(
                  cellSize,
                  'flex items-center justify-center font-mono font-bold rounded border',
                  isHighlighted
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-muted/50 border-border text-foreground'
                )}
              >
                {state[col][row].toString(16).padStart(2, '0')}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Simple vector display for LWE
interface VectorDisplayProps {
  values: number[];
  label?: string;
  horizontal?: boolean;
  className?: string;
}

export function VectorDisplay({ values, label, horizontal = false, className }: VectorDisplayProps) {
  return (
    <div className={cn('inline-block', className)}>
      {label && <p className="text-xs text-muted-foreground mb-1 font-sans">{label}</p>}
      <div className={cn(
        'flex gap-0.5',
        horizontal ? 'flex-row' : 'flex-col'
      )}>
        {values.map((v, i) => (
          <div
            key={i}
            className="w-8 h-8 flex items-center justify-center font-mono text-xs font-bold rounded border bg-muted/50 border-border"
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

// Matrix display for LWE
interface MatrixDisplayProps {
  matrix: number[][];
  label?: string;
  className?: string;
}

export function MatrixDisplay({ matrix, label, className }: MatrixDisplayProps) {
  const n = matrix.length;
  return (
    <div className={cn('inline-block', className)}>
      {label && <p className="text-xs text-muted-foreground mb-1 font-sans">{label}</p>}
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {matrix.flatMap((row, i) =>
          row.map((v, j) => (
            <div
              key={`${i}-${j}`}
              className="w-8 h-8 flex items-center justify-center font-mono text-[10px] font-bold rounded border bg-muted/50 border-border"
            >
              {v}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
