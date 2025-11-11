import { FC } from 'react';
import { ApprovedPasswordAuth } from './ApprovedPasswordAuth';

interface ApprovedAccountFlowProps {
  accountRequest: any;
}

export const ApprovedAccountFlow: React.FC<ApprovedAccountFlowProps> = ({ 
  accountRequest 
}) => {
  return <ApprovedPasswordAuth accountRequest={accountRequest} />;
};
