import { Link, Form } from "react-router";
import { Button } from "./ui/button";
import { LogIn, LogOut } from "lucide-react";

interface User {
  type: string;
  properties: {
    id: string;
    email: string;
    isAdmin: boolean;
    isValidated: boolean;
  };
}

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export function Layout({ children, user }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold">
              Task Tracker
            </Link>
            <Link to="/tasks" className="text-muted-foreground hover:text-foreground">
              Tasks
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.properties.email}
                </span>
                <Form method="post">
                  <input type="hidden" name="intent" value="logout" />
                  <Button type="submit" variant="default" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </Form>
              </>
            ) : (
              <Form method="post">
                <input type="hidden" name="intent" value="login" />
                <Button type="submit" size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </Form>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
} 