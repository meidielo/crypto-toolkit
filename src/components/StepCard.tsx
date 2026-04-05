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
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            status === 'complete' && 'bg-green-500/20 text-green-600 dark:text-green-400',
            status === 'active' && 'bg-primary/20 text-primary',
            status === 'pending' && 'bg-muted text-muted-foreground',
          )}>
            {status === 'complete' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : step}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={status === 'complete' ? 'default' : status === 'active' ? 'outline' : 'secondary'} className="ml-auto text-xs">
            {status === 'complete' ? 'Done' : status === 'active' ? 'Active' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      {status !== 'pending' && (
        <CardContent className="space-y-3 pt-0">
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
      'flex items-start gap-2 text-sm font-mono py-1',
      highlight && 'bg-primary/5 -mx-2 px-2 rounded'
    )}>
      <span className="text-muted-foreground min-w-[100px] shrink-0">{label}:</span>
      {formula && <span className="text-muted-foreground">{formula} = </span>}
      <span className="break-all font-semibold">{value}</span>
    </div>
  );
}

export function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 font-mono text-sm space-y-1">
      {children}
    </div>
  );
}
