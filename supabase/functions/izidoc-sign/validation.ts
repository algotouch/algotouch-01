
import { ContractSignRequest } from "./types.ts";

export function validateRequest(requestBody: ContractSignRequest): { isValid: boolean; missingFields?: string[] } {
  const { planId, email, signature, contractHtml, fullName } = requestBody;

  const missingFields = [];
  if (!planId) missingFields.push('planId');
  if (!email) missingFields.push('email');
  if (!signature) missingFields.push('signature');
  if (!contractHtml) missingFields.push('contractHtml');
  if (!fullName) missingFields.push('fullName');

  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}
