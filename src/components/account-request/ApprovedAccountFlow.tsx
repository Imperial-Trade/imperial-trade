
import React from 'react';
import { UserExistenceCheck } from './UserExistenceCheck';

interface ApprovedAccountFlowProps {
  accountRequest: any;
}

export const ApprovedAccountFlow: React.FC<ApprovedAccountFlowProps> = ({ 
  accountRequest 
}) => {
  return <UserExistenceCheck accountRequest={accountRequest} />;
};
