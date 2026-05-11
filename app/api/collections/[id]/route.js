import { NextResponse } from "next/server";

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
    if (body?.isPublic !== undefined) updates.isPublic = Boolean(body.isPublic);

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

