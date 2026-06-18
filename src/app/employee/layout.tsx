import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
