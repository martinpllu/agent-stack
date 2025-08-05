import { Link, Form, useLocation } from "react-router";
import { Button } from "./ui/button";
import { LogIn, LogOut } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";
import { cn } from "~/utils";
import type { FlatUser } from "~/types/user";

interface LayoutProps {
  children: React.ReactNode;
  user?: FlatUser | null;
}

export function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <nav className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold">
              Task Tracker
            </Link>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link 
                    to="/" 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      location.pathname === "/" && "bg-accent text-accent-foreground"
                    )}
                  >
                    Home
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link 
                    to="/tasks" 
                    className={cn(
                      navigationMenuTriggerStyle(),
                      location.pathname === "/tasks" && "bg-accent text-accent-foreground"
                    )}
                  >
                    Tasks
                  </Link>
                </NavigationMenuItem>
                {user?.isAdmin && (
                  <NavigationMenuItem>
                    <Link 
                      to="/admin/users" 
                      className={cn(
                        navigationMenuTriggerStyle(),
                        location.pathname.startsWith("/admin") && "bg-accent text-accent-foreground"
                      )}
                    >
                      Admin
                    </Link>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  to="/user" 
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "text-sm h-9 px-4",
                    location.pathname === "/user" && "bg-accent text-accent-foreground"
                  )}
                >
                  {user.email}
                </Link>
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