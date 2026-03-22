import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationCenter } from "./NotificationCenter";
import { useProfile } from "@/hooks/useAgencyMembers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = (() => {
    const first = profile?.first_name?.trim();
    const last = profile?.last_name?.trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.slice(0, 2).toUpperCase();
    return (user?.email?.charAt(0) ?? "U").toUpperCase();
  })();

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      
      <div className="flex items-center gap-4">
        <GlobalSearch />
        
        <NotificationCenter />
        
        <Avatar className="w-9 h-9">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={initials} />}
          <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
