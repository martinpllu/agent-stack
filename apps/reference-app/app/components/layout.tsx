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
import { cn } from "~/lib/utils";

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
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {user.email || user.properties?.email}
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