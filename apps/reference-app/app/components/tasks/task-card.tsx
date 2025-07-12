import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import { Calendar } from "lucide-react";
import type { Task } from "~/model/task";

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
            <Calendar className="h-3 w-3" />
            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === 'done' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}