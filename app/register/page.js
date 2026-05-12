"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (data.success) {
      toast.success("Account Created");
      router.push("/login");
    } else {
      toast.error(data.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 p-8 rounded-xl w-[400px] space-y-4"
      >
        <h1 className="text-3xl font-bold text-center">
          Register
        </h1>

        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 rounded bg-zinc-800"
          onChange={(e) =>
            setFormData({
              ...formData,
              username: e.target.value,
            })
          }
        />

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

        <button className="w-full bg-red-500 hover:bg-red-600 p-3 rounded">
          Create Account
        </button>
      </form>
    </main>
  );
}