import React, { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Home,
  User,
  LogOut,
  ChevronDown,
  Bell,
  Utensils,
  BarChart2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { cn } from "../lib/utils";
import MobileNavigation from "./MobileNavigation";
import OfflineBanner from "./OfflineBanner";
import InstallPrompt from "./InstallPrompt";
import { TierBadge } from "./TierBadge";
import { ReportBugButton } from "./ReportBugButton";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const navigation = [
    // Customer navigation
    ...(user?.role === "customer"
      ? [
          { name: "My Dashboard", href: "/customer", icon: Home },
          { name: "Profile", href: "/profile", icon: User },
        ]
      : []),

    // Trainer navigation
    ...(user?.role === "trainer"
      ? [
          { name: "Dashboard", href: "/trainer", icon: Home },
          {
            name: "Meal Generator",
            href: "/meal-plan-generator",
            icon: Utensils,
          },
          { name: "Business Vault", href: "/vault", icon: BookOpen },
          { name: "Billing", href: "/billing", icon: BarChart2 },
          { name: "Profile", href: "/profile", icon: User },
        ]
      : []),

    // Admin navigation
    ...(user?.role === "admin"
      ? [
          { name: "Admin", href: "/admin", icon: ShieldCheck },
          { name: "Profile", href: "/profile", icon: User },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <OfflineBanner />
      <InstallPrompt />

      {/* Desktop Sidebar — lg+ only */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 bg-[#0F172A] z-40">
        {/* Sidebar Header — Logo */}
        <div className="flex items-center h-16 px-6 border-b border-[#1E293B]">
          <img src="/logo.png" alt="EvoFit Meals" className="h-8 w-8 mr-3" />
          <span className="text-white font-bold text-lg font-display">
            EvoFit Meals
          </span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location === item.href || location.startsWith(item.href + "/");
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(item.href);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-slate-400 hover:bg-[#1E293B] hover:text-slate-100",
                )}
                data-testid={`sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer — User info + logout */}
        <div className="border-t border-[#1E293B] p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-orange-400">
                {user?.email?.substring(0, 2).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation (bottom nav — keep existing) */}
      <MobileNavigation />

      {/* Desktop Top Header — lg+ only, sits to right of sidebar */}
      <header
        className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 z-30 items-center px-6 justify-between shadow-sm"
        data-testid="desktop-header"
        data-desktop-nav="true"
      >
        <div>{/* Page title area — pages manage their own headings */}</div>
        <div className="flex items-center gap-4">
          {user?.role === "trainer" && <TierBadge size="sm" />}
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-2">
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-orange-600">
                    {user?.email?.substring(0, 2).toUpperCase() || "U"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate">
                    {user?.email}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content — offset by sidebar on desktop */}
      <main className="lg:pl-64 lg:pt-16 flex-grow w-full pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="lg:pl-64 bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              © {new Date().getFullYear()} EvoFit Meals. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
              <a
                href="/privacy"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/contact"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {user && <ReportBugButton />}
    </div>
  );
};

export default Layout;
