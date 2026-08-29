"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }
    router.push("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl2 bg-cream p-8 shadow-soft">
        <h1 className="mb-1 font-display text-2xl font-extrabold text-wine">DoDo Admin</h1>
        <p className="mb-6 text-sm text-charcoal/60">تسجيل دخول لوحة التحكم</p>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            dir="ltr"
            required
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
        </div>

        {error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
