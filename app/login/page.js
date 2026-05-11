"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

   if (data.success) {
  localStorage.setItem("token", data.token);

  console.log("TOKEN:", data.token);

  alert("Login Successful");

  window.location.href = "/";
} else {
      alert(data.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 p-8 rounded-xl w-[400px] space-y-4"
      >
        <h1 className="text-3xl font-bold text-center">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-zinc-800"
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value,
            })
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-zinc-800"
          onChange={(e) =>
            setFormData({
              ...formData,
              password: e.target.value,
            })
          }
        />

        <button className="w-full bg-red-500 hover:bg-red-600 p-3 rounded font-medium">
          Login
        </button>

        <p className="text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-red-400 hover:text-red-300 transition-colors">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}