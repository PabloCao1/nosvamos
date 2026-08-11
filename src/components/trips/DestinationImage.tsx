import { useCityImage } from "../../hooks/useCityImage";
import { Icon } from "../ui/Icon";

export function DestinationImage({
  city,
  country,
  imageUrl,
}: {
  city: string;
  country?: string;
  imageUrl?: string;
}) {
  const { data } = useCityImage(city, country, !imageUrl);
  const source = imageUrl || data?.url;
  return source
    ? <img src={source} alt={`Vista de ${city}`} loading="lazy" />
    : <div className="destination-image-placeholder"><Icon name="location" size={25} /></div>;
}
