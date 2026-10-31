import StoredImage from "../common/StoredImage";
import { readInfrastructurePhoto } from "../../pages/Infrastructure/photos";

export default function InfrastructureImage({
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
      readPhoto={readInfrastructurePhoto}
      placeholderTextClassName="text-xs"
    />
  );
}
