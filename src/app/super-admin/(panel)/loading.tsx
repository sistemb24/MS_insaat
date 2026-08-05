import { RouteLoadingState } from "@/components/ui/route-loading-state";

export default function SuperAdminLoading() {
  return (
    <RouteLoadingState
      description="Salt-okunur platform görünümü hazırlanıyor."
      title="Yönetim görünümü yükleniyor"
    />
  );
}
