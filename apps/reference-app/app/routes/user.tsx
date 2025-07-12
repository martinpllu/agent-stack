import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { Layout } from "~/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { verifyAuth } from "~/auth/auth-server";
import { redirect } from "react-router";
import type { UserProfile } from "~/types/user";
import { UserRepository } from "~/db/repositories/user.repository";
import { logoutAction } from "~/auth/auth-actions";
import { AppError } from "~/utils/error-handler";

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
  
  // Fetch complete user profile from database
  const userRepository = new UserRepository();
  const dbUser = await userRepository.findById(user.properties.id);
  
  if (!dbUser) {
    throw redirect("/");
  }
  
  const userProfile: UserProfile = {
    id: dbUser.id,
    email: dbUser.email,
    isAdmin: dbUser.isAdmin,
    isValidated: dbUser.isValidated,
    lastLogin: dbUser.lastLogin,
    createdAt: dbUser.createdAt
  };
  
  return Response.json({ user: userProfile }, headers ? { headers } : undefined);
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "logout") {
    return logoutAction();
  }
  
  throw AppError.badRequest("Invalid action");
}

export default function User() {
  const { user } = useLoaderData<{ user: UserProfile }>();

  return (
    <Layout user={user}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {user.email}!
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {user.isAdmin ? "Admin User" : "Standard User"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-green-700">User ID:</span>
                <span className="text-green-600">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Email:</span>
                <span className="text-green-600">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Role:</span>
                <span className="text-green-600">
                  {user.isAdmin ? "Administrator" : "User"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Status:</span>
                <span className="text-green-600">
                  {user.isValidated ? "Validated" : "Pending Validation"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Member Since:</span>
                <span className="text-green-600">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-green-700">Last Login:</span>
                <span className="text-green-600">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-lg text-foreground">
            You are logged in as {user.isAdmin ? "an admin" : "a user"} and have 
            {user.isValidated ? " validated" : " unvalidated"} access to the task management system.
          </p>
        </div>
      </div>
    </Layout>
  );
}