import { RouteLoadingState } from "@/components/ui/route-loading-state";

export default function ModuleLoading() {
  return (
    <RouteLoadingState
      description="Tenant kapsamlı modül verileri hazırlanıyor."
      title="Modül yükleniyor"
    />
  );
}
