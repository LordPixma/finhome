export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to FamilyBudget
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your family's financial management solution
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/login"
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Login
            </a>
            <a
              href="/register"
              className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Track Spending</h3>
            <p className="text-gray-600">
              Monitor your income and expenses with detailed analytics and insights.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">Budget Management</h3>
            <p className="text-gray-600">
              Set budgets for different categories and track your progress in real-time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-primary-600 text-3xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold mb-2">Bill Reminders</h3>
            <p className="text-gray-600">
              Never miss a bill payment with automated reminders and notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
