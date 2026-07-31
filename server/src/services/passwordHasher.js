import bcrypt from "bcrypt";

// bcrypt's recommended default balances brute-force resistance and latency.
const SALT_ROUNDS = 10;

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export { hashPassword };
