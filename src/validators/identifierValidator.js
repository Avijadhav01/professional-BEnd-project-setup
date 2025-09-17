export const isValidIdentifier = (identifier) => {
  if (!identifier) return { isValid: false, type: null };

  // Normalize (trim + lowercase)
  const normalized = identifier.trim().toLowerCase();

  // Email regex: lowercase letters/numbers only + @gmail.com
  const emailRegex = /^[a-z0-9]+@gmail\.com$/;

  // Username regex: lowercase letters + numbers only
  const usernameRegex = /^[a-z0-9]+$/;

  if (emailRegex.test(normalized)) {
    return { isValid: true, type: "email" };
  }

  if (usernameRegex.test(normalized)) {
    return { isValid: true, type: "username" };
  }

  return { isValid: false, type: null };
};
