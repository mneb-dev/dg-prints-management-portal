const PH_MOBILE_PHONE_REGEX = /^(?:\+63|63|0)9\d{9}$/

export function isValidPhMobileNumber(value: string): boolean {
  return PH_MOBILE_PHONE_REGEX.test(value.replace(/[\s-]/g, ""))
}
