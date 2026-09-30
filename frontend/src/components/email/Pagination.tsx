import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons/icons";

type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

const button =
  "flex size-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-field disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent";

export function Pagination({
  total,
  limit,
  offset,
  disabled,
  onPageChange,
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const page = Math.floor(offset / limit);
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  const hasPrevious = page > 0;
  const hasNext = offset + limit < total;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-2 px-4 py-3 text-xxs text-muted sm:px-6"
    >
      <span aria-live="polite">
        {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of{" "}
        {total.toLocaleString("en-US")}
      </span>
      <button
        type="button"
        aria-label="Previous page"
        className={button}
        disabled={disabled || !hasPrevious}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next page"
        className={button}
        disabled={disabled || !hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}
