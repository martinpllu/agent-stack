import { requireAdminRole } from "~/auth/auth-middleware";
import { UserRepository } from "~/db/repositories/user.repository";
import { AppError } from "~/utils/error-handler";
import type { User } from "~/types/user";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { Layout } from "~/components/layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

const userRepository = new UserRepository();

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAdminRole(request);
  
  const allUsers = await userRepository.findAll();
  
  return Response.json({
    users: allUsers.map((u: User) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      isValidated: u.isValidated,
      isAdmin: u.isAdmin
    })),
    currentUser: user.properties
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdminRole(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent");
  const userId = formData.get("userId") as string;
  
  if (!userId) {
    throw AppError.badRequest("User ID required");
  }
  
  if (intent === "validate") {
    const user = await userRepository.validate(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return Response.json({ success: true, user });
  } else if (intent === "delete") {
    await userRepository.delete(userId);
    return Response.json({ success: true });
  } else if (intent === "toggleAdmin") {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    await userRepository.update(userId, { isAdmin: !user.isAdmin });
    return Response.json({ success: true });
  }
  
  throw AppError.badRequest("Invalid action");
}

export function meta() {
  return [
    { title: "User Management - Admin" },
    { name: "description", content: "Manage user accounts and permissions" },
  ];
}

interface LoaderData {
  users: Array<{
    id: string;
    email: string;
    createdAt: Date;
    isValidated: boolean;
    isAdmin: boolean;
  }>;
  currentUser: any;
}

export default function AdminUsers() {
  const { users, currentUser } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  
  return (
    <Layout user={currentUser}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts and permissions
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Total users: {users.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="users-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Created</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b" data-testid="user-row">
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.isValidated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.isValidated ? 'Validated' : 'Unvalidated'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            {!user.isValidated && (
                              <fetcher.Form method="post" className="inline">
                                <input type="hidden" name="intent" value="validate" />
                                <input type="hidden" name="userId" value={user.id} />
                                <Button type="submit" size="sm" variant="outline">
                                  Validate
                                </Button>
                              </fetcher.Form>
                            )}
                            {user.email !== currentUser.email && (
                              <>
                                <fetcher.Form method="post" className="inline">
                                  <input type="hidden" name="intent" value="toggleAdmin" />
                                  <input type="hidden" name="userId" value={user.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                  </Button>
                                </fetcher.Form>
                                <fetcher.Form method="post" className="inline">
                                  <input type="hidden" name="intent" value="delete" />
                                  <input type="hidden" name="userId" value={user.id} />
                                  <Button type="submit" size="sm" variant="destructive">
                                    Delete
                                  </Button>
                                </fetcher.Form>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}