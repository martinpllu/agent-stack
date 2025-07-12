import { Link, Form, useLoaderData, useSearchParams } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { FlatUser } from "~/types/user";
import { Layout } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { CheckCircle2, Users, BarChart3, LogIn, LogOut, AlertCircle } from "lucide-react";
import { verifyAuth } from "~/auth/auth-server";
import { logoutAction } from "~/auth/auth-actions";
import { AppError } from "~/utils/error-handler";

export function meta() {
  return [
    { title: "Task Tracker - Team Collaboration Made Simple" },
    { name: "description", content: "Track and manage tasks with your team efficiently" },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await verifyAuth(request)
  
  const flattenedUser: FlatUser | null = user ? {
    id: user.properties.id,
    email: user.properties.email,
    isAdmin: user.properties.isAdmin,
    isValidated: user.properties.isValidated
  } : null
  
  return Response.json({ user: flattenedUser }, headers ? { headers } : undefined)
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const intent = formData.get("intent")
  
  if (intent === "login") {
    // Redirect to login page instead of calling loginAction
    const { redirect } = await import("react-router")
    return redirect("/auth/login")
  } else if (intent === "logout") {
    return logoutAction()
  }
  
  throw AppError.badRequest("Invalid action")
}

export default function Home() {
  const { user } = useLoaderData<{ user: FlatUser | null }>()
  const [searchParams] = useSearchParams()
  const error = searchParams.get("error")

  return (
    <Layout user={user}>
      <div className="space-y-16">
        {/* Error Display */}
        {error && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">
                {error === "no_code" && "Authentication failed: No authorization code received"}
                {error === "exchange_failed" && "Authentication failed: Could not exchange authorization code"}
                {error === "callback_failed" && "Authentication failed: Callback processing error"}
              </p>
            </div>
          </section>
        )}

        {/* Hero Section */}
        <section className="text-center space-y-6 py-16">
          <h1 className="text-5xl font-bold tracking-tight">
            Team Task Tracking Made Simple
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Organize your team's work with our intuitive kanban board. 
            Track tasks from backlog to done with ease.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link to="/tasks">
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  View Tasks
                </Button>
              </Link>
            ) : (
              <Form method="post">
                <input type="hidden" name="intent" value="login" />
                <Button type="submit">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to get started
                </Button>
              </Form>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CheckCircle2 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Simple Kanban Board</CardTitle>
              <CardDescription>
                Visualize your workflow with backlog, in-progress, and done columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Drag and drop tasks between columns to update their status instantly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Assign tasks to team members and track progress together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See who's working on what with clear task assignments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                User and admin roles with appropriate permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Control who can create, edit, and manage tasks in your workspace.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Access Levels Section */}
        <section className="bg-muted/50 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Access Levels
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">User Access</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create new tasks</li>
                <li>• Edit own tasks</li>
                <li>• Update task status</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Admin Access</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full task management</li>
                <li>• Assign tasks to users</li>
                <li>• Delete any task</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
