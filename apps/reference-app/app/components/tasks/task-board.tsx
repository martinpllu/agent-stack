import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TaskCard } from "./task-card";
import type { Task } from "~/model/task";

interface TaskBoardProps {
  tasksByColumn: {
    backlog: Task[];
    "in-progress": Task[];
    done: Task[];
  };
}

export function TaskBoard({ tasksByColumn }: TaskBoardProps) {
  const columns = [
    { id: "backlog", title: "Backlog", tasks: tasksByColumn.backlog },
    { id: "in-progress", title: "In Progress", tasks: tasksByColumn["in-progress"] },
    { id: "done", title: "Done", tasks: tasksByColumn.done },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => (
        <Card key={column.id} className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {column.title}
              <span className="text-sm font-normal text-muted-foreground">
                {column.tasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {column.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks
              </p>
            ) : (
              column.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 