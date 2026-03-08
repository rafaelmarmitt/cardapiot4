import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
}

export default function ProductCard({ id, title, description, price, image_url, stock }: Props) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleAdd() {
    if (!user) {
      toast.error("Faça login para adicionar itens ao carrinho");
      navigate("/login");
      return;
    }
    addItem({ id, title, price, image_url });
    toast.success(`${title} adicionado ao carrinho`);
  }

  return (
    <div className="group bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-up">
      <div className="aspect-[4/3] bg-secondary overflow-hidden">
        {image_url ? (
          <img src={image_url} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <span className="font-display text-lg font-bold text-muted-foreground">{title.charAt(0)}</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm truncate">{title}</h3>
        {description && <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{description}</p>}
        <div className="flex items-center justify-between mt-2.5">
          <span className="font-display font-bold text-base text-foreground">
            R${price.toFixed(2).replace('.', ',')}
          </span>
          <Button variant="accent" size="sm" className="h-8 px-3 text-xs rounded-lg" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
