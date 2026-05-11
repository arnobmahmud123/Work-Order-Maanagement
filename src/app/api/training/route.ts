import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Training Courses ────────────────────────────────────────────────────────
// Returns training courses with modules, documents, and videos.

const TRAINING_COURSES = [
  {
    id: "course-1",
    title: "Property Preservation Fundamentals",
    description:
      "Essential training for all property preservation professionals. Covers safety, documentation, and industry standards.",
    category: "ONBOARDING",
    level: "Beginner",
    duration: "4 hours",
    instructor: "Mike Wilson",
    thumbnail: null,
    enrolled: 24,
    rating: 4.8,
    modules: [
      {
        id: "mod-1-1",
        title: "Introduction to Property Preservation",
        type: "video",
        duration: "15 min",
        completed: true,
        description: "Overview of the property preservation industry and your role.",
      },
      {
        id: "mod-1-2",
        title: "Safety Protocols",
        type: "document",
        duration: "20 min",
        completed: true,
        description: "Personal safety, PPE requirements, and hazard identification.",
        fileUrl: "/training/safety-protocols.pdf",
      },
      {
        id: "mod-1-3",
        title: "Documentation Standards",
        type: "video",
        duration: "25 min",
        completed: false,
        description: "How to properly document work with photos and notes.",
      },
      {
        id: "mod-1-4",
        title: "Photo Requirements Quiz",
        type: "quiz",
        duration: "10 min",
        completed: false,
        description: "Test your knowledge of before/during/after photo requirements.",
      },
    ],
  },
  {
    id: "course-2",
    title: "Grass Cut & Lawn Maintenance",
    description:
      "Complete guide to professional grass cutting, trimming, and lawn maintenance for foreclosed properties.",
    category: "SERVICE",
    level: "Beginner",
    duration: "2 hours",
    instructor: "Sarah Johnson",
    thumbnail: null,
    enrolled: 18,
    rating: 4.6,
    modules: [
      {
        id: "mod-2-1",
        title: "Equipment Setup & Maintenance",
        type: "video",
        duration: "20 min",
        completed: false,
        description: "Setting up mowers, trimmers, and blowers.",
      },
      {
        id: "mod-2-2",
        title: "Grass Cut Standards",
        type: "document",
        duration: "15 min",
        completed: false,
        description: "Height requirements, trimming specs, and cleanup.",
        fileUrl: "/training/grass-cut-standards.pdf",
      },
      {
        id: "mod-2-3",
        title: "Before & After Photo Guide",
        type: "video",
        duration: "10 min",
        completed: false,
        description: "How to take proper before and after photos.",
      },
    ],
  },
  {
    id: "course-3",
    title: "Winterization Procedures",
    description:
      "Step-by-step winterization training including water system draining, antifreeze application, and documentation.",
    category: "SERVICE",
    level: "Intermediate",
    duration: "3 hours",
    instructor: "David Lee",
    thumbnail: null,
    enrolled: 15,
    rating: 4.9,
    modules: [
      {
        id: "mod-3-1",
        title: "Understanding Plumbing Systems",
        type: "video",
        duration: "30 min",
        completed: false,
        description: "Overview of residential plumbing and water systems.",
      },
      {
        id: "mod-3-2",
        title: "Draining Water Lines",
        type: "video",
        duration: "25 min",
        completed: false,
        description: "Proper technique for draining all water lines.",
      },
      {
        id: "mod-3-3",
        title: "Antifreeze Application",
        type: "document",
        duration: "20 min",
        completed: false,
        description: "Where and how to apply antifreeze to traps and toilets.",
        fileUrl: "/training/antifreeze-guide.pdf",
      },
      {
        id: "mod-3-4",
        title: "Winterization Checklist",
        type: "document",
        duration: "10 min",
        completed: false,
        description: "Complete checklist for winterization jobs.",
        fileUrl: "/training/winterization-checklist.pdf",
      },
      {
        id: "mod-3-5",
        title: "Winterization Assessment",
        type: "quiz",
        duration: "15 min",
        completed: false,
        description: "Prove your knowledge of winterization procedures.",
      },
    ],
  },
  {
    id: "course-4",
    title: "Board-Up & Securing Properties",
    description:
      "Training on boarding up windows, doors, and other entry points to secure vacant properties.",
    category: "SERVICE",
    level: "Intermediate",
    duration: "2.5 hours",
    instructor: "Mike Wilson",
    thumbnail: null,
    enrolled: 12,
    rating: 4.7,
    modules: [
      {
        id: "mod-4-1",
        title: "Board-Up Materials & Tools",
        type: "video",
        duration: "15 min",
        completed: false,
        description: "Required materials, plywood specs, and hardware.",
      },
      {
        id: "mod-4-2",
        title: "Window Board-Up Technique",
        type: "video",
        duration: "20 min",
        completed: false,
        description: "Step-by-step window boarding process.",
      },
      {
        id: "mod-4-3",
        title: "Door Securing Methods",
        type: "video",
        duration: "15 min",
        completed: false,
        description: "How to secure various door types.",
      },
      {
        id: "mod-4-4",
        title: "Board-Up Standards",
        type: "document",
        duration: "10 min",
        completed: false,
        description: "Industry standards and client requirements.",
        fileUrl: "/training/board-up-standards.pdf",
      },
    ],
  },
  {
    id: "course-5",
    title: "Using PropPreserve Platform",
    description:
      "Complete guide to using the PropPreserve management platform for work orders, messaging, and invoicing.",
    category: "PLATFORM",
    level: "Beginner",
    duration: "1.5 hours",
    instructor: "Admin Team",
    thumbnail: null,
    enrolled: 32,
    rating: 4.5,
    modules: [
      {
        id: "mod-5-1",
        title: "Dashboard Overview",
        type: "video",
        duration: "10 min",
        completed: false,
        description: "Navigate the dashboard and understand key metrics.",
      },
      {
        id: "mod-5-2",
        title: "Managing Work Orders",
        type: "video",
        duration: "15 min",
        completed: false,
        description: "Create, update, and complete work orders.",
      },
      {
        id: "mod-5-3",
        title: "Messaging & Communication",
        type: "video",
        duration: "10 min",
        completed: false,
        description: "Use threads, send messages, and upload photos.",
      },
      {
        id: "mod-5-4",
        title: "Invoicing & Payments",
        type: "video",
        duration: "12 min",
        completed: false,
        description: "Create invoices and track payments.",
      },
      {
        id: "mod-5-5",
        title: "Platform Quick Reference",
        type: "document",
        duration: "5 min",
        completed: false,
        description: "Printable quick reference guide.",
        fileUrl: "/training/platform-guide.pdf",
      },
    ],
  },
  {
    id: "course-6",
    title: "Mold Remediation Safety",
    description:
      "Critical safety training for mold remediation work. Required certification for mold remediation contractors.",
    category: "SAFETY",
    level: "Advanced",
    duration: "6 hours",
    instructor: "Dr. Patricia Chen",
    thumbnail: null,
    enrolled: 8,
    rating: 4.9,
    modules: [
      {
        id: "mod-6-1",
        title: "Understanding Mold",
        type: "video",
        duration: "30 min",
        completed: false,
        description: "Types of mold, health risks, and identification.",
      },
      {
        id: "mod-6-2",
        title: "PPE Requirements",
        type: "document",
        duration: "20 min",
        completed: false,
        description: "Required personal protective equipment for mold work.",
        fileUrl: "/training/mold-ppe.pdf",
      },
      {
        id: "mod-6-3",
        title: "Containment Procedures",
        type: "video",
        duration: "25 min",
        completed: false,
        description: "Setting up containment to prevent cross-contamination.",
      },
      {
        id: "mod-6-4",
        title: "Remediation Techniques",
        type: "video",
        duration: "40 min",
        completed: false,
        description: "Professional mold removal methods.",
      },
      {
        id: "mod-6-5",
        title: "Air Quality Testing",
        type: "video",
        duration: "20 min",
        completed: false,
        description: "Pre and post-remediation air quality testing.",
      },
      {
        id: "mod-6-6",
        title: "Mold Remediation Certification Exam",
        type: "quiz",
        duration: "30 min",
        completed: false,
        description: "Pass this exam to become certified for mold work.",
      },
    ],
  },
];

// Simulated user progress
const userProgress: Record<string, Record<string, boolean>> = {};

function getUserProgress(userId: string): Record<string, boolean> {
  if (!userProgress[userId]) {
    // Seed some demo progress
    userProgress[userId] = {
      "mod-1-1": true,
      "mod-1-2": true,
    };
  }
  return userProgress[userId];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const courseId = searchParams.get("courseId") || "";

  const progress = getUserProgress(userId);

  // If requesting a specific course
  if (courseId) {
    const course = TRAINING_COURSES.find((c) => c.id === courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const modulesWithProgress = course.modules.map((mod) => ({
      ...mod,
      completed: progress[mod.id] || false,
    }));

    const completedCount = modulesWithProgress.filter(
      (m) => m.completed
    ).length;

    return NextResponse.json({
      ...course,
      modules: modulesWithProgress,
      progress: {
        completed: completedCount,
        total: course.modules.length,
        percentage:
          course.modules.length > 0
            ? Math.round((completedCount / course.modules.length) * 100)
            : 0,
      },
    });
  }

  // List all courses with progress
  let courses = TRAINING_COURSES;
  if (category) {
    courses = courses.filter((c) => c.category === category);
  }

  const coursesWithProgress = courses.map((course) => {
    const completedCount = course.modules.filter(
      (m) => progress[m.id]
    ).length;
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      enrolled: course.enrolled,
      rating: course.rating,
      moduleCount: course.modules.length,
      progress: {
        completed: completedCount,
        total: course.modules.length,
        percentage:
          course.modules.length > 0
            ? Math.round((completedCount / course.modules.length) * 100)
            : 0,
      },
    };
  });

  // Overall stats
  const totalModules = TRAINING_COURSES.reduce(
    (sum, c) => sum + c.modules.length,
    0
  );
  const completedModules = Object.keys(progress).filter((k) => progress[k]).length;
  const completedCourses = coursesWithProgress.filter(
    (c) => c.progress.percentage === 100
  ).length;

  return NextResponse.json({
    courses: coursesWithProgress,
    stats: {
      totalCourses: TRAINING_COURSES.length,
      completedCourses,
      totalModules,
      completedModules,
      overallProgress:
        totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { moduleId, completed } = body;

  if (!moduleId) {
    return NextResponse.json(
      { error: "Module ID is required" },
      { status: 400 }
    );
  }

  const progress = getUserProgress(userId);
  progress[moduleId] = completed !== false;

  return NextResponse.json({ moduleId, completed: progress[moduleId] });
}
