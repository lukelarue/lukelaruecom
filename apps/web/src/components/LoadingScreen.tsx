import { clsx } from 'clsx';

type LoadingScreenProps = {
  message?: string;
  className?: string;
};

export const LoadingScreen = ({ message = 'Loading…', className }: LoadingScreenProps) => {
  return (
    <div className={clsx('flex h-full w-full items-center justify-center bg-slate-950 text-slate-200', className)}>
      <div className="flex flex-col items-center gap-3">
        <span className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-brand" aria-hidden />
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{message}</p>
      </div>
    </div>
  );
};
