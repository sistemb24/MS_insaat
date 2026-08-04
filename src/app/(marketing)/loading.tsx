import { RouteLoadingState } from "@/components/ui/route-loading-state";

export default function MarketingLoading() {
  return (
    <RouteLoadingState
      description="Public ürün bilgileri hazırlanıyor."
      title="İçerik yükleniyor"
    />
  );
}
