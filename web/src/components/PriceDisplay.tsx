interface Props {
  price: string | null;
  regularPrice?: string | null;
  salePrice?: string | null;
  className?: string;
}

export default function PriceDisplay({ price, regularPrice, salePrice, className = "" }: Props) {
  const display = price ?? regularPrice ?? null;
  const isSale = salePrice && regularPrice && salePrice !== regularPrice;

  if (!display) return <span className={`text-gray-400 ${className}`}>—</span>;

  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-semibold text-gray-900">
        S${Number(isSale ? salePrice : display).toFixed(2)}
      </span>
      {isSale && (
        <span className="text-sm text-gray-400 line-through">
          S${Number(regularPrice).toFixed(2)}
        </span>
      )}
    </span>
  );
}
