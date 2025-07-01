import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { User } from "lucide-react";
import type { Task } from "../../../lib/types/task";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <h3 className="font-semibold leading-tight">{task.title}</h3>
        {task.description && (
          <CardDescription className="mt-1.5 line-clamp-2">
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.assigneeName || "Unassigned"}</span>
          </div>
          <span>
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}