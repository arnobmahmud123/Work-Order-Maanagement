import { create } from "zustand";

export interface NetworkPost {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    role: string;
    company: string | null;
  };
  workOrderId: string | null;
  workOrder?: {
    id: string;
    title: string;
    address: string;
    status: string;
    dueDate: string | null;
  } | null;
  location: string | null;
  city: string | null;
  state: string | null;
  tags: string[];
  isPinned: boolean;
  isUrgent: boolean;
  viewCount: number;
  attachments: any[];
  comments: any[];
  reactions: any[];
  jobRequest?: any;
  _count: { comments: number; reactions: number };
  createdAt: string;
  updatedAt: string;
}

interface NetworkState {
  // Feed
  posts: NetworkPost[];
  feedLoading: boolean;
  feedPage: number;
  feedTotal: number;
  feedFilters: {
    category: string;
    search: string;
    sort: string;
    tags: string[];
    lat: number | null;
    lng: number | null;
    radius: number | null;
  };

  // Jobs
  jobs: any[];
  jobsLoading: boolean;

  // Notifications
  notifications: any[];
  unreadCount: number;

  // UI State
  selectedPost: NetworkPost | null;
  showCreatePost: boolean;
  showJobRequest: boolean;
  activeTab: "feed" | "jobs" | "reputation";

  // Actions
  setPosts: (posts: NetworkPost[]) => void;
  addPost: (post: NetworkPost) => void;
  updatePost: (id: string, updates: Partial<NetworkPost>) => void;
  removePost: (id: string) => void;
  setFeedLoading: (loading: boolean) => void;
  setFeedFilters: (filters: Partial<NetworkState["feedFilters"]>) => void;
  setFeedPage: (page: number) => void;
  setFeedTotal: (total: number) => void;

  setJobs: (jobs: any[]) => void;
  setJobsLoading: (loading: boolean) => void;

  setNotifications: (notifications: any[]) => void;
  setUnreadCount: (count: number) => void;

  setSelectedPost: (post: NetworkPost | null) => void;
  setShowCreatePost: (show: boolean) => void;
  setShowJobRequest: (show: boolean) => void;
  setActiveTab: (tab: "feed" | "jobs" | "reputation") => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  // Feed
  posts: [],
  feedLoading: false,
  feedPage: 1,
  feedTotal: 0,
  feedFilters: {
    category: "ALL",
    search: "",
    sort: "newest",
    tags: [],
    lat: null,
    lng: null,
    radius: null,
  },

  // Jobs
  jobs: [],
  jobsLoading: false,

  // Notifications
  notifications: [],
  unreadCount: 0,

  // UI State
  selectedPost: null,
  showCreatePost: false,
  showJobRequest: false,
  activeTab: "feed",

  // Actions
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removePost: (id) => set((state) => ({ posts: state.posts.filter((p) => p.id !== id) })),
  setFeedLoading: (loading) => set({ feedLoading: loading }),
  setFeedFilters: (filters) =>
    set((state) => ({ feedFilters: { ...state.feedFilters, ...filters } })),
  setFeedPage: (page) => set({ feedPage: page }),
  setFeedTotal: (total) => set({ feedTotal: total }),

  setJobs: (jobs) => set({ jobs }),
  setJobsLoading: (loading) => set({ jobsLoading: loading }),

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  setSelectedPost: (post) => set({ selectedPost: post }),
  setShowCreatePost: (show) => set({ showCreatePost: show }),
  setShowJobRequest: (show) => set({ showJobRequest: show }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
