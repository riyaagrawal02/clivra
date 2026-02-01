import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

interface ReadinessGaugeProps {
  status: 'not_ready' | 'improving' | 'almost_ready' | 'exam_ready';
  percentage: number;
  message?: string;
}

const statusConfig = {
  not_ready: {
    label: 'Not Ready',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    gradientFrom: 'from-destructive/20',
    gradientTo: 'to-destructive/60',
  },
  improving: {
    label: 'Improving',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    gradientFrom: 'from-warning/20',
    gradientTo: 'to-warning/60',
  },
  almost_ready: {
    label: 'Almost Ready',
    color: 'text-info',
    bgColor: 'bg-info/10',
    gradientFrom: 'from-info/20',
    gradientTo: 'to-info/60',
  },
  exam_ready: {
    label: 'Exam Ready',
    color: 'text-success',
    bgColor: 'bg-success/10',
    gradientFrom: 'from-success/20',
    gradientTo: 'to-success/60',
  },
};

export function ReadinessGauge({ status, percentage, message }: ReadinessGaugeProps) {
  const config = statusConfig[status];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={cn('text-lg font-semibold font-display', config.color)}>
          {config.label}
        </span>
        <span className="text-2xl font-bold font-display text-foreground">
          {percentage}%
        </span>
      </div>
      
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r',
            config.gradientFrom,
            config.gradientTo
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
