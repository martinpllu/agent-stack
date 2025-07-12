import { requireAdminRole } from "~/auth/auth-middleware";
import { UserRepository } from "~/db/repositories/user.repository";
import { AppError } from "~/utils/error-handler";
import type { User } from "~/types/user";

// Types for admin user management
interface UnvalidatedUserSummary {
  id: string;
  email: string;
  createdAt: Date;
}

interface AdminUsersLoaderData {
  users: UnvalidatedUserSummary[];
}

interface AdminActionData {
  success?: boolean;
  user?: User;
}

const userRepository = new UserRepository();

// Admin loader for getting unvalidated users
export async function loader({ request }: { request: Request }): Promise<AdminUsersLoaderData> {
  await requireAdminRole(request);
  
  const unvalidatedUsers = await userRepository.findUnvalidatedUsers();
  
  return {
    users: unvalidatedUsers.map((user: User): UnvalidatedUserSummary => ({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }))
  };
}

// Admin action for validating users
export async function action({ request }: { request: Request }): Promise<AdminActionData> {
  await requireAdminRole(request);
  
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  
  if (!userId) {
    throw AppError.badRequest("User ID required");
  }
  
  if (request.method === "POST") {
    const user = await userRepository.validate(userId);
    
    if (!user) {
      throw AppError.notFound("User not found");
    }
    
    return { success: true, user };
  }
  
  throw AppError.badRequest("Method not allowed");
}

export default function AdminUsers({ loaderData }: { loaderData: AdminUsersLoaderData }) {
  const { users } = loaderData;
  
  const handleValidateUser = async (userId: string) => {
    const formData = new FormData();
    formData.append("intent", "validate");
    
    await fetch(`/admin/users?userId=${userId}`, {
      method: "POST",
      body: formData,
    });
    
    // Reload the page to show updated data
    window.location.reload();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Unvalidated Users</h2>
        </div>
        
        {users.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No unvalidated users
          </div>
        ) : (
                     <div className="divide-y divide-gray-200">
             {users.map((user: UnvalidatedUserSummary) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-gray-500">
                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleValidateUser(user.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Validate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 