// 04 화면에서 반복 사용하는 Tailwind 유틸리티 조합입니다.
export const inspectionPanel =
  "h-[calc(100dvh_-_317px)] min-h-[360px] max-[1101px]:h-[583px]";

export const inspectionCheckbox =
  "grid size-[18px] shrink-0 cursor-pointer appearance-none place-content-center rounded-[4px] border border-[#234f73] bg-white checked:border-[#234f73] checked:bg-[#234f73] checked:after:text-[12px] checked:after:font-bold checked:after:leading-[17px] checked:after:text-white checked:after:content-['✓']";

export const inspectionFocus =
  "[&_:is(button,input,select):focus-visible]:outline-2 [&_:is(button,input,select):focus-visible]:outline-offset-2 [&_:is(button,input,select):focus-visible]:outline-[#234f73]";

export const inspectionDate =
  "[&::-webkit-calendar-picker-indicator]:w-[10px] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-65";
