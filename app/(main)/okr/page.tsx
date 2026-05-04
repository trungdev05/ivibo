'use client';
import { useEffect, useState } from 'react';
import { Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface Objective {
  id: string;
  title: string;
  owner: string;
  progress: number; // 0-100
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  keyResults: { id: string; title: string; progress: number }[];
}

const STATUS_LABEL: Record<Objective['status'], string> = {
  on_track: 'Đúng tiến độ',
  at_risk: 'Có rủi ro',
  behind: 'Chậm tiến độ',
  completed: 'Hoàn thành',
};

const STATUS_COLOR: Record<Objective['status'], string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-yellow-100 text-yellow-700',
  behind: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function OkrPage() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/okr')
      .then((r) => r.json())
      .then((d) => setObjectives(d.objectives ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">OKR</h1>
          <span className="text-sm text-gray-500">Q2 · 2026</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Đang tải...
          </div>
        ) : objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <Target className="w-10 h-10 opacity-30" />
            <p className="text-sm">Chưa có mục tiêu nào. Thêm OKR đầu tiên.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl">
            {objectives.map((obj) => (
              <div key={obj.id} className="bg-white border rounded-xl p-5 shadow-sm">
                {/* Objective header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{obj.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{obj.owner}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[obj.status]}`}>
                    {STATUS_LABEL[obj.status]}
                  </span>
                </div>

                {/* Overall progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Tiến độ tổng</span>
                    <span>{obj.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${obj.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                <div className="space-y-2">
                  {obj.keyResults.map((kr) => (
                    <div key={kr.id} className="flex items-center gap-3">
                      {kr.progress >= 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-700 truncate">{kr.title}</span>
                          <span className="text-gray-500 ml-2">{kr.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${kr.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
