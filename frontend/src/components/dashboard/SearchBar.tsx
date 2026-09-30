import { SearchIcon, XIcon } from "@/components/icons/icons";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-field px-4 text-muted focus-within:outline-2 focus-within:outline-brand">
      <SearchIcon className="size-3.5 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("");
          }
        }}
        placeholder="Search"
        aria-label="Search emails"
        className="min-w-0 flex-1 bg-transparent text-row text-ink outline-none placeholder:text-muted"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-chip"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </label>
  );
}
