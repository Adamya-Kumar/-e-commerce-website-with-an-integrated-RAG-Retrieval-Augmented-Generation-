import Skeleton from '../ui/Skeleton.jsx';

export default function ListingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-xl bg-card p-4 shadow-spark-md">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-4 h-7 w-1/2" />
          <Skeleton className="mt-4 h-10 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
