import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface ForumTopic {
  id: number;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  lastActivity: string;
  status: 'active' | 'locked' | 'pinned';
}

interface Post {
  id: number;
  content: string;
  author: string;
  authorRole: string;
  timestamp: string;
  likes: number;
  status: 'approved' | 'pending' | 'flagged';
}

@Component({
  selector: 'app-admin-community',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-community.component.html',
  styleUrls: ['./admin-community.component.scss']
})
export class AdminCommunityComponent implements OnInit {
  // Community Stats
  communityStats = [
    { label: 'Total Topics', value: 156, icon: '💬', color: 'blue', change: '+12 this week' },
    { label: 'Total Posts', value: 1247, icon: '📝', color: 'violet', change: '+89 today' },
    { label: 'Active Users', value: 78, icon: '👥', color: 'emerald', change: '23 online now' },
    { label: 'Pending Review', value: 5, icon: '⏳', color: 'amber', change: '3 flagged' }
  ];

  // Forum Topics
  topics: ForumTopic[] = [
    { id: 1, title: 'Tips for managing medication schedules', author: 'CaregiverSarah', category: 'Caregiving Tips', replies: 23, views: 456, lastActivity: '10 min ago', status: 'pinned' },
    { id: 2, title: 'New research on cognitive exercises', author: 'DrJohnson', category: 'Medical News', replies: 15, views: 289, lastActivity: '1 hour ago', status: 'active' },
    { id: 3, title: 'Memory games that actually work', author: 'PatientAdvocate', category: 'Activities', replies: 34, views: 678, lastActivity: '2 hours ago', status: 'active' },
    { id: 4, title: 'Dealing with sundowning syndrome', author: 'WorriedSpouse', category: 'Support', replies: 45, views: 892, lastActivity: '3 hours ago', status: 'active' },
    { id: 5, title: 'Community guidelines update', author: 'Admin', category: 'Announcements', replies: 8, views: 1234, lastActivity: '1 day ago', status: 'pinned' }
  ];

  // Recent Posts
  recentPosts: Post[] = [
    { id: 1, content: 'Thank you all for the support during this difficult time...', author: 'NewCaregiver2024', authorRole: 'Family Member', timestamp: '5 min ago', likes: 12, status: 'approved' },
    { id: 2, content: 'Has anyone tried the new memory game feature?', author: 'GameLover', authorRole: 'Patient', timestamp: '15 min ago', likes: 5, status: 'approved' },
    { id: 3, content: 'SPAM: Buy cheap medications here!!!', author: 'SpamBot123', authorRole: 'New User', timestamp: '30 min ago', likes: 0, status: 'flagged' },
    { id: 4, content: 'Weekly check-in: How is everyone doing?', author: 'CommunityMod', authorRole: 'Moderator', timestamp: '1 hour ago', likes: 34, status: 'approved' }
  ];

  // Categories
  categories = [
    { id: 1, name: 'Caregiving Tips', topics: 45, icon: '🤝', color: 'emerald' },
    { id: 2, name: 'Medical News', topics: 23, icon: '🏥', color: 'blue' },
    { id: 3, name: 'Activities & Games', topics: 34, icon: '🎮', color: 'violet' },
    { id: 4, name: 'Support Group', topics: 38, icon: '💚', color: 'rose' },
    { id: 5, name: 'Announcements', topics: 16, icon: '📢', color: 'amber' }
  ];

  constructor() {}

  ngOnInit(): void {}

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      locked: 'bg-gray-100 text-gray-600',
      pinned: 'bg-amber-100 text-amber-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getPostStatusClass(status: string): string {
    const classes: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      flagged: 'bg-rose-100 text-rose-700'
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getCategoryClass(name: string): string {
    const classes: Record<string, string> = {
      'Caregiving Tips': 'bg-emerald-100 text-emerald-700',
      'Medical News': 'bg-blue-100 text-blue-700',
      'Activities': 'bg-violet-100 text-violet-700',
      'Support': 'bg-rose-100 text-rose-700',
      'Announcements': 'bg-amber-100 text-amber-700'
    };
    return classes[name] || 'bg-gray-100 text-gray-700';
  }
}
