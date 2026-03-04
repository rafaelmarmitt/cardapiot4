import { Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export default function ProductCard({ id, title, description, price, image_url }: Props) {
  const { addItem } = useCart();

  function handleAdd() {
    addItem({ id, title, price, image_url });
    toast.success(`${title} adicionado ao carrinho!`);
  }

  return (
    <div className="card-product animate-fade-in">
      <div className="aspect-square bg-muted overflow-hidden">
        {image_url ? (
          <img src={image_url} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-base truncate">{title}</h3>
        {description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{description}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="font-display font-bold text-lg text-accent">
            R${price.toFixed(2).replace('.', ',')}
          </span>
          <Button size="sm" className="btn-accent h-8 px-3 text-xs" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
