export const developmentInitialAdminPassword = "ConnectedOS123";

type InitialAdminPasswordInput = {
  existingPasswordHash?: string | null;
  envPassword?: string | null;
};

type InitialAdminPasswordDecision = {
  password: string | null;
  shouldSetPassword: boolean;
  mustChangePassword: boolean;
};

export function resolveInitialAdminPassword(input: InitialAdminPasswordInput): InitialAdminPasswordDecision {
  const envPassword = input.envPassword?.trim();

  if (envPassword) {
    return {
      password: envPassword,
      shouldSetPassword: true,
      mustChangePassword: false
    };
  }

  if (!input.existingPasswordHash) {
    return {
      password: developmentInitialAdminPassword,
      shouldSetPassword: true,
      mustChangePassword: true
    };
  }

  return {
    password: null,
    shouldSetPassword: false,
    mustChangePassword: false
  };
}
