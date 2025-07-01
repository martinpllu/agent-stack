import { getMockTasksByColumn } from "lib/mock-data";
import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { Layout } from "~/components/layout";
import { TaskBoard } from "~/components/tasks/task-board";

export async function loader({ request }: LoaderFunctionArgs) {
  // For demo purposes, using mock data
  // In production, this would use taskRepository.getTasksByColumn()
  const tasksByColumn = getMockTasksByColumn();
  return { tasksByColumn };
}

export default function TasksPage() {
  const { tasksByColumn } = useLoaderData<typeof loader>();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
        </div>
        
        <TaskBoard tasksByColumn={tasksByColumn} />
      </div>
    </Layout>
  );
} 