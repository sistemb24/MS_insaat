ALTER TABLE "ConstructionMeasurementLine"
  DROP CONSTRAINT "ConstructionMeasurementLine_sheet_fkey";

ALTER TABLE "ConstructionMeasurementLine"
  ADD CONSTRAINT "ConstructionMeasurementLine_sheet_fkey"
  FOREIGN KEY ("measurementSheetId") REFERENCES "ConstructionMeasurementSheet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
