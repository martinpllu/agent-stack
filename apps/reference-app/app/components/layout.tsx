import { Link } from "react-router";
import { Button } from "./ui/button";

// No-op components for Clerk (not installed)
const UserButton = () => null;
const SignInButton = ({ children }: any) => children;
const SignedIn = ({ children }: any) => children;
const SignedOut = () => null;

export function Layout({ children }: { children: React.ReactNode }) {
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
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
} 