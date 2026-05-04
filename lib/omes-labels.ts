import { UserRole } from './omes-types';

export const OMES_ACTIVITY_MODULES = {
  requirement: 'Requirement',
  ticket: 'Ticket',
  milestone: 'Milestone',
  document: 'Tài liệu',
  member: 'Thành viên',
  dailyUpdate: 'Cập nhật hằng ngày',
} as const;

export const OMES_ACTIVITY_ACTIONS = {
  requirement: {
    create: 'Tạo requirement mới',
    update: 'Cập nhật requirement',
    delete: 'Xóa requirement',
  },
  ticket: {
    create: (code: string) => `Tạo ticket ${code}`,
    update: 'Cập nhật ticket',
    delete: 'Xóa ticket',
  },
  milestone: {
    create: 'Tạo milestone mới',
    update: 'Cập nhật milestone',
    delete: 'Xóa milestone',
  },
  document: {
    create: 'Thêm tài liệu mới',
    update: 'Cập nhật tài liệu',
    delete: 'Xóa tài liệu',
  },
  member: {
    create: 'Thêm thành viên',
    update: 'Cập nhật thành viên',
    delete: 'Xóa thành viên',
  },
  dailyUpdate: {
    update: 'Cập nhật tiến độ hàng ngày',
  },
} as const;

export const DETAIL_COPY = {
  retry: 'Thử lại',
  clearFilters: 'Xóa bộ lọc',
  backToProjects: 'Quay lại danh sách dự án',
  loadingProjectDetail: 'Đang tải chi tiết dự án...',
  projectNotFoundTitle: 'Không tìm thấy dự án',
  projectNotFoundDescription: 'Dự án không tồn tại hoặc bạn không còn quyền truy cập.',
  projectLoadErrorTitle: 'Không tải được dự án',
  filterEmptyTitle: 'Không có kết quả phù hợp',
  filterEmptyDescription: 'Thử thay đổi hoặc xóa bộ lọc để xem thêm dữ liệu.',
  costHiddenNotice: 'Chi phí nhân lực đang được ẩn theo vai trò hiện tại.',
} as const;

const COST_VISIBLE_ROLES: UserRole[] = ['admin', 'pmo', 'project_manager', 'tech_lead'];

export function canViewProjectCost(role: UserRole): boolean {
  return COST_VISIBLE_ROLES.includes(role);
}