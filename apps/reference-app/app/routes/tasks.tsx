import { redirect, Link, isRouteErrorResponse, useRouteError } from "react-router";
import { useLoaderData, Form, useActionData } from "react-router";
import { requireValidatedUserRole } from "~/auth/auth-middleware";
import { TaskRepository } from "~/db/repositories/task.repository";
import { logoutAction } from "~/auth/auth-actions";
import { AuthError, AppError, type ErrorResponse } from "~/utils/error-handler";
import { Layout } from "~/components/layout";
import { TaskBoard } from "~/components/tasks/task-board";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useState } from "react";
import type { TaskStatus, UpdateTaskInput } from "~/model/task";

const taskRepository = new TaskRepository();

export async function loader({ request }: { request: Request }) {
  const { user } = await requireValidatedUserRole(request);
  
  if (!user || !user.id) {
    throw AuthError.unauthorized("User not found");
  }
  
  const tasksByColumn = await taskRepository.getTasksByColumn(user.id);
  
  return { tasksByColumn, user };
}

export async function action({ request }: { request: Request }) {
  const { user } = await requireValidatedUserRole(request);
  
  if (!user || !user.id) {
    throw AuthError.unauthorized("User not found");
  }
  
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  
  switch (intent) {
    case "logout":
      return logoutAction();
      
    case "create": {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      
      if (!title || !description) {
        return { error: "Title and description are required" };
      }
      
      await taskRepository.create({
        title,
        description,
        userId: user.id,
      });
      
      return { success: "Task created successfully" };
    }
    
    case "update": {
      const taskId = formData.get("taskId") as string;
      const status = formData.get("status") as string;
      
      if (!taskId) {
        return { error: "Task ID is required" };
      }
      
      const updateData: UpdateTaskInput = {};
      if (status) updateData.status = status as TaskStatus;
      
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      
      await taskRepository.update(taskId, user.id, updateData);
      
      return { success: "Task updated successfully" };
    }
    
    case "delete": {
      const taskId = formData.get("taskId") as string;
      
      if (!taskId) {
        return { error: "Task ID is required" };
      }
      
            const deleted = await taskRepository.delete(taskId, user.id);

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
    backlog: tasksByColumn.todo.map(task => ({
      ...task,
      status: task.status as TaskStatus
    })),
    "in-progress": tasksByColumn.in_progress.map(task => ({
      ...task,
      status: task.status as TaskStatus
    })), 
    done: tasksByColumn.done.map(task => ({
      ...task,
      status: task.status as TaskStatus
    })),
  };

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <div className="flex items-center gap-4">
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

export function ErrorBoundary() {
  const error = useRouteError();
  
  if (isRouteErrorResponse(error)) {
    // Handle structured error responses from our error-handler utilities
    if (error.data && typeof error.data === 'object' && 'type' in error.data) {
      const errorData = error.data as ErrorResponse;
      
      // Handle not validated error
      if (errorData.code === 'NOT_VALIDATED') {
        return (
          <Layout>
            <div className="max-w-2xl mx-auto mt-8 p-6">
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800">Account Validation Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-yellow-700">
                    Please contact an administrator to get your account validated.
                  </p>
                  <div className="pt-4">
                    <Link to="/">
                      <Button variant="outline" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Layout>
        );
      }
      
      // Handle other structured errors
      return (
        <Layout>
          <div className="max-w-2xl mx-auto mt-8 p-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800">
                  {errorData.type === 'AUTHENTICATION' ? 'Authentication Required' :
                   errorData.type === 'AUTHORIZATION' ? 'Access Denied' :
                   `Error ${error.status}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{errorData.message}</p>
                <Link to="/" className="inline-block mt-4">
                  <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
                    Back to Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </Layout>
      );
    }
    
    // Handle non-structured error responses
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-8 p-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">
                {error.status} - {error.statusText || "Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                {typeof error.data === 'string' ? error.data : "An unexpected error occurred."}
              </p>
              <Link to="/" className="inline-block mt-4">
                <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  
  // Handle non-route errors
  return (
    <Layout>
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Unexpected Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <Link to="/" className="inline-block mt-4">
              <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 