import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import CollectionInvite from "@/models/CollectionInvite";
import CollectionActivity from "@/models/CollectionActivity";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const collectionId = body?.collectionId;
    const action = body?.action; // invite, accept, decline, remove, transfer

    if (!mongoose.Types.ObjectId.isValid(collectionId)) {
      return NextResponse.json({ success: false, message: "Invalid collectionId." }, { status: 400 });
    }

    const col = await Collection.findById(collectionId);
    if (!col) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const isOwner = col.ownerId.toString() === userData.id;

    if (action === "invite") {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only owners can invite collaborators." }, { status: 403 });
      }
      const target = (body?.target || "").trim(); // username or email
      if (!target) {
        return NextResponse.json({ success: false, message: "Username or email is required." }, { status: 400 });
      }

      // Find user by username or email
      const targetUser = await User.findOne({
        $or: [{ username: target }, { email: target.toLowerCase() }],
      }).lean();

      if (!targetUser) {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }

      if (targetUser._id.toString() === userData.id) {
        return NextResponse.json({ success: false, message: "You cannot invite yourself." }, { status: 400 });
      }

      // Check if already collaborator
      const alreadyCollab = col.collaborators.some(
        (c) => c.userId.toString() === targetUser._id.toString()
      );
      if (alreadyCollab) {
        return NextResponse.json({ success: false, message: "User is already a collaborator." }, { status: 400 });
      }

      // Upsert invite
      const invite = await CollectionInvite.findOneAndUpdate(
        { collectionId, inviteeUsernameOrEmail: targetUser.username },
        {
          collectionId,
          inviterId: userData.id,
          inviteeUsernameOrEmail: targetUser.username,
          status: "pending",
        },
        { upsert: true, new: true }
      );

      // Notify the invitee
      await Notification.create({
        recipientId: targetUser._id,
        senderId: userData.id,
        senderUsername: userData.username,
        type: "invite",
        collectionId: col._id,
        collectionName: col.name,
        message: `${userData.username} invited you to collaborate on the collection "${col.name}"`,
      });

      return NextResponse.json({ success: true, message: "Invitation sent." });
    }

    if (action === "accept" || action === "decline") {
      // Find invite
      const invite = await CollectionInvite.findOne({
        collectionId,
        inviteeUsernameOrEmail: userData.username,
        status: "pending",
      });

      if (!invite) {
        return NextResponse.json({ success: false, message: "No pending invitation found." }, { status: 404 });
      }

      if (action === "accept") {
        invite.status = "accepted";
        await invite.save();

        // Add user to collection collaborators
        await Collection.updateOne(
          { _id: collectionId },
          {
            $addToSet: {
              collaborators: { userId: userData.id, role: "collaborator", invitedAt: new Date() },
            },
          }
        );

        // Record activity
        await CollectionActivity.create({
          collectionId,
          userId: userData.id,
          username: userData.username,
          type: "invite_accepted",
          meta: { details: `${userData.username} accepted the collaboration invite.` },
        });

        // Notify owner
        await Notification.create({
          recipientId: col.ownerId,
          senderId: userData.id,
          senderUsername: userData.username,
          type: "invite_accepted",
          collectionId: col._id,
          collectionName: col.name,
          message: `${userData.username} accepted your invite to collaborate on "${col.name}"`,
        });

        return NextResponse.json({ success: true, message: "Invitation accepted." });
      } else {
        invite.status = "declined";
        await invite.save();
        return NextResponse.json({ success: true, message: "Invitation declined." });
      }
    }

    if (action === "remove") {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only owners can remove collaborators." }, { status: 403 });
      }
      const targetUserId = body?.targetUserId;
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return NextResponse.json({ success: false, message: "Invalid targetUserId." }, { status: 400 });
      }

      col.collaborators = col.collaborators.filter(
        (c) => c.userId.toString() !== targetUserId
      );
      await col.save();

      // Delete the invite history
      const targetUser = await User.findById(targetUserId).lean();
      if (targetUser) {
        await CollectionInvite.deleteOne({
          collectionId,
          inviteeUsernameOrEmail: targetUser.username,
        });

        // Notify collaborator of removal
        await Notification.create({
          recipientId: targetUserId,
          senderId: userData.id,
          senderUsername: userData.username,
          type: "edit",
          collectionId: col._id,
          collectionName: col.name,
          message: `Your access to collaborate on "${col.name}" has been revoked by the owner.`,
        });
      }

      // Record activity
      await CollectionActivity.create({
        collectionId,
        userId: userData.id,
        username: userData.username,
        type: "collaborator_removed",
        meta: { details: `Collaborator was removed.` },
      });

      return NextResponse.json({ success: true, message: "Collaborator removed." });
    }

    if (action === "transfer") {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only owners can transfer ownership." }, { status: 403 });
      }
      const targetUserId = body?.targetUserId;
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return NextResponse.json({ success: false, message: "Invalid targetUserId." }, { status: 400 });
      }

      const isCollab = col.collaborators.some((c) => c.userId.toString() === targetUserId);
      if (!isCollab) {
        return NextResponse.json({ success: false, message: "Ownership can only be transferred to a current collaborator." }, { status: 400 });
      }

      // Transfer ownership
      col.ownerId = targetUserId;
      // Remove the new owner from collaborators list
      col.collaborators = col.collaborators.filter((c) => c.userId.toString() !== targetUserId);
      // Add the old owner to collaborators list (optional, but standard, let's keep them as a collaborator so they don't lose edit rights)
      col.collaborators.push({ userId: userData.id, role: "collaborator", invitedAt: new Date() });
      await col.save();

      // Record activity
      await CollectionActivity.create({
        collectionId,
        userId: userData.id,
        username: userData.username,
        type: "edit",
        meta: { details: `Ownership transferred to new user.` },
      });

      // Notify the new owner
      await Notification.create({
        recipientId: targetUserId,
        senderId: userData.id,
        senderUsername: userData.username,
        type: "edit",
        collectionId: col._id,
        collectionName: col.name,
        message: `${userData.username} has transferred ownership of "${col.name}" to you.`,
      });

      return NextResponse.json({ success: true, message: "Ownership transferred." });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get all pending invites for the logged in user
    const invites = await CollectionInvite.find({
      inviteeUsernameOrEmail: userData.username,
      status: "pending",
    })
      .populate({ path: "collectionId", select: "name bannerUrl description ownerId" })
      .populate({ path: "inviterId", select: "username avatar" })
      .lean();

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
