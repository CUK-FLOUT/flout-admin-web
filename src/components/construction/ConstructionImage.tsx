import StoredImage from "../common/StoredImage";
import { readConstructionPhoto } from "../../pages/Construction/photos";

export default function ConstructionImage({
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
      readPhoto={readConstructionPhoto}
      placeholderTextClassName="text-xs"
    />
  );
}
