import { hashPassword } from "@/lib/auth";

function capitalizeFirstLetter(value: string) {
  const v = value.trim();
  if (!v) return v;
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function generateStudentCredentials(firstName: string, studentId: string) {
  const first = capitalizeFirstLetter(firstName);
  const id = studentId.trim();

  const username = `${first}${id}`;
  const password = `${first}@${id}`;

  return { username, password, firstName: first, studentId: id };
}

export async function hashStudentPassword(password: string) {
  return hashPassword(password);
}
