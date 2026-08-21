"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setError(data.error || "Đăng ký thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <div className="glass-card" style={{ maxWidth: "400px", width: "100%" }}>
        <h1 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Đăng ký</h1>
        
        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "5px", marginBottom: "1rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Tên đầy đủ</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="task-input"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="task-input"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="task-input"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Nhập lại mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="task-input"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px",
              marginTop: "10px",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Đang xử lý..." : "Tạo tài khoản"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem", color: "#64748b" }}>
          Đã có tài khoản?{" "}
          <Link href="/login" style={{ color: "#0070f3", textDecoration: "none", fontWeight: "500" }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
