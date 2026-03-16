import { z, type ZodError } from 'zod';

const channelSchema = z.enum(['latest', 'beta', 'alpha']);
const platformSchema = z.enum(['windows', 'mac', 'linux']);
const archSchema = z.enum(['x64', 'arm64', 'universal', 'ia32']);
const roleSchema = z.enum(['admin', 'member', 'viewer']);

const trimmedString = z.string().trim().min(1);

const nullableTrimmedString = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}, z.string().trim().min(1).nullable());

const optionalPositiveInt = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

export const createAppSchema = z.object({
  name: trimmedString,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must be lowercase alphanumeric with hyphens',
    }),
  description: nullableTrimmedString.optional(),
  icon: nullableTrimmedString.optional(),
});

export const updateAppSchema = z
  .object({
    name: trimmedString.optional(),
    description: nullableTrimmedString.optional(),
    icon: nullableTrimmedString.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const createReleaseSchema = z.object({
  appId: trimmedString,
  version: trimmedString,
  name: nullableTrimmedString.optional(),
  notes: nullableTrimmedString.optional(),
  channel: channelSchema.default('latest'),
  platform: platformSchema.default('windows'),
  stagingPercentage: z.coerce.number().int().min(0).max(100).default(100),
  isPublic: z.boolean().default(true),
  published: z.boolean().default(false),
});

export const updateReleaseSchema = z
  .object({
    version: trimmedString.optional(),
    name: nullableTrimmedString.optional(),
    notes: nullableTrimmedString.optional(),
    channel: channelSchema.optional(),
    platform: platformSchema.optional(),
    stagingPercentage: z.coerce.number().int().min(0).max(100).optional(),
    isPublic: z.boolean().optional(),
    published: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const createUserSchema = z.object({
  username: trimmedString,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleSchema.default('member'),
});

export const registerUserSchema = createUserSchema.omit({ role: true });

export const createApiKeySchema = z.object({
  name: trimmedString,
  expiresInDays: optionalPositiveInt,
});

export const uploadRequestSchema = z.object({
  releaseId: trimmedString,
  filename: trimmedString,
  contentType: trimmedString,
  channel: channelSchema,
  platform: platformSchema,
  version: trimmedString,
});

export const createReleaseFileSchema = z.object({
  filename: trimmedString,
  s3Key: trimmedString,
  sha512: trimmedString,
  size: z.coerce.number().int().positive(),
  arch: archSchema.optional().nullable(),
});

export const cleanupRequestSchema = z.object({
  dryRun: z.boolean().default(false),
});

export const updatePlatformSettingsSchema = z.object({
  maxAppsPerUser: z.coerce.number().int().positive(),
  maxReleasesPerApp: z.coerce.number().int().positive(),
  allowPublicSignup: z.boolean(),
});

export const updateUserSchema = z
  .object({
    role: roleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export function getValidationError(error: ZodError) {
  const flattened = error.flatten();

  return {
    error: 'Invalid request body',
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors,
  };
}
