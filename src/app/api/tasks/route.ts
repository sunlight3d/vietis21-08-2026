import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/eventEmitter';
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

async function getUserId() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  if (!cookie) return null;
  const session = await decrypt(cookie);
  return session?.userId as string | null;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.task.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      data: tasks,
      total,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title } = await request.json();
    
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        userId,
      },
    });
    
    eventEmitter.emit('task_changed', userId);
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.task.delete({
      where: {
        id,
      },
    });

    eventEmitter.emit('task_changed', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Task not found or Invalid request' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, completed } = await request.json();

    if (!id || completed === undefined) {
      return NextResponse.json({ error: 'ID and completed status are required' }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { completed },
    });

    eventEmitter.emit('task_changed', userId);

    return NextResponse.json(updatedTask);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
