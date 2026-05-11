// import { NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const response = await fetch(
//       `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}`
//     );

//     const data = await response.json();

//     console.log(data);

//     return NextResponse.json(data);
//   } catch (error) {
//     console.log(error);

//     return NextResponse.json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.themoviedb.org/3/trending/movie/week",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.log("TMDB ERROR:", error);

    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}