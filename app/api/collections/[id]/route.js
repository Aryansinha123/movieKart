import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";

export async function PATCH(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;

    const body = await req.json().catch(() => null);
    const updates = {};
    if (body?.name !== undefined) updates.name = (body.name || "").toString().trim();
    if (body?.imageUrl !== undefined) updates.imageUrl = (body.imageUrl || "").toString().trim();
    if (body?.isPublic !== undefined) updates.isPublic = Boolean(body.isPublic);
    if (body?.shareEnabled !== undefined) {
      updates.shareEnabled = Boolean(body.shareEnabled);
    }

    const existing = await Collection.findOne({ _id: id, ownerId: userData.id }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    if (updates.shareEnabled === true) {
      if (!existing.isPublic) {
        return NextResponse.json(
          {
            success: false,
            message: "Collection must be public before you can create a share link.",
          },
          { status: 400 }
        );
      }
      let token = existing.shareToken;
      if (!token) {
        for (let i = 0; i < 8; i++) {
          const candidate = randomBytes(16).toString("base64url");
          const clash = await Collection.findOne({ shareToken: candidate }).lean();
          if (!clash) {
            token = candidate;
            break;
          }
        }
        if (!token) {
          return NextResponse.json(
            { success: false, message: "Could not generate share link." },
            { status: 500 }
          );
        }
        updates.shareToken = token;
      }
    }

    if (updates.name !== undefined && !updates.name) {
      return NextResponse.json(
        { success: false, message: "Collection name cannot be empty." },
        { status: 400 }
      );
    }

    const collection = await Collection.findOneAndUpdate(
      { _id: id, ownerId: userData.id },
      updates,
      { new: true }
    ).lean();

    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;

    const deleted = await Collection.findOneAndDelete({ _id: id, ownerId: userData.id }).lean();
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

