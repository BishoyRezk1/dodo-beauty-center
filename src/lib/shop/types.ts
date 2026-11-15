export type ShopProductView = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  comparePrice: number | null;
  discountPercent: number;
  stock: number;
  inStock: boolean;
  lowStock: boolean;
};
