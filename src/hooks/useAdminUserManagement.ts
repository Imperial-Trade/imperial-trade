import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminUserUpdateSchema,
  adminUserPartialUpdateSchema,
  createUserSchema,
} from "@/lib/validations/adminUserSchema";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  user_type: "member" | "educator" | "admin";
  access_level: "user" | "moderator" | "admin";
  account_status: "active" | "suspended" | "pending_verification" | "inactive";
  registration_source:
    | "direct"
    | "account_request"
    | "social"
    | "admin_created"
    | "invitation";
  phone_number?: string;
  last_login?: string;
  created_at: string;
  email_confirmed_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  display_name: string;
  role: string;
  access_level: "user" | "moderator" | "admin";
  user_type: "member" | "educator" | "admin";
}

export const useAdminUserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const callAdminFunction = useCallback(
    async (action: string, userId?: string, userData?: any) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      logger.log("Calling admin function with:", { action, userId, userData });

      const response = await supabase.functions.invoke(
        "admin-user-management",
        {
          body: { action, userId, userData },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      logger.log("Admin function response:", response);

      if (response.error) {
        logger.error("Admin function error:", response.error);
        throw new Error(response.error.message || "Admin operation failed");
      }

      return response.data;
    },
    []
  );

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callAdminFunction("listUsers");
      logger.log("Loaded users:", data);
      setUsers(data.users || []);
    } catch (error) {
      logger.error("Error loading users:", error);
      toast.error("Failed to load users: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [callAdminFunction]);

  const updateUser = useCallback(
    async (userId: string, userData: Partial<AdminUser>) => {
      try {
        // Use partial schema for single field updates
        const validatedData = adminUserPartialUpdateSchema.parse(userData);
        logger.log("Updating user with validated data:", validatedData);

        await callAdminFunction("updateUser", userId, validatedData);
        toast.success("User updated successfully");
        await loadUsers(); // Refresh the list
      } catch (error) {
        logger.error("Error updating user:", error);
        if (error instanceof Error) {
          toast.error("Failed to update user: " + error.message);
        } else {
          toast.error("Failed to update user");
        }
        throw error;
      }
    },
    [callAdminFunction, loadUsers]
  );

  const deleteUser = useCallback(
    async (userId: string, userEmail: string) => {
      try {
        await callAdminFunction("deleteUser", userId, { email: userEmail });
        toast.success("User deleted successfully");
        await loadUsers(); // Refresh the list
      } catch (error) {
        logger.error("Error deleting user:", error);
        if (error instanceof Error) {
          toast.error("Failed to delete user: " + error.message);
        } else {
          toast.error("Failed to delete user");
        }
        throw error;
      }
    },
    [callAdminFunction, loadUsers]
  );

  const createUser = useCallback(
    async (userData: CreateUserData) => {
      try {
        // Validate data before sending
        const validatedData = createUserSchema.parse(userData);
        logger.log("Creating user with validated data:", validatedData);

        await callAdminFunction("createUser", undefined, validatedData);
        toast.success("User created successfully");
        await loadUsers(); // Refresh the list
      } catch (error) {
        logger.error("Error creating user:", error);
        if (error instanceof Error) {
          toast.error("Failed to create user: " + error.message);
        } else {
          toast.error("Failed to create user");
        }
        throw error;
      }
    },
    [callAdminFunction, loadUsers]
  );

  const resetPassword = useCallback(
    async (userId: string, userEmail: string) => {
      try {
        await callAdminFunction("resetPassword", userId, { email: userEmail });
        toast.success("Password reset email sent");
      } catch (error) {
        logger.error("Error resetting password:", error);
        if (error instanceof Error) {
          toast.error("Failed to send password reset email: " + error.message);
        } else {
          toast.error("Failed to send password reset email");
        }
        throw error;
      }
    },
    [callAdminFunction]
  );

  return {
    users,
    loading,
    loadUsers,
    updateUser,
    deleteUser,
    createUser,
    resetPassword,
  };
};
