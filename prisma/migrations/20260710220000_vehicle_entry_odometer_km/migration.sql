ALTER TABLE "Vehicle"
ADD COLUMN "entryOdometerKm" INTEGER;

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_entryOdometerKm_nonnegative_check"
CHECK ("entryOdometerKm" IS NULL OR "entryOdometerKm" >= 0);
