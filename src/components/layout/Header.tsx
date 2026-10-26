import profile from "../../assets/layout/profile.png";

export default function Header() {
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <header className="flex min-h-[68px] shrink-0 flex-wrap items-center justify-end gap-3 border-b border-[#c8d0d7] bg-white px-6 py-3 text-[15px] leading-5">
      <span className="max-sm:hidden">업무일자: {date}</span>

      <span
        aria-hidden="true"
        className="h-4 w-px bg-[#f4f5f6] max-sm:hidden"
      />

      <span>관할 부천시</span>

      <span aria-hidden="true" className="h-4 w-px bg-[#f4f5f6]" />

      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f4f5f6]">
          <img src={profile} alt="" width={24} height={24} />
        </span>
        고담당
      </span>
    </header>
  );
}
