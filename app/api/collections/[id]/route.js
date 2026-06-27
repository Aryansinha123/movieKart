import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import SavedCollection from "@/models/SavedCollection";
import CollectionLike from "@/models/CollectionLike";
import CollectionFollow from "@/models/CollectionFollow";
import CollectionView from "@/models/CollectionView";
import CollectionActivity from "@/models/CollectionActivity";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { enrichUserCollectionDetail } from "@/lib/collectionUtils";


export async function GET(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    const params = await context.params;
    const id = params?.id;

    let collection;
    if (mongoose.Types.ObjectId.isValid(id)) {
      collection = await Collection.findById(id)
        .populate({ path: "ownerId", select: "username avatar _id" })
        .populate({ path: "collaborators.userId", select: "username avatar _id" })
        .lean();
    } else {
      // First try exact slug match
      collection = await Collection.findOne({ slug: id })
        .populate({ path: "ownerId", select: "username avatar _id" })
        .populate({ path: "collaborators.userId", select: "username avatar _id" })
        .lean();

      // Fallback: slug may contain an embedded ObjectId at the end (e.g. "myreleases-6a30c92848c7dafacbf2cc04")
      // This handles legacy URLs generated before slugs were persisted to the DB.
      if (!collection) {
        const embeddedId = id.match(/([a-f0-9]{24})$/i)?.[1];
        if (embeddedId && mongoose.Types.ObjectId.isValid(embeddedId)) {
          collection = await Collection.findById(embeddedId)
            .populate({ path: "ownerId", select: "username avatar _id" })
            .populate({ path: "collaborators.userId", select: "username avatar _id" })
            .lean();
        }
      }
    }

    if (!collection) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    if (!collection.slug) {
      try {
        const doc = await Collection.findById(collection._id);
        if (doc) {
          await doc.save();
          collection.slug = doc.slug;
        }
      } catch (saveError) {
        console.error("Failed to auto-save slug for legacy collection:", saveError);
        const baseSlug = (collection.name || "collection")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        collection.slug = `${baseSlug}-${collection._id.toString()}`;
      }
    }

    const isOwner = userData && collection.ownerId?._id?.toString() === userData.id;
    const isCollaborator =
      userData &&
      collection.collaborators?.some(
        (c) => (c.userId?._id || c.userId)?.toString() === userData.id
      );

    // Visibility checks:
    // private / collaborative_private can only be viewed by owner or collaborator
    if (
      (collection.visibility === "private" || collection.visibility === "collaborative_private") &&
      !isOwner &&
      !isCollaborator
    ) {
      return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
    }

    // Increment view count once per user (skip owner, skip anonymous)
    if (!isOwner && userData) {
      try {
        // insertOne with unique index — silently fails if already viewed
        await CollectionView.create({ collectionId: collection._id, userId: userData.id });
        await Collection.updateOne({ _id: collection._id }, { $inc: { views: 1 } });
        collection.views = (collection.views || 0) + 1;
      } catch (e) {
        // Duplicate key error (code 11000) means already viewed — do nothing
        if (e.code !== 11000) console.error("View count error:", e.message);
      }
    }

    let saved = false;
    let personalization = null;
    if (userData) {
      const save = await SavedCollection.findOne({
        userId: userData.id,
        collectionId: collection._id,
      }).lean();
      saved = Boolean(save);
      personalization = save;
    }

    const watched = userData
      ? (await User.findById(userData.id).select("watchedMovies").lean())?.watchedMovies || []
      : [];

    const enriched = await enrichUserCollectionDetail(collection, watched, {
      personalItems: personalization?.personalItems,
      personalBannerUrl: personalization?.personalBannerUrl,
      bannerStyle: personalization?.bannerStyle,
    });

    // Calculate dynamic stats from movies:
    const movies = enriched.movies || [];
    const averageRating =
      movies.length > 0
        ? Number((movies.reduce((sum, m) => sum + (m.vote_average || 0), 0) / movies.length).toFixed(1))
        : 0;

    const genresMap = {};
    movies.forEach((m) => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach((g) => {
          if (g?.name) genresMap[g.name] = (genresMap[g.name] || 0) + 1;
        });
      }
    });
    // Sort genres by frequency
    const genresIncluded = Object.keys(genresMap).sort((a, b) => genresMap[b] - genresMap[a]);

    // Check if liked by me — use ObjectId
    let likedByMe = false;
    if (userData) {
      const like = await CollectionLike.findOne({ collectionId: collection._id, userId: userData.id }).lean();
      likedByMe = !!like;
    }

    // Check if followed by me — use ObjectId
    let followedByMe = false;
    if (userData) {
      const follow = await CollectionFollow.findOne({ collectionId: collection._id, userId: userData.id }).lean();
      followedByMe = !!follow;
    }

    return NextResponse.json({
      success: true,
      collection: {
        ...enriched,
        isOwner,
        isCollaborator,
        saved,
        likedByMe,
        followedByMe,
        owner: collection.ownerId,
        collaborators: collection.collaborators,
        stats: {
          views: collection.views || 0,
          likes: collection.likesCount || 0,
          followers: collection.followersCount || 0,
          collaboratorsCount: collection.collaborators?.length || 0,
          averageRating,
          genresIncluded,
          createdDate: collection.createdAt,
          lastUpdated: collection.updatedAt,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

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
    let existing = mongoose.Types.ObjectId.isValid(id)
      ? await Collection.findById(id)
      : await Collection.findOne({ slug: id });

    // Fallback: extract embedded ObjectId from slug (e.g. "myreleases-6a30c92848c7dafacbf2cc04")
    if (!existing && !mongoose.Types.ObjectId.isValid(id)) {
      const embeddedId = id.match(/([a-f0-9]{24})$/i)?.[1];
      if (embeddedId && mongoose.Types.ObjectId.isValid(embeddedId)) {
        existing = await Collection.findById(embeddedId);
      }
    }

    if (!existing) {
      return NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 });
    }

    const isOwner = existing.ownerId.toString() === userData.id;
    const isCollaborator = existing.collaborators?.some(
      (c) => c.userId.toString() === userData.id
    );

    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const updates = {};
    let isMetadataUpdate = false;

    // Owner only updates
    if (body?.name !== undefined) {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only the owner can rename a collection." }, { status: 403 });
      }
      updates.name = (body.name || "").toString().trim();
      isMetadataUpdate = true;
    }

    if (body?.visibility !== undefined) {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only the owner can change visibility." }, { status: 403 });
      }
      updates.visibility = body.visibility;
      updates.isPublic = body.visibility === "public";
      isMetadataUpdate = true;
    }

    if (body?.isPublic !== undefined) {
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "Only the owner can change visibility." }, { status: 403 });
      }
      updates.isPublic = Boolean(body.isPublic);
      updates.visibility = updates.isPublic ? "public" : "private";
      isMetadataUpdate = true;
    }

    // Collaborator/Owner updates
    if (body?.imageUrl !== undefined) {
      updates.imageUrl = (body.imageUrl || "").toString().trim();
    }
    if (body?.bannerUrl !== undefined) {
      updates.bannerUrl = (body.bannerUrl || "").toString().trim();
      // Record activity
      await CollectionActivity.create({
        collectionId: id,
        userId: userData.id,
        username: userData.username,
        type: "banner_updated",
        meta: { details: "Uploaded a new banner." },
      });
    }
    if (body?.description !== undefined) {
      updates.description = (body.description || "").toString().trim();
      // Record activity
      await CollectionActivity.create({
        collectionId: id,
        userId: userData.id,
        username: userData.username,
        type: "description_updated",
        meta: { details: "Updated the description." },
      });
    }
    if (body?.category !== undefined) updates.category = (body.category || "Custom").toString().trim();
    if (body?.bannerStyle !== undefined) updates.bannerStyle = body.bannerStyle || {};
    if (body?.shareEnabled !== undefined) {
      updates.shareEnabled = Boolean(body.shareEnabled);
    }

    if (updates.shareEnabled === true) {
      if (existing.visibility !== "public" && updates.visibility !== "public") {
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

    const collection = await Collection.findByIdAndUpdate(
      existing._id,
      { $set: updates },
      { new: true }
    ).lean();

    // Notify other collaborators/owner about editing
    const notifyUserIds = [];
    if (existing.ownerId.toString() !== userData.id) {
      notifyUserIds.push(existing.ownerId);
    }
    existing.collaborators.forEach((c) => {
      if (c.userId.toString() !== userData.id) {
        notifyUserIds.push(c.userId);
      }
    });

    for (const rid of notifyUserIds) {
      await Notification.create({
        recipientId: rid,
        senderId: userData.id,
        senderUsername: userData.username,
        type: "edit",
        collectionId: id,
        collectionName: collection.name,
        message: `${userData.username} updated the description/banner of "${collection.name}"`,
      });
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

    // Only owner can delete — support ObjectId, slug, and embedded-ObjectId slugs
    let deleted = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Collection.findOneAndDelete({ _id: id, ownerId: userData.id }).lean();
    } else {
      deleted = await Collection.findOneAndDelete({ slug: id, ownerId: userData.id }).lean();
      // Fallback: embedded ObjectId at end of slug
      if (!deleted) {
        const embeddedId = id.match(/([a-f0-9]{24})$/i)?.[1];
        if (embeddedId && mongoose.Types.ObjectId.isValid(embeddedId)) {
          deleted = await Collection.findOneAndDelete({ _id: embeddedId, ownerId: userData.id }).lean();
        }
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Collection not found or you are not the owner." },
        { status: 404 }
      );
    }

    // Clean up all associated records
    const { default: CollectionLikeModel } = await import("@/models/CollectionLike");
    const { default: CollectionInviteModel } = await import("@/models/CollectionInvite");
    await Promise.all([
      CollectionFollow.deleteMany({ collectionId: deleted._id }),
      CollectionActivity.deleteMany({ collectionId: deleted._id }),
      CollectionLikeModel.deleteMany({ collectionId: deleted._id }),
      CollectionInviteModel.deleteMany({ collectionId: deleted._id }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


