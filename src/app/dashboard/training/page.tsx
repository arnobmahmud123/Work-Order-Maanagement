"use client";

import { useState } from "react";
import { useTrainingCourses } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, Badge } from "@/components/ui";
import {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  ClipboardCheck,
  Clock,
  Users,
  Star,
  ChevronRight,
  Play,
  CheckCircle2,
  BarChart3,
  Shield,
  Wrench,
  Monitor,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, any> = {
  ONBOARDING: BookOpen,
  SERVICE: Wrench,
  SAFETY: Shield,
  PLATFORM: Monitor,
};

const categoryColors: Record<string, string> = {
  ONBOARDING: "bg-blue-500/10 text-blue-600",
  SERVICE: "bg-emerald-500/10 text-emerald-600",
  SAFETY: "bg-rose-500/10 text-rose-600",
  PLATFORM: "bg-purple-500/10 text-purple-600",
};

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-500/10 text-emerald-600",
  Intermediate: "bg-amber-500/10 text-amber-600",
  Advanced: "bg-rose-500/10 text-rose-600",
};

export default function TrainingPage() {
  const { data: session } = useSession();
  const [category, setCategory] = useState("");
  const { data, isLoading } = useTrainingCourses(category || undefined);

  const courses = data?.courses || [];
  const stats = data?.stats;

  const categories = [
    { id: "", label: "All Courses", icon: GraduationCap },
    { id: "ONBOARDING", label: "Onboarding", icon: BookOpen },
    { id: "SERVICE", label: "Service", icon: Wrench },
    { id: "SAFETY", label: "Safety", icon: Shield },
    { id: "PLATFORM", label: "Platform", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <GraduationCap className="inline h-6 w-6 mr-2 text-cyan-400" />
          Training Center
        </h1>
        <p className="text-text-muted mt-1">
          Courses, documents, and videos for property preservation training.
        </p>
      </div>

      {/* Overall progress */}
      {stats && (
        <Card>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-cyan-500/[0.06] flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">
                  {stats.overallProgress}%
                </p>
                <p className="text-[10px] text-cyan-500/70 font-bold uppercase tracking-widest">DONE</p>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Your Training Progress
              </h3>
              <div className="h-3 bg-surface-hover rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-cyan-500/20 rounded-full transition-all"
                  style={{ width: `${stats.overallProgress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>
                  {stats.completedCourses}/{stats.totalCourses} courses
                  completed
                </span>
                <span>
                  {stats.completedModules}/{stats.totalModules} modules
                  completed
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              category === cat.id
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                : "bg-surface text-text-secondary border border-border-subtle hover:bg-surface-hover"
            )}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading courses...</div>
      ) : courses.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No courses found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Zoom / External Training Links */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Video className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-text-primary">
            Live Training Sessions
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: "Weekly Q&A with Senior Coordinator",
              date: "Every Wednesday, 2:00 PM EST",
              platform: "Zoom",
              link: "#",
              status: "upcoming",
            },
            {
              title: "New Contractor Onboarding",
              date: "Every Monday, 10:00 AM EST",
              platform: "Zoom",
              link: "#",
              status: "upcoming",
            },
            {
              title: "Advanced Winterization Workshop",
              date: "Recording Available",
              platform: "Recording",
              link: "#",
              status: "recorded",
            },
            {
              title: "Platform Walkthrough for New Users",
              date: "Recording Available",
              platform: "Udemy",
              link: "#",
              status: "recorded",
            },
          ].map((session, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 border border-border-subtle rounded-lg hover:bg-surface-hover"
            >
              <div
                className={cn(
                  "p-2 rounded-lg",
                  session.status === "upcoming"
                    ? "bg-emerald-500/10"
                    : "bg-surface-hover"
                )}
              >
                {session.status === "upcoming" ? (
                  <Zap className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Video className="h-4 w-4 text-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {session.title}
                </p>
                <p className="text-xs text-text-muted">{session.date}</p>
              </div>
              <Badge
                className={cn(
                  "text-xs",
                  session.status === "upcoming"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-surface-hover text-text-muted"
                )}
              >
                {session.platform}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  const Icon = categoryIcons[course.category] || BookOpen;
  const isComplete = course.progress.percentage === 100;
  const isStarted = course.progress.completed > 0;

  return (
    <Link href={`/dashboard/training/${course.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        {/* Thumbnail / header */}
        <div
          className={cn(
            "h-32 rounded-lg mb-3 flex items-center justify-center",
            isComplete
              ? "bg-green-50"
              : isStarted
                ? "bg-cyan-500/[0.06]"
                : "bg-surface-hover"
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          ) : (
            <Icon className="h-12 w-12 text-cyan-400/40" />
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-[10px]", categoryColors[course.category])}>
            {course.category}
          </Badge>
          <Badge className={cn("text-[10px]", levelColors[course.level])}>
            {course.level}
          </Badge>
        </div>

        {/* Title + description */}
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          {course.title}
        </h3>
        <p className="text-xs text-text-muted line-clamp-2 mb-3">
          {course.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {course.duration}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {course.moduleCount} modules
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {course.enrolled}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            {course.rating}
          </span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">
              {course.progress.completed}/{course.progress.total} modules
            </span>
            <span className="text-xs font-medium text-text-dim">
              {course.progress.percentage}%
            </span>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isComplete ? "bg-emerald-500" : "bg-cyan-500/20"
              )}
              style={{ width: `${course.progress.percentage}%` }}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
