/**
 * Validate email format (only letters/numbers + gmail.com)
 * @param {string} email
 * @returns {boolean} true if valid, false if invalid
 */
export const isValidEmailAndUsername = (email, username) => {
  if (!email && !username) return false;

  // Regex for format: letters/numbers only + @gmail.com
  const emailRegex = /^[a-zA-Z0-9]+@gmail\.com$/;
  const isEmailValid = emailRegex.test(email.trim());

  const usernameRegex = /^[a-z]+$/;

  const isUsernameValid = usernameRegex.test(username.trim());

  return { isEmailValid, isUsernameValid };
};

//    "email": "avijadhav431@gmail.com",
