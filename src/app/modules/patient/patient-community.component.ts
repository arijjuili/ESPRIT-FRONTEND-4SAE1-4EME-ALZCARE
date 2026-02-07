import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-community',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">👥 Community</h1>
      <p class="text-gray-600 mb-8">Connect, share, and support one another</p>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Feed -->
        <div class="lg:col-span-2">
          <!-- Post Input -->
          <div class="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div class="flex gap-4">
              <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-lg">👤</div>
              <div class="flex-1">
                <input type="text" placeholder="Share your thoughts..." class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <div class="flex gap-2 mt-3">
                  <button class="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition font-semibold">
                    Share
                  </button>
                  <button class="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    📎
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Posts Feed -->
          <div class="space-y-6">
            <div *ngFor="let post of posts" class="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition">
              <div class="flex items-start justify-between mb-4">
                <div class="flex gap-4 flex-1">
                  <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">{{ post.avatar }}</div>
                  <div>
                    <p class="font-bold text-gray-900">{{ post.author }}</p>
                    <p class="text-gray-500 text-sm">{{ post.time }}</p>
                  </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600">⋯</button>
              </div>

              <p class="text-gray-800 mb-4">{{ post.content }}</p>

              <div class="flex gap-4 text-gray-600 text-sm">
                <button class="flex items-center gap-2 hover:text-primary-600 transition">❤️ {{ post.likes }}</button>
                <button class="flex items-center gap-2 hover:text-primary-600 transition">💬 {{ post.comments }}</button>
                <button class="flex items-center gap-2 hover:text-primary-600 transition">↗️ Share</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Support Groups -->
          <div class="bg-white rounded-2xl shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">🤝 Support Groups</h3>
            <div class="space-y-3">
              <div class="p-3 bg-primary-50 rounded-lg border border-primary-200 hover:bg-primary-100 transition cursor-pointer">
                <p class="font-semibold text-gray-900 text-sm">Caregivers Circle</p>
                <p class="text-gray-600 text-xs mt-1">2.4K members</p>
              </div>
              <div class="p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition cursor-pointer">
                <p class="font-semibold text-gray-900 text-sm">Wellness Buddies</p>
                <p class="text-gray-600 text-xs mt-1">1.8K members</p>
              </div>
              <div class="p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition cursor-pointer">
                <p class="font-semibold text-gray-900 text-sm">Brain Games Masters</p>
                <p class="text-gray-600 text-xs mt-1">3.2K members</p>
              </div>
            </div>
          </div>

          <!-- Trending Topics -->
          <div class="bg-white rounded-2xl shadow-md p-6">
            <h3 class="text-lg font-bold text-gray-900 mb-4">🔥 Trending</h3>
            <div class="space-y-3 text-sm">
              <div class="hover:bg-gray-50 p-2 rounded cursor-pointer">
                <p class="font-semibold text-gray-900">#MindfulnessMonday</p>
                <p class="text-gray-500">3.2K posts</p>
              </div>
              <div class="hover:bg-gray-50 p-2 rounded cursor-pointer">
                <p class="font-semibold text-gray-900">#HealthyHabits</p>
                <p class="text-gray-500">2.8K posts</p>
              </div>
              <div class="hover:bg-gray-50 p-2 rounded cursor-pointer">
                <p class="font-semibold text-gray-900">#CommunityLove</p>
                <p class="text-gray-500">2.1K posts</p>
              </div>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl shadow-md p-6 border border-primary-200">
            <h3 class="text-lg font-bold text-primary-900 mb-3">💬 Community Guidelines</h3>
            <ul class="space-y-2 text-sm text-primary-800">
              <li>✓ Be respectful</li>
              <li>✓ Share experiences</li>
              <li>✓ Support each other</li>
              <li>✓ No medical advice</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PatientCommunityComponent {
  posts = [
    {
      author: 'Margaret Wilson',
      avatar: '👩‍🦱',
      time: '2 hours ago',
      content: 'Just completed my morning walk! Feeling great today. Who else is staying active? 🏃‍♀️',
      likes: 34,
      comments: 8
    },
    {
      author: 'James Cohen',
      avatar: '👨‍🦳',
      time: '4 hours ago',
      content: 'The memory games really help. I\'ve been playing for a week now and noticed improvement. Highly recommend!',
      likes: 128,
      comments: 22
    },
    {
      author: 'Sarah Martinez',
      avatar: '👩‍🦱',
      time: '6 hours ago',
      content: 'Reminder: don\'t forget to take your medications on time. Set a reminder on your phone! 💊',
      likes: 67,
      comments: 15
    }
  ];
}
