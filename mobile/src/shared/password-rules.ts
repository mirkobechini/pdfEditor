/** Chiave i18n della prima regola password violata, o null se valida. */
export function passwordRuleError(password: string): string | null {
    if (password.length < 8) return "auth.passwordTooShort";
    if (!/[A-Z]/.test(password)) return "auth.passwordMissingUppercase";
    if (!/[a-z]/.test(password)) return "auth.passwordMissingLowercase";
    if (!/[0-9]/.test(password)) return "auth.passwordMissingNumber";
    return null;
}
