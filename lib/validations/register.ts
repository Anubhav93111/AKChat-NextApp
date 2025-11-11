import { z } from "zod";

export const registerSchema = z.object({
  // name: at least 6 characters, no spaces
  name: z
    .string()
    .min(6, "Name must be at least 6 characters")
    .max(20, "Name must be at most 20 characters")
    .regex(/^\S+$/, "Name must not contain spaces"),

  email: z
    .string()
    .email("Invalid email format")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Email must be a valid format"),

  // password: at least 6 chars, must contain at least one lowercase and one uppercase, and no spaces
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])\S{6,}$/, "Password must contain at least one lowercase and one uppercase letter and have no spaces"),
});