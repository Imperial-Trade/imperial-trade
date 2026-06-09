import { Navigate } from 'react-router-dom';

/** Classroom lives inside Insight — same chrome, bottom nav, and column widths. */
export default function Education() {
  return <Navigate to="/dashboard/insight/classroom" replace />;
}
