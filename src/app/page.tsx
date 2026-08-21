"use client";

import { useState, useEffect, FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTasks(page, limit);
  }, [page, limit]);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TASK_CHANGED') {
          fetchTasks(page, limit);
        }
      } catch (err) {
        console.error('SSE parsing error', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [page, limit]);

  const fetchTasks = async (currentPage: number, currentLimit: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks?page=${currentPage}&limit=${currentLimit}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: newTask }),
      });

      if (!res.ok) throw new Error("Failed to add task");
      
      const createdTask = await res.json();
      if (page === 1) {
        setTasks([createdTask, ...tasks].slice(0, limit));
      } else {
        setPage(1);
      }
      setTotal(total + 1);
      setNewTask("");
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete task");
      
      // Tải lại dữ liệu trang hiện tại để đảm bảo tính phân trang đúng đắn
      fetchTasks(page, limit);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('vi-VN', options);
  };

  return (
    <div className="container">
      <div className="glass-card">
        <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>Việc Cần Làm</h1>
            <p style={{ margin: "5px 0 0 0" }}>{formatDate()}</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: "8px 12px", background: "#f87171", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
          >
            Đăng xuất
          </button>
        </header>

        <form onSubmit={addTask} className="task-form">
          <textarea
            className="task-input"
            placeholder="Thêm công việc mới..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            disabled={isSubmitting}
            autoFocus
            rows={2}
            style={{ resize: 'vertical', minHeight: '40px', fontFamily: 'inherit' }}
          />
          <button 
            type="submit" 
            className="btn-add"
            disabled={!newTask.trim() || isSubmitting}
          >
            {isSubmitting ? "..." : "+"}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Tổng số: {total} công việc
          </span>
          <div>
            <label style={{ fontSize: '0.9rem', color: '#64748b', marginRight: '0.5rem' }}>Hiển thị:</label>
            <select 
              value={limit} 
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading">Đang tải...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>Hôm nay bạn chưa có công việc nào!</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Hãy thêm mới ở trên.</p>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-item">
                <div className="task-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem', flex: 1, marginRight: '1rem' }}>
                  <span className="task-text" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>{task.title}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(task.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a 
                    href={`/tasks/${task.id}`} 
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      background: '#e2e8f0',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: '#334155',
                      fontWeight: '500'
                    }}
                  >
                    Chi tiết
                  </a>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="btn-delete"
                    aria-label="Xóa công việc"
                    title="Xóa công việc"
                  >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: page === 1 ? '#f1f5f9' : 'white',
                color: page === 1 ? '#94a3b8' : '#0f172a',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Trước
            </button>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>
              Trang {page} / {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / limit)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: page >= Math.ceil(total / limit) ? '#f1f5f9' : 'white',
                color: page >= Math.ceil(total / limit) ? '#94a3b8' : '#0f172a',
                cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer'
              }}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
