export interface WorkOrderTask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface WorkOrderFilters {
  status?: string | string[];
  serviceType?: string;
  contractorId?: string;
  coordinatorId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MessageThread {
  id: string;
  title: string | null;
  isGeneral: boolean;
  workOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      role: string;
    };
  }[];
  messages: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }[];
  _count: {
    messages: number;
  };
  unreadCount?: number;
}

export interface DashboardStats {
  totalWorkOrders: number;
  activeWorkOrders: number;
  completedThisMonth: number;
  pendingInvoices: number;
  openTickets: number;
  totalRevenue: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
  badge?: number;
}
