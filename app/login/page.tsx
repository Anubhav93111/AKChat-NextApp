"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/validations/login";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";
import ButtonWithLoader from "@/components/ButtonWithLoader";
import PageLoader from "@/components/PageLoader";

// Login page - credentials only (no OAuth)
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaderFinished, setLoaderFinished] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      setMessage("❌ Validation failed");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        const username = session?.user?.name;
        if (username) {
          router.push(`/user/${username}`);
        } else {
          router.push("/");
        }
      } else {
        setMessage("❌ Invalid credentials");
      }
    } catch (err) {
      setMessage("❌ Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
      {!loaderFinished && (
        <PageLoader
          variant="login"
          line="Signing you in — reconnecting your creative flow"
          duration={2800}
          onFinish={() => setLoaderFinished(true)}
        />
      )}

      {/* Background image with darker overlay to match landing but deeper black */}
      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backgrond.png')" }}
        aria-hidden
      />
      <div className="fixed inset-0 z-0 bg-black/60" />

      <motion.form
        onSubmit={handleLogin}
        initial={loaderFinished ? { opacity: 0, scale: 0.8, x: 0, y: 20 } : { opacity: 0, scale: 0.4, x: -120, y: 80 }}
        animate={loaderFinished ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 160, damping: 18, duration: 0.8 }}
        className="relative overflow-hidden w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col gap-6 z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px) saturate(120%)',
          transformOrigin: 'left bottom',
        }}
      >
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-white/8 via-white/4 to-transparent blur-3xl opacity-20 transform rotate-45 pointer-events-none" />
        <h2 className="text-3xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300" style={{ fontFamily: 'var(--font-great-vibes)' }}>
          InkSync
        </h2>

        <p className="text-sm text-slate-300 text-center">Sign in to continue to your collaborative canvas</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-transparent text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {fieldErrors.email && <p className="text-red-400 text-sm">{fieldErrors.email}</p>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-transparent text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {fieldErrors.password && <p className="text-red-400 text-sm">{fieldErrors.password}</p>}

        <ButtonWithLoader
          type="submit"
          loading={isSubmitting}
          className="bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-4 py-3 rounded-xl hover:from-indigo-500 hover:to-cyan-400 transition duration-200"
        >
          Login
        </ButtonWithLoader>

        {message && <p className="text-center text-sm text-slate-300">{message}</p>}

        <p className="text-center text-sm text-slate-400">
          New to InkSync?{' '}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-emerald-300 hover:underline"
          >
            Register Now
          </button>
        </p>
      </motion.form>
    </div>
  );
}