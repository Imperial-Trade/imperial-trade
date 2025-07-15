import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User, Mail, Shield, Send, Phone } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { AccountRequestFormData } from "@/lib/validations/accountRequestSchema";
interface AccountRequestFormProps {
  form: UseFormReturn<AccountRequestFormData>;
  onSubmit: (data: AccountRequestFormData) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}
export const AccountRequestForm: React.FC<AccountRequestFormProps> = ({
  form,
  onSubmit,
  isSubmitting,
  canSubmit
}) => {
  const handleSubmit = async (data: AccountRequestFormData) => {
    onSubmit(data);
  };
  return <div className="account-request-form-container space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="form-grid">
          {/* Hidden honeypot field */}
          <FormField control={form.control} name="website" render={({
          field
        }) => <div style={{
          display: "none"
        }}>
                <Input {...field} tabIndex={-1} autoComplete="off" />
              </div>} />

          <div className="form-fields">
            <FormField control={form.control} name="full_name" render={({
            field,
            fieldState
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    Full Name
                  </FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                    <FormControl>
                      <Input placeholder="Enter your full name" style={{
                  color: "#ffffff !important",
                  backgroundColor: "#ffffff !important"
                }} className="pl-10 border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium bg-zinc-800" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="email" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    VT Market Email Address
                  </FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                    <FormControl>
                      <Input type="email" placeholder="Enter your VT Market email address" style={{
                  color: "#ffffff !important",
                  backgroundColor: "#ffffff !important"
                }} className="pl-10 border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium bg-zinc-800" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="phone_number" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    Phone Number
                  </FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                    <FormControl>
                      <Input type="tel" placeholder="Enter your phone number" style={{
                  color: "#ffffff !important",
                  backgroundColor: "#ffffff !important"
                }} className="pl-10 border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium bg-zinc-800" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="vt_market_account_number" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    VT Market Account Number
                  </FormLabel>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                    <FormControl>
                      <Input placeholder="Enter your VT Market account number" style={{
                  color: "#ffffff !important",
                  backgroundColor: "#ffffff !important"
                }} className="pl-10 border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium bg-zinc-800" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="referrer" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    Referrer (Optional)
                  </FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
                    <FormControl>
                      <Input placeholder="Who referred you? (Optional)" style={{
                  color: "#ffffff !important",
                  backgroundColor: "#ffffff !important"
                }} className="pl-10 border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium bg-zinc-400" />
                    </FormControl>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="account_type" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    Account Type
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900 hover:bg-white focus:bg-white font-medium">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-gray-500" />
                          <SelectValue placeholder="Select account type" className="text-gray-900 font-medium" style={{
                      color: "#1f2937 !important"
                    }} />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user" className="text-gray-900 hover:bg-gray-500 focus:bg-gray-500 font-medium">
                        Standard Member
                      </SelectItem>
                      <SelectItem value="educator" className="text-gray-900 hover:bg-gray-500 focus:bg-gray-500 font-medium">
                        Educator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>} />

            <FormField control={form.control} name="reason" render={({
            field
          }) => <FormItem>
                  <FormLabel className="text-white font-medium">
                    Why do you want to join? (10-500 characters)
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly state why you want to join (e.g., 'Referred by John Doe', 'Interested in IB program', etc.)" rows={3} style={{
                color: "#ffffff !important",
                backgroundColor: "#ffffff !important"
              }} className="border-gray-300 text-white placeholder:text-gray-400 focus:text-white font-medium resize-none bg-zinc-800" />
                  </FormControl>
                  <div className="flex justify-end">
                    <span className="text-xs text-gray-300 font-medium">
                      {field.value?.length || 0}/500
                    </span>
                  </div>
                  <FormMessage className="text-red-400" />
                </FormItem>} />
          </div>

          <div className="form-actions">
            <Button type="submit" disabled={isSubmitting || !canSubmit} className="w-full bg-accent-black font-semibold py-3 h-12 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-950 hover:bg-zinc-800 text-slate-50">
              {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <>
                  <Send className="w-4 h-4 mr-2" /> Submit Request
                </>}
            </Button>
          </div>
        </form>
      </Form>
    </div>;
};