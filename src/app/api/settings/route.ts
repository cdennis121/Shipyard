import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/route-auth';
import { getPlatformLimits, savePlatformLimits } from '@/lib/platform-settings';
import {
  getValidationError,
  updatePlatformSettingsSchema,
} from '@/lib/request-schemas';

export async function GET() {
  try {
    const limits = await getPlatformLimits();
    return NextResponse.json(limits);
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdminUser();
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = updatePlatformSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(getValidationError(parsed.error), {
        status: 400,
      });
    }

    const limits = await savePlatformLimits(parsed.data);
    return NextResponse.json(limits);
  } catch (error) {
    console.error('Error saving platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
