import { onlyDigits } from "@/lib/validation/cpf";

/**
 * A Brazilian phone as the trainer types it: "(11) 98765-4321" (11 digits) or "(11) 3456-7890"
 * (10). The value sent is the digits only; this is just how the field reads.
 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length === 0 ? "" : `(${digits}`;
  const area = `(${digits.slice(0, 2)}) `;
  const rest = digits.slice(2);
  const split = digits.length === 11 ? 5 : 4;
  return rest.length <= split ? area + rest : `${area}${rest.slice(0, split)}-${rest.slice(split)}`;
}
