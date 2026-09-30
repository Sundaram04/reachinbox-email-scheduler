export function EmailListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul aria-label="Loading emails" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex animate-pulse flex-col gap-2 border-b border-line px-4 py-3 sm:grid sm:grid-cols-[11rem_9.5rem_minmax(0,1fr)] sm:items-center sm:gap-x-4 sm:px-6 md:grid-cols-[14rem_9.5rem_minmax(0,1fr)] lg:grid-cols-[16rem_9.5rem_minmax(0,1fr)]"
        >
          <span className="h-3 w-32 rounded bg-chip" />
          <span className="h-5 w-28 rounded-full bg-chip" />
          <span className="h-3 w-3/4 max-w-md rounded bg-chip" />
        </li>
      ))}
    </ul>
  );
}
