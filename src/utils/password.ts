// This is a simplified password utility
// In a real application, you would use a proper password hashing library

export function hash(password: string): string {
  // In a real app, use a proper hashing algorithm
  // For simplicity, we'll just use a basic approach here
  // DO NOT use this in production!
  return password + "_hashed";
}

export function verifyPassword(input: string, hashedPassword: string): boolean {
  // In a real app, use proper password verification
  // For simplicity, we'll just use a basic approach here
  // DO NOT use this in production!
  return hash(input) === hashedPassword;
}
