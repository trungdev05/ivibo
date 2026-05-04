'use client';
import { useEffect, useState } from 'react';
import { CheckSquare, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ApprovalRequest {
  id: string;
  title: string;
  type: 'purchase_order' | 'leave_request' | 'budget' | 'project_plan' | 'other';
  requestedBy: string;
  requestedAt: string;
  dueDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  amount?: number;
}

const TYPE_LABEL: Record<ApprovalRequest['type'], string> = {
  purchase_order: 'Đơn mua hàng',
  leave_request: 'Nghỉ phép',
  budget: 'Phê duyệt ngân sách',
  project_plan: 'Kế hoạch dự án',
  other: 'Khác',
};

const STATUS_ICON: Record<ApprovalRequest['status'], React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  approved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
  cancelled: <AlertCircle className="w-4 h-4 text-gray-400" />,
};

const STATUS_LABEL: Record<ApprovalRequest['status'], string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetch('/api/approvals')
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = activeTab === 'pending'
    ? requests.filter((r) => r.status === 'pending')
    : requests;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">Phê duyệt</h1>
          {requests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {requests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-3 pb-0 bg-white border-b">
        {(['pending', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'pending' ? 'Chờ tôi duyệt' : 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Đang tải...</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <CheckSquare className="w-10 h-10 opacity-30" />
            <p className="text-sm">Không có yêu cầu phê duyệt nào.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {displayed.map((r) => (
              <div key={r.id} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
                <div className="flex-shrink-0">{STATUS_ICON[r.status]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TYPE_LABEL[r.type]} · {r.requestedBy} · {new Date(r.requestedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.amount && (
                    <span className="text-sm font-medium text-gray-700">
                      {new Intl.NumberFormat('vi-VN').format(r.amount)}₫
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    r.status === 'approved' ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Duyệt
                    </button>
                    <button className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
