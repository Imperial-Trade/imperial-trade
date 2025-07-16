
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

interface NoRequestFoundProps {
  email: string;
  onCheckAnother: () => void;
}

export const NoRequestFound: React.FC<NoRequestFoundProps> = ({ email, onCheckAnother }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No Account Request Found
        </h3>
        <p className="text-gray-300 mb-4">
          We couldn't find an account request for <span className="font-medium text-white">{email}</span>
        </p>
        <p className="text-sm text-gray-400">
          To access our platform, you'll need to submit an account request first.
        </p>
      </div>

      <Card className="glass-effect border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4">
          <h4 className="font-medium text-white mb-2">What's next?</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
              <span>Submit a new account request using the same email address</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
              <span>Wait 12-48 hours for review after submission</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
              <span>Return here to check your request status</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Link to={createPageUrl("account-request")}>
          <Button className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12">
            <Plus className="w-4 h-4 mr-2" />
            Submit Account Request
          </Button>
        </Link>
        
        <Button
          variant="outline"
          className="w-full border-white/20 text-white/80 hover:bg-white/10"
          onClick={onCheckAnother}
        >
          Try Different Email
        </Button>
      </div>
    </div>
  );
};
