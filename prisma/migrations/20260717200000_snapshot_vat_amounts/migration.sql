ALTER TABLE "ConstructionPaymentItemSnapshot"
  ADD COLUMN "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "previousVatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "periodVatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cumulativeVatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "ConstructionPaymentItemSnapshot" AS snapshot
SET "vatRate" = item."vatRate",
    "periodVatAmount" = ROUND(snapshot."periodAmount" * item."vatRate" / 100, 2),
    "previousVatAmount" = ROUND(snapshot."previousAmount" * item."vatRate" / 100, 2),
    "cumulativeVatAmount" = ROUND(snapshot."cumulativeAmount" * item."vatRate" / 100, 2)
FROM "ConstructionContractItem" AS item
WHERE item."id" = snapshot."contractItemId";

UPDATE "ConstructionProgressPayment" AS payment
SET "periodVatTotal" = totals."periodVat",
    "cumulativeVatTotal" = totals."cumulativeVat"
FROM (
  SELECT "progressPaymentId", SUM("periodVatAmount") AS "periodVat", SUM("cumulativeVatAmount") AS "cumulativeVat"
  FROM "ConstructionPaymentItemSnapshot"
  GROUP BY "progressPaymentId"
) AS totals
WHERE payment."id" = totals."progressPaymentId";
