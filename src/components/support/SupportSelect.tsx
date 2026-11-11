import FilterSelect from "../common/FilterSelect";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  review?: boolean;
};
export default function SupportSelect({
  label,
  value,
  options,
  onChange,
  className,
  disabled,
}: Props) {
  return (
    <FilterSelect
      label={label}
      value={value}
      options={options.map((value) => ({ value, label: value }))}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
}
