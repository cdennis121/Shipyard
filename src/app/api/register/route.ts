import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/db';
import {
  checkSignupRateLimit,
  consumeSignupAttempt,
  getHeadersIp,
} from '@/lib/auth-rate-limit';
import { getPlatformLimits } from '@/lib/platform-settings';
import {
  getValidationError,
  registerUserSchema,
} from '@/lib/request-schemas';

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getHeadersIp(request.headers);
    const rateLimit = await checkSignupRateLimit(ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const settings = await getPlatformLimits();

    if (!settings.allowPublicSignup) {
      return NextResponse.json(
        { error: 'Public signup is currently disabled' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = registerUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }

    const { username, password } = parsed.data;
    const consumedAttempt = await consumeSignupAttempt(ipAddress);

    if (!consumedAttempt.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(consumedAttempt.retryAfterSeconds),
          },
        }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'member',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
