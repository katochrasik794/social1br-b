import * as adminsRepo from "../../db/admins.repository.js";
import { verifyPassword } from "../../utils/password.js";
import { signToken } from "../../utils/jwt.js";
import { AppError } from "../../utils/response.js";

function serializeAdmin(admin: { id: string; email: string; role: string; created_at: Date }) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    createdAt: admin.created_at,
  };
}

export async function loginAdmin(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();

  const admin = await adminsRepo.findAdminByEmail(email);
  if (!admin) throw new AppError("Invalid email or password", 401);

  const valid = await verifyPassword(input.password, admin.password_hash);
  if (!valid) throw new AppError("Invalid email or password", 401);

  const token = signToken({
    sub: admin.id,
    type: "admin",
    role: admin.role,
  });

  return { token, admin: serializeAdmin(admin) };
}

export async function getAdminById(id: string) {
  const admin = await adminsRepo.findAdminById(id);
  if (!admin) throw new AppError("Admin not found", 404);
  return serializeAdmin(admin);
}
