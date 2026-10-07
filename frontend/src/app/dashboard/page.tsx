export const metadata = { title: "Dashboard" };

// TODO(step 2): require a session, redirect to /login otherwise
export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-foreground/60">Здесь будет конструктор профиля.</p>
    </main>
  );
}
