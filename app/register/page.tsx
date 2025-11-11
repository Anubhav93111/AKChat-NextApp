"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";
import ButtonWithLoader from "@/components/ButtonWithLoader";
import PageLoader from "@/components/PageLoader";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);

  const router = useRouter();

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch("/api/sendotp", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ email }),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        setMessage("❌ Server error: Invalid response format");
        return;
      }

      if (res.ok) {
        setOtpSent(true);
        setMessage("📩 OTP sent to your email");
      } else {
        setMessage(data.message || "❌ Failed to send OTP");
      }
    } catch (err) {
      console.error("Network error:", err);
      setMessage("❌ Network error: Please check your connection");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (res.ok) {
        setOtpVerified(true);
        setMessage("✅ Email verified");
      } else {
        setMessage(data.message || "❌ Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Error verifying OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      setMessage("❌ Please verify your email first");
      return;
    }
    // client-side validation before sending to server
    const newFieldErrors: { email?: string; password?: string; name?: string } = {};
    // name: at least 6 chars, no spaces
    if (!/^\S{6,}$/.test(name)) newFieldErrors.name = "Name must be at least 6 characters and contain no spaces";
    // password: at least 6 chars, at least one lower and one upper, no spaces
    if (!/^(?=.*[a-z])(?=.*[A-Z])\S{6,}$/.test(password))
      newFieldErrors.password = "Password must be at least 6 chars, contain both lowercase and uppercase letters, and have no spaces";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setMessage("❌ Fix the highlighted fields");
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Registration successful! Redirecting...");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        setFieldErrors({
          email: data.errors?.email?.[0],
          password: data.errors?.password?.[0],
          name: data.errors?.name?.[0],
        });
        setMessage(data.message || "❌ Registration failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Something went wrong");
    } finally {
      setRegistering(false);
    }
  };

  const [loaderFinished, setLoaderFinished] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center text-white px-4">
      {!loaderFinished && (
        <PageLoader
          variant="register"
          line="Verifying your email — preparing your creative workspace"
          duration={3000}
          onFinish={() => setLoaderFinished(true)}
        />
      )}

      <motion.div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backgrond.png')" }}
        aria-hidden
      />
      <div className="fixed inset-0 z-0 bg-black/60" />

      <motion.form
        onSubmit={handleRegister}
        initial={loaderFinished ? { opacity: 0, scale: 0.8, x: 0, y: 20 } : { opacity: 0, scale: 0.4, x: 120, y: 80 }}
        animate={loaderFinished ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 160, damping: 18, duration: 0.8 }}
        className="relative overflow-hidden w-full max-w-md p-8 rounded-3xl shadow-2xl flex flex-col gap-6 z-20"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px) saturate(120%)',
          transformOrigin: 'right bottom',
        }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-white/8 via-white/4 to-transparent blur-3xl opacity-20 transform -rotate-45 pointer-events-none" />
        <h2 className="text-3xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-emerald-300" style={{ fontFamily: 'var(--font-great-vibes)' }}>
          Create your account
        </h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
          required
          className="bg-transparent text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {fieldErrors.email && <p className="text-red-400 text-sm">{fieldErrors.email}</p>}

        {!otpSent && (
          <ButtonWithLoader
            type="button"
            onClick={handleSendOtp}
            loading={sendingOtp}
            className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-500 transition duration-200"
          >
            Verify Email
          </ButtonWithLoader>
        )}

        {otpSent && !otpVerified && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
                  className="bg-transparent text-white px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ButtonWithLoader
              type="button"
              onClick={handleVerifyOtp}
              loading={verifyingOtp}
              className="bg-gradient-to-r from-yellow-600 to-amber-500 text-white px-4 py-3 rounded-xl hover:from-yellow-500 hover:to-amber-400 transition duration-200"
            >
              Submit OTP
            </ButtonWithLoader>
          </>
        )}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: undefined })); }}
          required
          disabled={!otpVerified}
          className={`bg-transparent text-white px-4 py-3 rounded-xl border ${
            otpVerified ? "border-white/10" : "border-white/10 opacity-50"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
        {fieldErrors.name && <p className="text-red-400 text-sm">{fieldErrors.name}</p>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
          required
          disabled={!otpVerified}
          className={`bg-transparent text-white px-4 py-3 rounded-xl border ${
            otpVerified ? "border-white/10" : "border-white/10 opacity-50"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        />
        {fieldErrors.password && <p className="text-red-400 text-sm">{fieldErrors.password}</p>}

        <ButtonWithLoader
          type="submit"
          loading={registering}
          className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-3 rounded-xl hover:from-emerald-500 hover:to-teal-400 transition duration-200"
        >
          Register
        </ButtonWithLoader>

        {message && <p className="text-center text-sm text-slate-300">{message}</p>}

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-300 hover:underline">
            Login
          </a>
        </p>
      </motion.form>
    </div>
  );
}
