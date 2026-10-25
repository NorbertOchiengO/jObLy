// Returns a list of problems with the environment (empty list = OK)
function envProblems(env = process.env) {
  const problems = [];
  if (!(env.MONGO_URI || env.MONGODB_URI)) problems.push('MONGO_URI is not set');
  const secret = env.JWT_SECRET || '';
  if (!secret) problems.push('JWT_SECRET is not set');
  else if (secret.length < 16 || /change-?me/i.test(secret)) problems.push('JWT_SECRET is too weak (use at least 16 random characters)');
  return problems;
}

module.exports = { envProblems };
