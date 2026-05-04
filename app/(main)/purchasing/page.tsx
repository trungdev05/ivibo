'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  code: string;
  title: string;
  vendor: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
  requestedBy: string;
  requestedAt: string;
}

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  completed: 'Hoàn thành',
};

const STATUS_COLOR: Record<PurchaseOrder['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
}

export default function PurchasingPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchasing')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Mua hàng</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Đang tải...</div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Mã PO', 'Tiêu đề', 'Nhà cung cấp', 'Giá trị', 'Người yêu cầu', 'Trạng thái'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Chưa có đơn mua hàng nào
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{o.title}</td>
                      <td className="px-4 py-3 text-gray-600">{o.vendor}</td>
                      <td className="px-4 py-3 text-gray-900">{formatCurrency(o.amount, o.currency)}</td>
                      <td className="px-4 py-3 text-gray-600">{o.requestedBy}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
