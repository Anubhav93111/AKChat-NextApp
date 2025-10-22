"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const router = useRouter();

  const handleSendOtp = async () => {
    try {
      const res = await fetch("/api/sendotp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      setMessage("❌ Please verify your email first");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Registration successful! Redirecting...");
        setTimeout(() => router.push("/login"), 2000);
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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
      <form
        onSubmit={handleRegister}
        className="bg-slate-800 p-8 rounded-xl shadow-xl w-full max-w-md flex flex-col gap-6"
      >
        <h2 className="text-2xl font-bold text-center text-blue-400">Create Account</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {fieldErrors.email && <p className="text-red-400 text-sm">{fieldErrors.email}</p>}

        {!otpSent && (
          <button
            type="button"
            onClick={handleSendOtp}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition duration-200"
          >
            Verify Email
          </button>
        )}

        {otpSent && !otpVerified && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition duration-200"
            >
              Submit OTP
            </button>
          </>
        )}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={!otpVerified}
          className={`bg-slate-700 text-white px-4 py-2 rounded-lg border ${
            otpVerified ? "border-slate-600" : "border-slate-700 opacity-50"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        {fieldErrors.name && <p className="text-red-400 text-sm">{fieldErrors.name}</p>}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={!otpVerified}
          className={`bg-slate-700 text-white px-4 py-2 rounded-lg border ${
            otpVerified ? "border-slate-600" : "border-slate-700 opacity-50"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        {fieldErrors.password && <p className="text-red-400 text-sm">{fieldErrors.password}</p>}

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition duration-200"
        >
          Register
        </button>

        {message && <p className="text-center text-sm text-slate-300">{message}</p>}

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
