import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { AccountRequestData, AccountRequest } from '@/api/entities/AccountRequest';
import { useToast } from "@/hooks/use-toast";
import { 
  validateAccountRequestData, 
  getFieldError, 
  getGeneralError,
  ValidationError 
} from '@/lib/validations/accountRequestValidation';

interface UpdateAccountRequestFormProps {
  existingRequest: AccountRequestData;
  onSuccess: (updatedRequest: AccountRequestData) => void;
  onCancel: () => void;
}

export const UpdateAccountRequestForm: React.FC<UpdateAccountRequestFormProps> = ({
  existingRequest,
  onSuccess,
  onCancel
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: existingRequest.full_name || '',
    email: existingRequest.email,
    phone_number: existingRequest.phone_number || '',
    vt_market_account_number: existingRequest.vt_market_account_number || '',
    referrer: existingRequest.referrer || '',
    account_type: existingRequest.account_type || 'user' as const,
    reason: existingRequest.reason || '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const validateForm = () => {
    const validation = validateAccountRequestData(formData, existingRequest);
    setValidationErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedRequest = await AccountRequest.updateRejectedRequest(existingRequest.id!, formData);
      
      toast({
        title: "Request Updated Successfully!",
        description: "Your updated request has been resubmitted and is now pending review.",
      });

      onSuccess(updatedRequest);
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    setValidationErrors(prev => prev.filter(error => error.field !== field && error.field !== 'general'));
  };

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white">
          Update Account Request
        </CardTitle>
        <p className="text-gray-300">
          Make the necessary changes to address the rejection reason and resubmit your request.
        </p>
      </CardHeader>
      <CardContent>
        {existingRequest.rejection_reason && (
          <div className="mb-6 bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-400 mb-1">Previous Rejection Reason:</h4>
                <p className="text-red-300 text-sm">{existingRequest.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Full Name *
            </label>
            <Input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              disabled={isSubmitting}
            />
            {getFieldError(validationErrors, 'full_name') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError(validationErrors, 'full_name')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
            />
            <p className="text-gray-400 text-xs mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              VT Market Account Number *
            </label>
            <Input
              type="text"
              value={formData.vt_market_account_number}
              onChange={(e) => handleInputChange('vt_market_account_number', e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              disabled={isSubmitting}
            />
            {getFieldError(validationErrors, 'vt_market_account_number') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError(validationErrors, 'vt_market_account_number')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Account Type *
            </label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => handleInputChange('account_type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Standard Member</SelectItem>
                <SelectItem value="educator">Educator / IB Partner</SelectItem>
              </SelectContent>
            </Select>
            {getFieldError(validationErrors, 'account_type') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError(validationErrors, 'account_type')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Referrer (Optional)
            </label>
            <Input
              type="text"
              value={formData.referrer}
              onChange={(e) => handleInputChange('referrer', e.target.value)}
              placeholder="Who referred you to our platform?"
              className="bg-white border-gray-300 text-gray-900"
              disabled={isSubmitting}
            />
          </div>

          {formData.account_type === 'educator' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Reason for Educator Account * (10-500 characters)
              </label>
              <Textarea
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Please explain why you need an educator account and how you plan to use it..."
                className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                disabled={isSubmitting}
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-300">
                  {formData.reason.length}/500
                </span>
              </div>
              {getFieldError(validationErrors, 'reason') && (
                <p className="text-red-400 text-sm mt-1">{getFieldError(validationErrors, 'reason')}</p>
              )}
            </div>
          )}

          {getGeneralError(validationErrors) && (
            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
              <p className="text-yellow-400 text-sm">{getGeneralError(validationErrors)}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update & Resubmit
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
