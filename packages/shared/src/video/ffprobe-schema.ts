import { z } from 'zod';

const ffprobeStreamSchema = z.object({
  codec_type: z.string(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  r_frame_rate: z.string().optional(),
  avg_frame_rate: z.string().optional(),
});

const ffprobeFormatSchema = z.object({
  format_name: z.string(),
  duration: z.string().optional(),
  bit_rate: z.string().optional(),
});

export const ffprobeOutputSchema = z.object({
  streams: z.array(ffprobeStreamSchema),
  format: ffprobeFormatSchema,
});

export type FfprobeOutput = z.infer<typeof ffprobeOutputSchema>;
