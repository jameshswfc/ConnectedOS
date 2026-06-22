import bcrypt from "bcryptjs";

const passwordRuleMessage = "Password must be at least 10 characters and contain at least one letter and one number.";
const saltRounds = 12;

export function validatePasswordRules(password: string) {
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(passwordRuleMessage);
  }
}

export async function hashPassword(password: string) {
  validatePasswordRules(password);
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export function assertPasswordConfirmation(password: string, confirmPassword: string) {
  if (password !== confirmPassword) {
    throw new Error("Password confirmation does not match.");
  }
}

export function passwordRulesText() {
  return passwordRuleMessage;
}
