import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
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
    setEditing(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setTitle(p.title);
    setDescription(p.description || "");
    setPrice(p.price.toString());
    setImageFile(null);
    setImagePreview(p.image_url);
    setDialogOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSave() {
    if (!title || !price) {
      toast.error("Preencha título e preço");
      return;
    }
    setSaving(true);
    try {
      let image_url = editing?.image_url || "";

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      }

      if (editing) {
        const { error } = await supabase.from("products").update({
          title,
          description,
          price: parseFloat(price),
          image_url,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("products").insert({
          title,
          description,
          price: parseFloat(price),
          image_url,
        });
        if (error) throw error;
        toast.success("Produto adicionado!");
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
    if (!confirm("Tem certeza que quer excluir?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Produto excluído!");
    fetchProducts();
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{products.length} produtos</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-accent" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Pão de Queijo" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição curta" rows={2} />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="5.00" />
              </div>
              <div>
                <Label>Imagem</Label>
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFileChange} />
                <div
                  className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-md" />
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-1" />
                      <p className="text-xs">Clique para enviar imagem</p>
                    </div>
                  )}
                </div>
              </div>
              <Button className="w-full btn-accent" onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-card rounded-lg p-3 flex items-center gap-3 shadow-sm border border-border">
            <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">🍽️</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.title}</p>
              <p className="text-accent font-bold text-sm">R${p.price.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
