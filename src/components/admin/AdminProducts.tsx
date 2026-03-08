import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ImageIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  cost_price: number;
  image_url: string | null;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  function openCreate() {
    setEditing(null); setTitle(""); setDescription(""); setPrice(""); setCostPrice(""); setStock(""); setImageFile(null); setImagePreview(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p); setTitle(p.title); setDescription(p.description || ""); setPrice(p.price.toString()); setCostPrice(p.cost_price?.toString() || "0"); setStock((p as any).stock?.toString() || "0");
    setImageFile(null); setImagePreview(p.image_url);
    setDialogOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  }

  async function handleSave() {
    if (!title || !price) { toast.error("Preencha título e preço"); return; }
    setSaving(true);
    try {
      let image_url = editing?.image_url || "";
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }
      if (editing) {
        const { error } = await supabase.from("products").update({ title, description, price: parseFloat(price), cost_price: parseFloat(costPrice || "0"), stock: parseInt(stock || "0"), image_url } as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert({ title, description, price: parseFloat(price), cost_price: parseFloat(costPrice || "0"), stock: parseInt(stock || "0"), image_url } as any);
        if (error) throw error;
        toast.success("Produto adicionado");
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Produto excluído");
    fetchProducts();
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{products.length} produtos</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pão de Queijo" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição curta" rows={2} className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium">Preço (R$)</Label>
                  <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="10.00" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Custo (R$)</Label>
                  <Input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="5.00" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Estoque</Label>
                  <Input type="number" step="1" value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Imagem</Label>
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFileChange} />
                <div
                  className="mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                  ) : (
                    <div className="text-muted-foreground py-2">
                      <ImageIcon className="h-8 w-8 mx-auto mb-1.5 opacity-50" />
                      <p className="text-xs">Clique para enviar imagem</p>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="accent" className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border">
            <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display font-bold text-muted-foreground text-sm">{p.title.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-sm truncate">{p.title}</p>
              <p className="text-muted-foreground text-xs">R${p.price.toFixed(2).replace('.', ',')} · Custo R${(p.cost_price ?? 0).toFixed(2).replace('.', ',')} · Estoque: {(p as any).stock ?? 0}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(p)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
