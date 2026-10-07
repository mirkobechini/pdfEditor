import { passwordRuleError } from "../src/shared/password-rules";
import { mapError } from "../src/shared/error-map";

describe("passwordRuleError", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordRuleError("Ab1")).toBe("auth.passwordTooShort");
    expect(passwordRuleError("Abcde12")).toBe("auth.passwordTooShort");
  });
  it("reports the first missing rule", () => {
    expect(passwordRuleError("password123")).toBe("auth.passwordMissingUppercase");
    expect(passwordRuleError("PASSWORD123")).toBe("auth.passwordMissingLowercase");
    expect(passwordRuleError("Passwordabc")).toBe("auth.passwordMissingNumber");
  });
  it("accepts a valid password", () => {
    expect(passwordRuleError("Password123")).toBeNull();
  });
});

describe("mapError backend password messages", () => {
  it("maps uppercase/lowercase/number errors", () => {
    expect(mapError("Password must contain at least one uppercase letter")).toBe(
      "auth.passwordMissingUppercase",
    );
    expect(mapError("Password must contain at least one lowercase letter")).toBe(
      "auth.passwordMissingLowercase",
    );
    expect(mapError("Password must contain at least one number")).toBe(
      "auth.passwordMissingNumber",
    );
  });
});
