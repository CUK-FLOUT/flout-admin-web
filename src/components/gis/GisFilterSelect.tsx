import FilterSelect from "../common/FilterSelect";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  className: string;
  onChange: (value: string) => void;
};
export default function GisFilterSelect({
  placeholder,
  options,
  ...props
}: Props) {
  return (
    <FilterSelect
      {...props}
      options={[
        { value: "", label: placeholder },
        ...options.map((value) => ({ value, label: value })),
      ]}
    />
  );
}
