import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hash } from "~/utils/password";

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("User already exists");
      }      // Create user with hashed password
      const hashedPassword = hash(input.password);
      
      // In a real app, you would add a passwordHash field to the User model
      // For now, we're just creating a user with the password field
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
        },
      });

      return { success: true };
    }),
});
