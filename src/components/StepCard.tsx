import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StepCardProps {
  step: number;
  title: string;
  status: 'pending' | 'active' | 'complete';
  children: React.ReactNode;
}

export function StepCard({ step, title, status, children }: StepCardProps) {
  return (
    <Card className={cn(
      'transition-all',
      status === 'active' && 'ring-2 ring-primary/50',
      status === 'pending' && 'opacity-60',
    )}>
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <div className={cn(
            'w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shrink-0',
            status === 'complete' && 'bg-green-500/20 text-green-600 dark:text-green-400',
            status === 'active' && 'bg-primary/20 text-primary',
            status === 'pending' && 'bg-muted text-muted-foreground',
          )}>
            {status === 'complete' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : step}
          </div>
          <CardTitle className="text-sm md:text-base flex-1 min-w-0">{title}</CardTitle>
          <Badge variant={status === 'complete' ? 'default' : status === 'active' ? 'outline' : 'secondary'} className="text-[10px] md:text-xs shrink-0">
            {status === 'complete' ? 'Done' : status === 'active' ? 'Active' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      {status !== 'pending' && (
        <CardContent className="space-y-3 pt-0 px-4 md:px-6">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

interface ComputationRowProps {
  label: string;
  formula?: string;
  value: string;
  highlight?: boolean;
}

export function ComputationRow({ label, formula, value, highlight }: ComputationRowProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm font-mono py-1 overflow-hidden',
      highlight && 'bg-primary/5 -mx-2 px-2 rounded'
    )}>
      <span className="text-muted-foreground shrink-0 text-xs sm:text-sm sm:min-w-[100px]">{label}:</span>
      <div className="flex items-start gap-1 min-w-0 flex-wrap">
        {formula && <span className="text-muted-foreground text-xs sm:text-sm">{formula} = </span>}
        <span className="break-all font-semibold text-xs sm:text-sm">{value}</span>
      </div>
    </div>
  );
}

export function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-sm space-y-1 overflow-x-auto">
      {children}
    </div>
  );
}
