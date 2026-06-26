import { Star } from "lucide-react";

interface Props {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
}

export default function StarRating({ rating, max = 5, size = 16, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
        />
      ))}
    </span>
  );
}
