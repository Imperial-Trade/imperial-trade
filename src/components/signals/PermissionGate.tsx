import React from 'react';

interface PermissionGateProps {
  children: React.ReactNode;
  userCanEdit: boolean;
  onUnauthorized?: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  userCanEdit, 
  onUnauthorized 
}) => {
  if (!userCanEdit) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return null;
  }
  
  return <>{children}</>;
};