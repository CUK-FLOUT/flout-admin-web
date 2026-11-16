import { Link } from "react-router-dom";
import type { InspectionResultReturn } from "../../pages/Inspection/resultNavigation";

export default function InspectionReturnLink({
  to,
  label,
  blocked = false,
}: InspectionResultReturn & { blocked?: boolean }) {
  return (
    <Link
      to={to}
      aria-disabled={blocked}
      tabIndex={blocked ? -1 : undefined}
      onClick={(event) => {
        if (blocked) event.preventDefault();
      }}
      className="mb-3 inline-flex min-h-10 items-center gap-2 rounded text-sm font-medium text-[#234f73] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234f73] aria-disabled:cursor-wait aria-disabled:text-[#64748b]"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
