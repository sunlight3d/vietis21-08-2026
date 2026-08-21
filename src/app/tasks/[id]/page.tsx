import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/login");
  const session = await decrypt(sessionCookie);
  if (!session?.userId) redirect("/login");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!task || task.userId !== session.userId) {
    notFound();
  }

  const dateStr = new Date(task.createdAt).toLocaleString('vi-VN');

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>Chi tiết công việc</h1>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem' }}>Tiêu đề</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: '500', color: '#0f172a' }}>{task.title}</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem' }}>Trạng thái</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {task.completed ? (
              <span style={{ color: '#16a34a', fontWeight: '500' }}>✓ Đã hoàn thành</span>
            ) : (
              <span style={{ color: '#d97706', fontWeight: '500' }}>⏳ Đang xử lý</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem' }}>Ngày tạo</h2>
          <p style={{ color: '#475569' }}>{dateStr}</p>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link 
            href="/" 
            style={{
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
              display: 'inline-block'
            }}
          >
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    </div>
  );
}
