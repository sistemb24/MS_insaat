ALTER TABLE "Vehicle"
ADD COLUMN "dispositionDate" DATE;

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_dispositionDate_after_acquisitionDate_check"
CHECK (
  "dispositionDate" IS NULL
  OR "acquisitionDate" IS NULL
  OR "dispositionDate" >= "acquisitionDate"
);
