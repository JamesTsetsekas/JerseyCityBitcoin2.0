import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const reactionTypes = ["LIKE", "LOVE", "LAUGH", "WOW", "SAD", "ANGRY"] as const;

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1),
      body: z.string().min(1),
      photoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          name: input.name,
          body: input.body,
          photoUrl: input.photoUrl,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.post.findFirst({
      orderBy: { createdAt: "desc" },
      where: { createdBy: { id: ctx.session.user.id } },
    });

    return post ?? null;
  }),

  getAllPosts: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: {
            name: true,
            id: true,
            image: true,
          },
        },
        replies: {
          include: {
            createdBy: {
              select: {
                name: true,
                id: true,
                image: true,
              },
            },
            reactions: {
              include: {
                createdBy: {
                  select: {
                    name: true,
                    id: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        reactions: {
          include: {
            createdBy: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
      },
    });
  }),

  createReply: protectedProcedure
    .input(z.object({ 
      postId: z.number(),
      content: z.string().min(1),
      photoUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.reply.create({
        data: {
          content: input.content,
          photoUrl: input.photoUrl,
          post: { connect: { id: input.postId } },
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
    
  reactToPost: protectedProcedure
    .input(z.object({ 
      postId: z.number(),
      type: z.enum(reactionTypes),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if reaction already exists
      const existingReaction = await ctx.db.reaction.findFirst({
        where: {
          postId: input.postId,
          createdById: ctx.session.user.id,
          type: input.type,
        },
      });
      
      // If exists, delete it (toggle off)
      if (existingReaction) {
        return ctx.db.reaction.delete({
          where: { id: existingReaction.id },
        });
      }
      
      // Otherwise create a new reaction
      return ctx.db.reaction.create({
        data: {
          type: input.type,
          post: { connect: { id: input.postId } },
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
    
  reactToReply: protectedProcedure
    .input(z.object({ 
      replyId: z.number(),
      type: z.enum(reactionTypes),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if reaction already exists
      const existingReaction = await ctx.db.reaction.findFirst({
        where: {
          replyId: input.replyId,
          createdById: ctx.session.user.id,
          type: input.type,
        },
      });
      
      // If exists, delete it (toggle off)
      if (existingReaction) {
        return ctx.db.reaction.delete({
          where: { id: existingReaction.id },
        });
      }
      
      // Otherwise create a new reaction
      return ctx.db.reaction.create({
        data: {
          type: input.type,
          reply: { connect: { id: input.replyId } },
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
