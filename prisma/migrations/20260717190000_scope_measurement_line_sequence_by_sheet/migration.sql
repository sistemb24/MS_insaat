DROP INDEX "ConstructionMeasurementLine_payment_line_key";
CREATE UNIQUE INDEX "ConstructionMeasurementLine_payment_sheet_line_key" ON "ConstructionMeasurementLine"("progressPaymentId", "measurementSheetId", "lineNo");
