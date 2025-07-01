import { Link } from "react-router";
import { Layout } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { CheckCircle2, Users, BarChart3 } from "lucide-react";

export function meta() {
  return [
    { title: "Task Tracker - Team Collaboration Made Simple" },
    { name: "description", content: "Track and manage tasks with your team efficiently" },
  ];
}

export default function Home() {
  return (
    <Layout>
      <div className="space-y-16">
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
            <Link to="/tasks">
              <Button>View Demo (Guest Access)</Button>
            </Link>
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
                Guest, user, and admin roles with appropriate permissions
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
          <h2 className="text-3xl font-bold text-center mb-8">Access Levels</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h3 className="font-semibold">Guest Access</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View all tasks</li>
                <li>• Filter by status</li>
                <li>• Read-only access</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">User Access</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create new tasks</li>
                <li>• Edit own tasks</li>
                <li>• Update task status</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Admin Access</h3>
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
