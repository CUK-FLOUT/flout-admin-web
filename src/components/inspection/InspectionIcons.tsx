// Figma의 편집 가능한 18px 달력/시계 도형을 같은 치수로 재현합니다.
export function CalendarIcon() {
  return (
    <span
      aria-hidden="true"
      className="relative block size-[18px] shrink-0 rounded-[3px] border-[1.5px] border-[#234f73]"
    >
      <span className="absolute left-[.5px] top-[3.5px] h-[1.5px] w-[14px] bg-[#234f73]" />
      {[3.5, 9.5].map((left) => (
        <span
          key={left}
          style={{ left }}
          className="absolute top-[-2.5px] h-1 w-[1.5px] rounded-[.75px] bg-[#234f73]"
        />
      ))}
      <span className="absolute left-[3.5px] top-[8.5px] size-[3px] rounded-[.5px] bg-[#234f73]" />
    </span>
  );
}

export function ClockIcon() {
  return (
    <span
      aria-hidden="true"
      className="relative block size-[18px] shrink-0 rounded-full border-[1.5px] border-[#234f73]"
    >
      <span className="absolute left-[6.75px] top-[2.5px] h-[5px] w-[1.5px] rounded-[.75px] bg-[#234f73]" />
      <span className="absolute left-[6.75px] top-[6.75px] h-[1.5px] w-1 rounded-[.75px] bg-[#234f73]" />
    </span>
  );
}
