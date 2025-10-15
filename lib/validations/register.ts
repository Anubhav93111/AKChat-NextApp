import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "Name must be of atleast 2 characters").max(20, "Name must be of atmost 20 characters"),
  email: z
    .string()
    .email("Invalid email format")
    .regex(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Email must be a valid format"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});