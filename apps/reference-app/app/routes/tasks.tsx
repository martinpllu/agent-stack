import { redirect } from "react-router";
import { useLoaderData, Form, useActionData } from "react-router";
import { requireValidatedUserRole } from "~/lib/auth-middleware";
import { TaskRepository } from "../../lib/repositories/task.repository";
import { Layout } from "~/components/layout";
import { TaskBoard } from "~/components/tasks/task-board";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useState } from "react";

const taskRepository = new TaskRepository();

export async function loader({ request }: { request: Request }) {
  const { user } = await requireValidatedUserRole(request);
  
  const tasksByColumn = await taskRepository.getTasksByColumn(user.properties.id);
  
  return { tasksByColumn, user };
}

export async function action({ request }: { request: Request }) {
  const { user } = await requireValidatedUserRole(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  
  switch (intent) {
    case "create": {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      
      if (!title || !description) {
        return { error: "Title and description are required" };
      }
      
      await taskRepository.create({
        title,
        description,
        userId: user.properties.id,
      });
      
      return { success: "Task created successfully" };
    }
    
    case "update": {
      const taskId = formData.get("taskId") as string;
      const status = formData.get("status") as string;
      
      if (!taskId) {
        return { error: "Task ID is required" };
      }
      
      const updateData: any = {};
      if (status) updateData.status = status;
      
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      
      await taskRepository.update(taskId, user.properties.id, updateData);
      
      return { success: "Task updated successfully" };
    }
    
    case "delete": {
      const taskId = formData.get("taskId") as string;
      
      if (!taskId) {
        return { error: "Task ID is required" };
      }
      
            const deleted = await taskRepository.delete(taskId, user.properties.id);

      if (!deleted) {
        return { error: "Task not found or not authorized" };
      }

      return { success: "Task deleted successfully" };
    }
    
    default:
      return { error: "Invalid action" };
  }
}

export default function TasksPage() {
  const { tasksByColumn, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Convert the new column structure to the old one that TaskBoard expects
  const compatibleTasksByColumn = {
    backlog: tasksByColumn.todo,
    "in-progress": tasksByColumn.in_progress, 
    done: tasksByColumn.done,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Welcome, User {user.properties.id}
            </span>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {showCreateForm ? "Cancel" : "Create Task"}
            </Button>
          </div>
        </div>
        
        {actionData?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {actionData.error}
          </div>
        )}
        
        {actionData?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {actionData.success}
          </div>
        )}
        
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="create" />
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Create Task
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}
        
        <TaskBoard tasksByColumn={compatibleTasksByColumn} />
      </div>
    </Layout>
  );
} 