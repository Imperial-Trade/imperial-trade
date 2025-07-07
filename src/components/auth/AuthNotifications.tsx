
import { toast } from '@/hooks/use-toast';

export const sendWelcomeEmail = async (userEmail: string, userName?: string | boolean) => {
  try {
    const name = typeof userName === 'string' ? userName : 'Trader';
    // Simulate sending welcome email
    console.log(`Welcome email sent to ${userEmail} for ${name}`);
    
    toast({
      title: "Welcome!",
      description: `Welcome to Imperial Trading, ${name}! Check your email for important information.`,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    toast({
      title: "Notice",
      description: "Welcome to Imperial Trading! There was an issue sending your welcome email, but your account is ready.",
      variant: "destructive",
    });
    return { success: false, error };
  }
};

export const sendAccountVerificationEmail = async (userEmail: string) => {
  try {
    // Simulate sending verification email
    console.log(`Verification email sent to ${userEmail}`);
    
    toast({
      title: "Verification Sent",
      description: "Please check your email to verify your account.",
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    toast({
      title: "Error",
      description: "Failed to send verification email. Please try again.",
      variant: "destructive",
    });
    return { success: false, error };
  }
};

export const sendApprovalEmail = async (userEmail: string, userName?: string) => {
  try {
    const name = userName || 'User';
    console.log(`Approval email sent to ${userEmail} for ${name}`);
    
    toast({
      title: "Account Approved",
      description: `${name}'s account has been approved and they have been notified.`,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send approval email:', error);
    toast({
      title: "Error",
      description: "Failed to send approval email.",
      variant: "destructive",
    });
    return { success: false, error };
  }
};

export const sendRejectionEmail = async (userEmail: string, userName?: string, reason?: string) => {
  try {
    const name = userName || 'User';
    const rejectionReason = reason || 'Application did not meet requirements';
    console.log(`Rejection email sent to ${userEmail} for ${name} with reason: ${rejectionReason}`);
    
    toast({
      title: "Account Rejected",
      description: `${name}'s account has been rejected and they have been notified.`,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to send rejection email:', error);
    toast({
      title: "Error",
      description: "Failed to send rejection email.",
      variant: "destructive",
    });
    return { success: false, error };
  }
};
