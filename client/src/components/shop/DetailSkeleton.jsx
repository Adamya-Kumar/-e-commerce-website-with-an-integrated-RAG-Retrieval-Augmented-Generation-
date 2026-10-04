import Skeleton from '../ui/Skeleton.jsx';

export default function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
      <div>
        <Skeleton className="aspect-square w-full" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="aspect-[4/3] w-full" />
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-4/5" />
        <Skeleton className="mt-3 h-4 w-1/3" />
        <Skeleton className="mt-6 h-10 w-40" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-6 h-10 w-32" />
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
