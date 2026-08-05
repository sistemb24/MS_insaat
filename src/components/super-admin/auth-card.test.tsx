/**
 * @vitest-environment jsdom
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { render } from "@testing-library/react";
import { SuperAdminAuthCard } from "./auth-card";

// Feature: super-admin-authentication, Property 8: role="alert" presence
// Validates: Requirements 1.10
describe("SuperAdminAuthCard", () => {
  it("children içindeki role=alert elementleri screen reader tarafından duyurulabilir", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorMessage) => {
          const { container } = render(
            <SuperAdminAuthCard title="Test">
              <p role="alert">{errorMessage}</p>
            </SuperAdminAuthCard>,
          );
          const alerts = container.querySelectorAll('[role="alert"]');
          return alerts.length > 0 && alerts[0]!.textContent === errorMessage;
        },
      ),
      { numRuns: 100 },
    );
  });
});
