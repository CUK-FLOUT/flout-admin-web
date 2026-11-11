import FilterSelect from "../common/FilterSelect";
import type {
  EditableStatus,
  InspectionStatus,
} from "../../pages/Inspection/mockData";
import { inspectionStatuses } from "../../pages/Inspection/mockData";

type Props = {
  value: InspectionStatus;
  disabled?: boolean;
  onChange: (status: EditableStatus) => void;
};
export default function StatusDropdown({
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <FilterSelect
      id="inspection-status"
      label="점검 상태"
      value={value}
      disabled={disabled}
      className="flex-1"
      options={inspectionStatuses.map((value) => ({ value, label: value }))}
      onChange={(next) => {
        const status = inspectionStatuses.find((status) => status === next);

        if (status) onChange(status);
      }}
    />
  );
}
