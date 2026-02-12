import Link from 'next/link';

export default function DashboardHome() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-xl font-bold mb-8">Factory Dashboard</h2>
        <nav className="space-y-2">
          <Link href="/kanban" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Kanban Board
          </Link>
          <Link href="/orders" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Orders
          </Link>
          <Link href="/admin/products" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Products
          </Link>
          <Link href="/admin/resellers" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Resellers
          </Link>
          <Link href="/admin/wallets" className="block px-4 py-2 rounded hover:bg-gray-800 transition">
            Wallets
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manufacturing Overview</h1>

        {/* Stats Cards Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'New Jobs', value: '--', color: 'blue' },
            { label: 'In Printing', value: '--', color: 'yellow' },
            { label: 'Quality Check', value: '--', color: 'purple' },
            { label: 'Dispatched Today', value: '--', color: 'green' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <p className="text-gray-500">
          Connect to the API to load real-time manufacturing data.
        </p>
      </main>
    </div>
  );
}
