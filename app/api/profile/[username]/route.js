import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/profile";

export async function GET(req, context) {
  try {
    const params = await context.params;
    const profile = await getProfileData(params.username);

    if (!profile) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}