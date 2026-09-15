// Phone verification — swappable provider. No real SMS in this prototype.
// The mock provider "sends" a fixed code and logs it; a real provider would
// integrate Twilio/Vonage behind the same interface.

export interface PhoneProvider {
  sendCode(phone: string, code: string): Promise<void>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}

export const MOCK_VERIFICATION_CODE = "123456";

class MockPhoneProvider implements PhoneProvider {
  async sendCode(phone: string, code: string): Promise<void> {
    // No real SMS. Log the code so the demo flow is observable.
    console.log(`[phone:mock] verification code for ${phone}: ${code}`);
  }

  async verifyCode(_phone: string, code: string): Promise<boolean> {
    return code === MOCK_VERIFICATION_CODE;
  }
}

// Provider selection is configurable via env; defaults to the mock provider.
export function getPhoneProvider(): PhoneProvider {
  const provider = process.env.PHONE_PROVIDER ?? "mock";
  switch (provider) {
    case "mock":
      return new MockPhoneProvider();
    default:
      throw new Error(`Unknown phone provider: ${provider}`);
  }
}

export function generateVerificationCode(): string {
  return MOCK_VERIFICATION_CODE;
}
