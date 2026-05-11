// import { NextResponse } from "next/server";

// export async function GET(req, { params }) {
//   try {
//     const { id } = params;

//     const response = await fetch(
//       `https://api.themoviedb.org/3/movie/${id}`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//           accept: "application/json",
//         },
//         cache: "no-store",
//       }
//     );

//     const data = await response.json();

//     return NextResponse.json(data);
//   } catch (error) {
//     return NextResponse.json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
import { NextResponse } from "next/server";

export async function GET(req, context) {
  try {
    const params = await context.params;

    const id = params.id;

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}`,
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
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}