import { SurfaceState } from "./surface-state";

export function RouteLoadingState({
  description = "Güncel veriler hazırlanıyor.",
  title = "Sayfa yükleniyor",
}: {
  description?: string;
  title?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" data-route-state="loading">
      <SurfaceState description={description} kind="loading" title={title} />
    </div>
  );
}
