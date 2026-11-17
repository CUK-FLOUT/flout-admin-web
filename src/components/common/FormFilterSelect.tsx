import { useEffect, useRef, useState } from "react";
import FilterSelect from "./FilterSelect";
import type { FilterOption } from "./FilterSelect";

type Props = {
  name: string;
  label: string;
  defaultValue: string;
  options: FilterOption[];
  className: string;
};
export default function FormFilterSelect({
  name,
  defaultValue,
  className,
  ...props
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = root.current?.closest("form");
    const reset = () => setValue(defaultValue);

    form?.addEventListener("reset", reset);

    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue]);

  return (
    <div ref={root} className={className}>
      <input type="hidden" name={name} value={value} />
      <FilterSelect
        {...props}
        className="w-full"
        value={value}
        onChange={setValue}
      />
    </div>
  );
}
