import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ShoppingBag, Gem, Sparkles, Tag, AlertCircle } from "lucide-react";

interface ProductPrice {
  cny: number;
  usd: number;
}

interface Product {
  name: string;
  desc: string;
  price: ProductPrice;
  category: string;
  discountPercent?: number;
  discountedPrice?: ProductPrice;
}

interface ShopRecommendations {
  element: string;
  products: Product[];
  disclaimer: string;
}

const ELEMENT_STYLES: Record<string, { bg: string; text: string; badge: string; accent: string }> = {
  金: {
    bg: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    accent: "border-amber-300 dark:border-amber-700",
  },
  木: {
    bg: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20",
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    accent: "border-green-300 dark:border-green-700",
  },
  水: {
    bg: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    accent: "border-blue-300 dark:border-blue-700",
  },
  火: {
    bg: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    accent: "border-red-300 dark:border-red-700",
  },
  土: {
    bg: "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-stone-950/20",
    text: "text-yellow-800 dark:text-yellow-300",
    badge: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-200",
    accent: "border-yellow-400 dark:border-yellow-700",
  },
};

const DEFAULT_STYLE = ELEMENT_STYLES["水"];

function getElementStyle(element: string) {
  return ELEMENT_STYLES[element] || DEFAULT_STYLE;
}

function formatPrice(price: ProductPrice) {
  return `¥${price.cny}`;
}

function ProductCard({ product, element }: { product: Product; element: string }) {
  const style = getElementStyle(element);
  const hasDiscount = product.discountPercent && product.discountPercent > 0 && product.discountedPrice;

  return (
    <Card className={`overflow-hidden border ${style.accent} transition-shadow hover:shadow-md`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {product.category}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {product.desc}
        </p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {hasDiscount ? (
              <>
                <span className={`text-lg font-bold ${style.text}`}>
                  {formatPrice(product.discountedPrice!)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">
                  -{product.discountPercent}%
                </Badge>
              </>
            ) : (
              <span className={`text-lg font-bold ${style.text}`}>
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>

        <Button variant="outline" className="w-full" disabled>
          <Tag className="w-4 h-4 mr-2" />
          即将上线
        </Button>
      </CardContent>
    </Card>
  );
}

function ShopSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<ShopRecommendations>({
    queryKey: ["/api/shop/recommendations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/shop/recommendations");
      return res.json();
    },
    enabled: !!user,
  });

  const element = data?.element || "";
  const style = getElementStyle(element);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className={`rounded-xl bg-gradient-to-br ${element ? style.bg : ""} p-5`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${element ? style.badge : "bg-muted"}`}>
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                开运商城
              </h1>
              {element && (
                <Badge className={`mt-1 ${style.badge}`}>
                  <Gem className="w-3 h-3 mr-1" />
                  {element}命推荐
                </Badge>
              )}
            </div>
          </div>
          {element && (
            <p className="text-sm text-muted-foreground mt-3">
              根据您的五行属性，为您精选最适合的开运好物
            </p>
          )}
        </div>

        {/* Content */}
        {isLoading && <ShopSkeleton />}

        {error && (
          <Card>
            <CardContent className="p-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">加载推荐商品失败，请稍后重试</p>
            </CardContent>
          </Card>
        )}

        {data && data.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.products.map((product, idx) => (
              <ProductCard key={idx} product={product} element={element} />
            ))}
          </div>
        )}

        {data && data.products.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">暂无推荐商品</p>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        {data?.disclaimer && (
          <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
            {data.disclaimer}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
