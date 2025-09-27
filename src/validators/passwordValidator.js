const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

export const passwordValidate = (password) => {
  const normalizePassword = password.trim();
  const isPassValid = passwordRegex.test(normalizePassword);
  return isPassValid;
};
