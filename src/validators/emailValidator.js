/**
 * Validate email format (only letters/numbers + gmail.com)
 * @param {string} email
 * @returns {boolean} true if valid, false if invalid
 */
export const isValidEmail = (email) => {
  if (!email) return false;

  // Regex for format: letters/numbers only + @gmail.com
  const emailRegex = /^[a-zA-Z0-9]+@gmail\.com$/;
  return emailRegex.test(email.trim());
};

//    "email": "avijadhav431@gmail.com",
