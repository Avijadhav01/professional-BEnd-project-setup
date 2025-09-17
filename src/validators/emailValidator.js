export const isValidEmailAndUsername = (email, username) => {
  if (!email && !username) return false;

  // force lowercase before validation (to avoid case-sensitivity issues)
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  // Regex for format: only lowercase letters/numbers + @gmail.com
  const emailRegex = /^[a-z0-9]+@gmail\.com$/;
  const isEmailValid = emailRegex.test(normalizedEmail);

  // Username: allow lowercase letters + numbers only
  const usernameRegex = /^[a-z0-9]+$/;
  const isUsernameValid = usernameRegex.test(normalizedUsername);

  return { isEmailValid, isUsernameValid };
};
