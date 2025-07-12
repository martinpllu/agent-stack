import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { Layout } from "~/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { verifyAuth } from "~/lib/auth-server";
import { redirect } from "react-router";

interface User {
  type: string;
  properties: {
    id: string;
    email: string;
    isAdmin: boolean;
    isValidated: boolean;
  };
}

export function meta() {
  return [
    { title: "User Profile - Task Tracker" },
    { name: "description", content: "Your user profile information" },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await verifyAuth(request);
  
  if (!user) {
    throw redirect("/");
  }
  
  return Response.json({ user: user as User }, headers ? { headers } : undefined);
}

export default function User() {
  const { user } = useLoaderData<{ user: User }>();

  return (
    <Layout user={user}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {user.properties.email}!
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {user.properties.isAdmin ? "Admin User" : "Standard User"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-green-700">User ID:</span>
                <span className="text-green-600">{user.properties.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Email:</span>
                <span className="text-green-600">{user.properties.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Role:</span>
                <span className="text-green-600">
                  {user.properties.isAdmin ? "Administrator" : "User"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Status:</span>
                <span className="text-green-600">
                  {user.properties.isValidated ? "Validated" : "Pending Validation"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-lg text-foreground">
            You are logged in as {user.properties.isAdmin ? "an admin" : "a user"} and have 
            {user.properties.isValidated ? " validated" : " unvalidated"} access to the task management system.
          </p>
        </div>
      </div>
    </Layout>
  );
}