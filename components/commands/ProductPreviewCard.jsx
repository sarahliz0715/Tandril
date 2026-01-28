import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MockProduct } from '@/lib/entities';

export default function ProductPreviewCard({ productId }) {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const productData = await MockProduct.get(productId);
          setProduct(productData);
        } catch (error) {
          console.error("Failed to fetch mock product:", error);
          setProduct(null); // Set to null on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    } else {
        setIsLoading(false);
        setProduct(null);
    }
  }, [productId]);

  if (isLoading) {
    return (
        <Card className="overflow-hidden bg-white/80 border border-slate-200/80">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full mt-1" />
            </CardContent>
        </Card>
    );
  }

  if (!product) {
    return null; // Don't render anything if no product or error
  }

  return (
    <div className="my-4">
        <h4 className="font-bold text-slate-900 mb-3">Product Preview</h4>
        <Card className="overflow-hidden bg-white/80 border border-slate-200/80 shadow-sm">
            <div className="grid md:grid-cols-3">
                <div className="md:col-span-1">
                    <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
                </div>
                <div className="md:col-span-2">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{product.name}</h3>
                        <p className="text-2xl font-light text-slate-800 mb-4">${product.price.toFixed(2)}</p>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{product.description}</p>
                        <div className="flex flex-wrap gap-2">
                            {product.tags?.map(tag => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                        </div>
                    </CardContent>
                </div>
            </div>
        </Card>
    </div>
  );
}