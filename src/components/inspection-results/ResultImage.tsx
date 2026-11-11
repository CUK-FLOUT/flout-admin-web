import StoredImage from "../common/StoredImage";
import { readPhoto } from "../../pages/InspectionResults/photos";

export default function ResultImage({
  source,
  alt,
  className,
}: {
  source: string;
  alt: string;
  className: string;
}) {
  return (
    <StoredImage
      source={source}
      alt={alt}
      className={className}
      readPhoto={readPhoto}
      placeholderTextClassName="text-sm"
    />
  );
}
