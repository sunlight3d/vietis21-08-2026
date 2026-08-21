"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setError(data.error || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(ellipse at top left, #064e3b 0%, #022c22 45%, #03140e 100%)",
        padding: "1.5rem",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#ecfdf5",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "rgba(6, 44, 34, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(52, 211, 153, 0.25)",
          borderRadius: "24px",
          padding: "2.5rem 2rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.15)",
        }}
      >
        {/* Eco/Botanical Header Badge */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              color: "#6ee7b7",
              fontSize: "0.85rem",
              fontWeight: 500,
              marginBottom: "1rem",
            }}
          >
            <span>🌿</span> VietIS Green Workspace
          </div>

          <h1
            style={{
              fontSize: "1.9rem",
              fontWeight: 700,
              background: "linear-gradient(135deg, #a7f3d0 0%, #34d399 50%, #10b981 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.4rem",
              letterSpacing: "-0.02em",
            }}
          >
            Đăng nhập
          </h1>
          <p style={{ color: "#a7f3d0", fontSize: "0.9rem", opacity: 0.85 }}>
            Khởi đầu ngày mới tràn đầy năng lượng xanh 🌱
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              color: "#fca5a5",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "1.25rem",
              textAlign: "center",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#d1fae5",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Địa chỉ Email
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(2, 44, 34, 0.6)",
                  border: "1px solid rgba(52, 211, 153, 0.25)",
                  color: "#f0fdf4",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#34d399";
                  e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(52, 211, 153, 0.25)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#d1fae5",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(2, 44, 34, 0.6)",
                border: "1px solid rgba(52, 211, 153, 0.25)",
                color: "#f0fdf4",
                fontSize: "0.95rem",
                outline: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#34d399";
                e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.25)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(52, 211, 153, 0.25)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              padding: "13px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
              transition: "all 0.2s ease",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 12px 30px -5px rgba(16, 185, 129, 0.6)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(16, 185, 129, 0.4)";
            }}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập vào hệ thống 🍃"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.75rem",
            color: "#6ee7b7",
            fontSize: "0.9rem",
            opacity: 0.9,
          }}
        >
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            style={{
              color: "#a7f3d0",
              textDecoration: "underline",
              fontWeight: 600,
              marginLeft: "4px",
            }}
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
