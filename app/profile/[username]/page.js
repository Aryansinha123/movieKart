import Image from "next/image";

async function getProfile(username) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/profile/${username}`,
    {
      cache: "no-store",
    }
  );

  return res.json();
}

export default async function ProfilePage(context) {
  const params = await context.params;

  const user = await getProfile(
    params.username
  );

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-4xl font-bold">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={`${user.username} avatar`}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              user.username?.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <h1 className="text-5xl font-bold">
              {user.username}
            </h1>

            <p className="text-zinc-400 mt-3">
              {user.bio}
            </p>

            <div className="flex gap-6 mt-5 text-zinc-300">
              <p>
                🎬 Watched:{" "}
                {user.watchedMovies?.length || 0}
              </p>

              <p>
                📌 Watchlist:{" "}
                {user.watchlist?.length || 0}
              </p>

              <p>
                👥 Followers:{" "}
                {user.followers?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-6">
            Recent Activity
          </h2>

          <div className="bg-zinc-900 rounded-xl p-6 text-zinc-400">
            Activity feed coming soon...
          </div>
        </div>
      </div>
    </main>
  );
}