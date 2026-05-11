"use client";

export default function WatchlistButton({ movieId }) {
  async function addToWatchlist() {
    const token = localStorage.getItem("token");

    console.log("TOKEN:", token);

    if (!token) {
      alert("Please login first");
      return;
    }

    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        movieId,
      }),
    });

    const data = await res.json();

    console.log(data);

    if (data.success) {
      alert("Added to Watchlist");
    } else {
      alert(data.message);
    }
  }

  return (
    <button
      onClick={addToWatchlist}
      className="bg-red-500 px-6 py-3 rounded-lg font-semibold hover:bg-red-600"
    >
      + Watchlist
    </button>
  );
}