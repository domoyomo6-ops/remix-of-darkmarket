import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    short_description: string | null;
    price: number;
    category: string;
    image_url: string | null;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="group cursor-pointer card-3d panel-3d rounded-lg overflow-hidden"
    >
      {/* Image */}
      <div className="aspect-video relative overflow-hidden bg-background">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-primary/30" />
          </div>
        )}
        
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,255,150,0.1)_1px,transparent_1px)] bg-[size:100%_3px]" />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Holographic edge effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-xs uppercase font-mono border-primary/30 text-primary/80 raised"
          >
            TYPE://{product.category}
          </Badge>
          <span className="text-primary font-bold font-mono terminal-glow">${product.price}</span>
        </div>

        <h3 className="font-mono font-semibold text-primary group-hover:terminal-glow transition-all line-clamp-1 mb-1">
          {'>'} {product.title}
        </h3>

        {product.short_description && (
          <p className="text-sm text-muted-foreground font-mono line-clamp-2">
            {product.short_description}
          </p>
        )}
      </div>
    </div>
  );
}
