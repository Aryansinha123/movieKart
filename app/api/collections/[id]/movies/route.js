import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUser";
import Collection from "@/models/Collection";
import User from "@/models/User";
import Activity from "@/models/Activity";
import CollectionActivity from "@/models/CollectionActivity";
import Notification from "@/models/Notification";

async function getMovieTitle(movieId) {
  try {
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}`
    );
    if (tmdbRes.ok) {
      const tmdbData = await tmdbRes.json();
      return tmdbData.title || `Movie #${movieId}`;
    }
  } catch (e) {
    // Ignore
  }
  return `Movie #${movieId}`;
}

async function verifyAccessAndCheckConflict(userData, id, body) {
  const collection = await Collection.findById(id);
  if (!collection) {
    return { errorResponse: NextResponse.json({ success: false, message: "Collection not found." }, { status: 404 }) };
  }

  const isOwner = collection.ownerId.toString() === userData.id;
  const isCollaborator = collection.collaborators?.some(
    (c) => c.userId.toString() === userData.id
  );

  if (!isOwner && !isCollaborator) {
    return { errorResponse: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 }) };
  }

  // Version/Conflict check:
  const clientVersion = body?.version; // Client passes the collection's last known updatedAt
  if (clientVersion) {
    const clientTime = new Date(clientVersion).getTime();
    const serverTime = new Date(collection.updatedAt).getTime();
    if (serverTime > clientTime + 1000) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            conflict: true,
            message: "Conflict detected: This collection has been updated by another collaborator. Please refresh.",
          },
          { status: 409 }
        ),
      };
    }
  }

  return { collection, isOwner, isCollaborator };
}

async function sendCollaboratorNotifications(collection, actorId, actorUsername, messageText) {
  const notifyUserIds = [];
  if (collection.ownerId.toString() !== actorId) {
    notifyUserIds.push(collection.ownerId);
  }
  collection.collaborators.forEach((c) => {
    if (c.userId.toString() !== actorId) {
      notifyUserIds.push(c.userId);
    }
  });

  for (const rid of notifyUserIds) {
    await Notification.create({
      recipientId: rid,
      senderId: actorId,
      senderUsername: actorUsername,
      type: "edit",
      collectionId: collection._id,
      collectionName: collection.name,
      message: messageText,
    });
  }
}

export async function POST(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    const body = await req.json().catch(() => null);
    const movieId = Number(body?.movieId);

    if (!Number.isFinite(movieId)) {
      return NextResponse.json({ success: false, message: "movieId must be a number." }, { status: 400 });
    }

    const { collection, errorResponse } = await verifyAccessAndCheckConflict(userData, id, body);
    if (errorResponse) return errorResponse;

    if (!collection.movies.includes(movieId)) {
      collection.movies.push(movieId);
      await collection.save();

      const movieTitle = await getMovieTitle(movieId);

      // Log global Activity (only for owner/public additions)
      if (collection.visibility === "public") {
        const user = await User.findById(userData.id).select("username avatar").lean();
        await Activity.create({
          userId: userData.id,
          username: user?.username || userData.username || "User",
          userAvatar: user?.avatar || "",
          type: "collection_add",
          movieId,
          meta: {
            collectionName: collection.name,
            collectionId: collection._id.toString(),
          },
        });
      }

      // Log Collection-specific Activity
      const actorName = userData.username || "Collaborator";
      await CollectionActivity.create({
        collectionId: id,
        userId: userData.id,
        username: actorName,
        type: "movie_added",
        meta: { movieId, movieTitle, details: `Added "${movieTitle}" to the collection.` },
      });

      // Notify other collaborators
      await sendCollaboratorNotifications(
        collection,
        userData.id,
        actorName,
        `${actorName} added "${movieTitle}" to "${collection.name}"`
      );
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
    const body = await req.json().catch(() => null);
    const movieId = Number(body?.movieId);

    if (!Number.isFinite(movieId)) {
      return NextResponse.json({ success: false, message: "movieId must be a number." }, { status: 400 });
    }

    const { collection, errorResponse } = await verifyAccessAndCheckConflict(userData, id, body);
    if (errorResponse) return errorResponse;

    if (collection.movies.includes(movieId)) {
      collection.movies = collection.movies.filter((m) => m !== movieId);
      await collection.save();

      const movieTitle = await getMovieTitle(movieId);
      const actorName = userData.username || "Collaborator";

      // Log Collection Activity
      await CollectionActivity.create({
        collectionId: id,
        userId: userData.id,
        username: actorName,
        type: "movie_removed",
        meta: { movieId, movieTitle, details: `Removed "${movieTitle}" from the collection.` },
      });

      // Notify other collaborators
      await sendCollaboratorNotifications(
        collection,
        userData.id,
        actorName,
        `${actorName} removed "${movieTitle}" from "${collection.name}"`
      );
    }

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req, context) {
  try {
    await connectDB();
    const userData = getUserFromToken(req);
    if (!userData) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params?.id;
    const body = await req.json().catch(() => null);
    const movies = body?.movies;

    if (!Array.isArray(movies)) {
      return NextResponse.json({ success: false, message: "movies array is required." }, { status: 400 });
    }

    const { collection, errorResponse } = await verifyAccessAndCheckConflict(userData, id, body);
    if (errorResponse) return errorResponse;

    const validIds = movies.map(Number).filter((n) => Number.isFinite(n));
    const existingSet = new Set(collection.movies);
    const reordered = validIds.filter((id) => existingSet.has(id));
    const missing = collection.movies.filter((id) => !reordered.includes(id));
    collection.movies = [...reordered, ...missing];
    await collection.save();

    const actorName = userData.username || "Collaborator";

    // Log Collection Activity
    await CollectionActivity.create({
      collectionId: id,
      userId: userData.id,
      username: actorName,
      type: "reordered",
      meta: { details: "Reordered the collection." },
    });

    // Notify other collaborators
    await sendCollaboratorNotifications(
      collection,
      userData.id,
      actorName,
      `${actorName} reordered movies in "${collection.name}"`
    );

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

