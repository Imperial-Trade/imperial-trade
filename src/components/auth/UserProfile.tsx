import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User as UserIcon,
  Mail,
  Shield,
  Settings,
  LogOut,
  Crown,
  Edit,
} from "lucide-react";

interface UserProfileProps {
  user: User | null;
  onUpdate?: () => void;
  onLogout?: () => void;
}

export default function UserProfile({
  user,
  onUpdate,
  onLogout,
}: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.user_metadata?.full_name || "",
    trading_experience: user?.user_metadata?.trading_experience || "",
    preferred_markets: user?.user_metadata?.preferred_markets || [],
    risk_tolerance: user?.user_metadata?.risk_tolerance || "medium",
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: profileData,
      });

      if (error) throw error;

      onUpdate && onUpdate();
      setIsEditing(false);
    } catch (error) {
      logger.error("Failed to update profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout && onLogout();
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  };

  const getAccessLevelInfo = (level: string) => {
    switch (level) {
      case "admin":
        return {
          label: "Educator",
          color: "bg-accent-gold/20 text-accent-gold",
          icon: Crown,
        };
      case "user":
        return {
          label: "Full Member",
          color: "bg-accent-green/20 text-accent-green",
          icon: UserIcon,
        };
      case "free":
        return {
          label: "Free Tier",
          color: "bg-blue-500/20 text-blue-400",
          icon: UserIcon,
        };
      default:
        return {
          label: "Member",
          color: "bg-gray-500/20 text-gray-400",
          icon: UserIcon,
        };
    }
  };

  const accessInfo = getAccessLevelInfo(user?.user_metadata?.access_level);
  const AccessIcon = accessInfo.icon;

  return (
    <Card className="glass-effect border-default max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-green rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {user?.user_metadata?.full_name?.charAt(0) ||
                  user?.email?.charAt(0) ||
                  "U"}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {user?.user_metadata?.full_name || "User"}
              </h3>
              <Badge className={accessInfo.color}>
                <AccessIcon className="w-3 h-3 mr-1" />
                {accessInfo.label}
              </Badge>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-foreground hover:text-foreground"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile">Profile Info</TabsTrigger>
            <TabsTrigger value="security">Account Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  value={profileData.full_name}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      full_name: e.target.value,
                    })
                  }
                  disabled={!isEditing}
                  className="bg-surface border-default text-foreground"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-surface/50 border-default text-muted-foreground"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-accent-green hover:bg-green-500 text-white"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-surface/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-accent-green" />
                  <span className="font-medium text-foreground">
                    Secure Authentication
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account is secured through social login providers
                  (Google, etc.). No passwords are stored on our platform.
                </p>
              </div>

              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  This will sign you out of your Imperial Trading account on
                  this device.
                </p>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
