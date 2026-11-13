type Props = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  label = "목록 페이지",
  className = "",
}: Props) {
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) return null;
  const current = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const count = Math.min(3, totalPages);
  const first = Math.max(1, Math.min(current - 1, totalPages - count + 1));
  const numbers = Array.from({ length: count }, (_, index) => first + index);
  const changePage = (next: number) => {
    if (disabled || next === current || next < 1 || next > totalPages) return;
    onPageChange(next);
  };

  const button =
    "grid size-7 shrink-0 place-items-center rounded-md border text-[13px] leading-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] enabled:cursor-pointer disabled:cursor-default disabled:opacity-40";
  const inactive =
    "border-[#c8d0d7] bg-white text-[#202b36] enabled:hover:bg-[#f4f5f6]";

  return (
    <nav
      aria-label={label}
      className={`flex min-h-11 shrink-0 items-center justify-center gap-[6px] ${className}`}
    >
      <span className="sr-only">전체 {totalPages}페이지</span>
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={disabled || current <= 1}
        onClick={() => changePage(Math.min(current - 1, totalPages))}
        className={`${button} ${inactive}`}
      >
        ‹
      </button>
      {numbers.map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`${number}페이지`}
          aria-current={number === current ? "page" : undefined}
          disabled={disabled}
          onClick={() => changePage(number)}
          className={`${button} ${number === current ? "border-[#234f73] bg-[#234f73] font-bold text-white" : inactive}`}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        aria-label="다음 페이지"
        disabled={disabled || current >= totalPages}
        onClick={() => changePage(current + 1)}
        className={`${button} ${inactive}`}
      >
        ›
      </button>
    </nav>
  );
}
