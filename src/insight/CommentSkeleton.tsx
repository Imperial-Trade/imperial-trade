import { Skeleton } from "@/components/ui/skeleton";

export const CommentSkeleton = () => {
  return (
    <div className="flex gap-3 p-4 border-b">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
};

export const CommentListSkeleton = ({ count = 2 }: { count?: number }) => {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, index) => (
        <CommentSkeleton key={index} />
      ))}
    </div>
  );
};