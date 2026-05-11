"use client";

import { use } from "react";
import { useTrainingCourse, useUpdateModuleProgress } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  ClipboardCheck,
  Clock,
  Users,
  Star,
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Shield,
  Wrench,
  Monitor,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const moduleIcons: Record<string, any> = {
  video: Video,
  document: FileText,
  quiz: ClipboardCheck,
};

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: course, isLoading } = useTrainingCourse(id);
  const updateProgress = useUpdateModuleProgress();

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading course...</div>;
  }

  if (!course) {
    return <div className="p-8 text-center text-text-muted">Course not found</div>;
  }

  async function handleCompleteModule(moduleId: string, completed: boolean) {
    try {
      await updateProgress.mutateAsync({ moduleId, completed: !completed });
      toast.success(
        completed ? "Module marked incomplete" : "Module completed! 🎉"
      );
    } catch {
      toast.error("Failed to update progress");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/training">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{course.title}</h1>
          <p className="text-text-muted">{course.description}</p>
        </div>
      </div>

      {/* Course info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/[0.06]">
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{course.duration}</p>
              <p className="text-xs text-text-muted">Duration</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">
                {course.modules.length}
              </p>
              <p className="text-xs text-text-muted">Modules</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{course.enrolled}</p>
              <p className="text-xs text-text-muted">Enrolled</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">{course.rating}</p>
              <p className="text-xs text-text-muted">Rating</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Course Progress
          </h3>
          <span className="text-sm font-bold text-cyan-400">
            {course.progress.percentage}%
          </span>
        </div>
        <div className="h-3 bg-surface-hover rounded-full overflow-hidden mb-2">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              course.progress.percentage === 100
                ? "bg-green-500"
                : "bg-cyan-500/[0.06]0"
            )}
            style={{ width: `${course.progress.percentage}%` }}
          />
        </div>
        <p className="text-xs text-text-muted">
          {course.progress.completed} of {course.progress.total} modules
          completed
          {course.progress.percentage === 100 && " — Course complete! 🎉"}
        </p>
      </Card>

      {/* Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {course.modules.map((mod: any, i: number) => {
            const Icon = moduleIcons[mod.type] || BookOpen;
            return (
              <div
                key={mod.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                  mod.completed
                    ? "bg-green-50/50 border-green-200"
                    : "bg-surface-hover border-border-subtle hover:border-indigo-300"
                )}
              >
                {/* Module number + icon */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      mod.completed
                        ? "bg-green-100 text-green-600"
                        : "bg-surface-hover text-text-muted"
                    )}
                  >
                    {mod.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <Icon className="h-4 w-4 text-text-muted" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4
                      className={cn(
                        "text-sm font-semibold",
                        mod.completed
                          ? "text-green-700 line-through"
                          : "text-text-primary"
                      )}
                    >
                      {mod.title}
                    </h4>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        mod.type === "video"
                          ? "bg-blue-100 text-blue-700"
                          : mod.type === "document"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-purple-100 text-purple-700"
                      )}
                    >
                      {mod.type}
                    </Badge>
                    <span className="text-xs text-text-muted">{mod.duration}</span>
                  </div>
                  <p className="text-xs text-text-muted mb-2">{mod.description}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {mod.type === "video" && (
                      <Button variant="outline" size="sm">
                        <Play className="h-3.5 w-3.5" />
                        Watch
                      </Button>
                    )}
                    {mod.type === "document" && mod.fileUrl && (
                      <a href={mod.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </a>
                    )}
                    {mod.type === "quiz" && (
                      <Button variant="outline" size="sm">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Take Quiz
                      </Button>
                    )}
                    <Button
                      variant={mod.completed ? "outline" : "primary"}
                      size="sm"
                      onClick={() =>
                        handleCompleteModule(mod.id, mod.completed)
                      }
                      loading={updateProgress.isPending}
                    >
                      {mod.completed ? (
                        <>
                          <Circle className="h-3.5 w-3.5" />
                          Mark Incomplete
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Instructor */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-indigo-100 text-cyan-400 flex items-center justify-center font-medium">
            {course.instructor?.[0] || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {course.instructor}
            </p>
            <p className="text-xs text-text-muted">Course Instructor</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
