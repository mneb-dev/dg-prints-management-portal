import { isValidPhMobileNumber } from "@/lib/phone"
import { formatCurrency } from "@/lib/utils"

export { isValidPhMobileNumber }

/** "{Field} is required." — the one phrasing for every required check: text inputs, selects,
 *  toggle groups, comboboxes. */
export function requiredMessage(fieldLabel: string): string {
  return `${fieldLabel} is required.`
}

/** "{Field} must be {max} characters or fewer." */
export function maxLengthMessage(fieldLabel: string, max: number): string {
  return `${fieldLabel} must be ${max} characters or fewer.`
}

/** "Enter a {fieldLabel} greater than ₱0." — says exactly what's wrong, unlike "Enter a valid
 *  price." */
export function positiveAmountMessage(fieldLabel: string = "price"): string {
  return `Enter a ${fieldLabel} greater than ₱0.`
}

/** Parses a price/amount input string; returns the number if finite and > 0, else null. */
export function parsePositiveAmount(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

/** "Enter a down payment greater than ₱0 and less than the order total of ₱X,XXX." */
export function downPaymentRangeMessage(total: number): string {
  return `Enter a down payment greater than ₱0 and less than the order total of ${formatCurrency(total)}.`
}

/** Shared wording for the one phone-format rule in the app; pairs with isValidPhMobileNumber. */
export const PHONE_FORMAT_MESSAGE = "Enter a valid PH mobile number (e.g. 0917 123 4567)."

// ---- Password strength ----

export const PASSWORD_MIN_LENGTH = 8
const PASSWORD_LOWERCASE_REGEX = /[a-z]/
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/
const PASSWORD_DIGIT_REGEX = /\d/
const PASSWORD_SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/

export const PASSWORD_REQUIREMENTS_DESCRIPTION =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character."

/** Returns the first unmet password requirement's message, or null if the password satisfies
 *  all of them. */
export function passwordRequirementMessage(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!PASSWORD_LOWERCASE_REGEX.test(password)) return "Password must include a lowercase letter."
  if (!PASSWORD_UPPERCASE_REGEX.test(password)) return "Password must include an uppercase letter."
  if (!PASSWORD_DIGIT_REGEX.test(password)) return "Password must include a number."
  if (!PASSWORD_SPECIAL_CHAR_REGEX.test(password)) return "Password must include a special character."
  return null
}

export const PASSWORDS_DO_NOT_MATCH_MESSAGE = "Passwords do not match."

// ---- Payment amount (shared by record-payment-dialog.tsx, payment-fields.tsx's
// PaymentAmountDialog, and order-form.tsx's own submit-time validation) ----

export interface PaymentAmountErrors {
  method?: string
  downPayment?: string
}

export function validatePaymentAmount(input: {
  effectiveMethod: string
  downPaymentInput: string
  targetStatus: "paid" | "partially_paid"
  total: number
}): PaymentAmountErrors {
  const errors: PaymentAmountErrors = {}
  if (!input.effectiveMethod) errors.method = requiredMessage("Payment method")
  if (input.targetStatus === "partially_paid") {
    const value = Number(input.downPaymentInput)
    if (!Number.isFinite(value) || value <= 0 || value >= input.total) {
      errors.downPayment = downPaymentRangeMessage(input.total)
    }
  }
  return errors
}

// ---- Bespoke, multi-field/business-rule messages (centralized so every call site shares one
// literal; no signature needed since they take no parameters) ----

export const REQUIRED_OPTIONS_MESSAGE = "Select all required options."
export const PRICING_INCOMPLETE_MESSAGE = "Complete the pricing fields for this product."
export const PRICING_NO_VARIANTS_MESSAGE = "Add at least one variation with values."
export const PRICING_INCOMPLETE_VARIANTS_MESSAGE =
  "Enter a price greater than ₱0 for every variant combination."
export const PRODUCT_INACTIVE_MESSAGE =
  "This product is inactive and can't be used for new or updated orders."
export const NOTES_REQUIRED_WHEN_FEES_MESSAGE =
  "Notes are required when additional fees are greater than ₱0."
