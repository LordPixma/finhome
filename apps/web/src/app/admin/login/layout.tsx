export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout bypasses the GlobalAdminGuard so users can access the login page
  return <>{children}</>;
}